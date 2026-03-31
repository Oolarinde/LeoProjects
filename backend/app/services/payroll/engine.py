from __future__ import annotations
"""Nigerian PAYE payroll calculation engine.

Implements:
  - Consolidated Relief Allowance (CRA) per Finance Act 2020
  - Progressive PAYE tax brackets
  - Pension (employee + employer), NHF, NSITF
  - Per-employee allowances and non-statutory deductions

Monthly flow:
  1. Gross Pay = Basic Salary + Sum(active allowances)
  2. Gross Annual = Gross Pay × 12
  3. CRA = MAX(₦200,000, 1% of Gross Annual) + 20% of Gross Annual
  4. Pension Employee (annual) = Basic Salary × 12 × pension_employee_pct%
  5. NHF (annual) = Basic Salary × 12 × nhf_pct%
  6. Taxable Income = MAX(0, Gross Annual − CRA − Pension_EE − NHF)
  7. PAYE Tax (annual) = apply progressive brackets to Taxable Income
  8. Monthly PAYE = Annual PAYE / 12
  9. Monthly Pension_EE = Pension_EE_annual / 12
  10. Monthly Pension_ER = basic × pension_employer_pct%
  11. Monthly NHF = basic × nhf_pct%
  12. Monthly NSITF = basic × nsitf_employee_pct%
  13. Other Deductions = Sum of non-statutory deductions (FIXED or %-based)
  14. Total Deductions = PAYE + Pension_EE + NHF + NSITF + Other
  15. Net Pay = Gross Pay − Total Deductions
"""
from datetime import date as DateType
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app.models.payroll.settings import PayrollSettings
from app.models.payroll.tax_bracket import TaxBracket
from app.models.payroll.employee_payroll_profile import EmployeePayrollProfile
from app.models.payroll.employee_allowance import EmployeeAllowance
from app.models.payroll.employee_deduction import EmployeeDeduction
from app.models.payroll.allowance_type import AllowanceType
from app.models.payroll.deduction_type import DeductionType
from app.models.payroll.payroll_run import PayrollRun
from app.models.payroll.payroll_item import PayrollItem
from app.models.payroll.payroll_item_line import PayrollItemLine

ZERO = Decimal(0)
TWO = Decimal("0.01")
CRA_MINIMUM = Decimal("200000")  # ₦200,000 annual
MINIMUM_WAGE_ANNUAL = Decimal("360000")  # ₦30,000/month × 12
# Allowance codes that form part of the pension base per Pension Reform Act 2014
PENSION_BASE_CODES = {"HSG", "TRN"}  # Housing, Transport


def _round(v: Decimal) -> Decimal:
    return v.quantize(TWO, rounding=ROUND_HALF_UP)


def _pct(base: Decimal, pct: Decimal) -> Decimal:
    return _round(base * pct / Decimal(100))


def _calc_paye_annual(taxable_income: Decimal, brackets: list[TaxBracket]) -> Decimal:
    """Apply Nigerian progressive tax brackets to annual taxable income."""
    if taxable_income <= 0:
        return ZERO
    tax = ZERO
    remaining = taxable_income
    for bracket in sorted(brackets, key=lambda b: b.sort_order):
        lower = Decimal(str(bracket.lower_bound))
        upper = Decimal(str(bracket.upper_bound)) if bracket.upper_bound else None
        rate = Decimal(str(bracket.rate_pct)) / Decimal(100)

        if upper is not None:
            band_width = upper - lower
        else:
            band_width = remaining  # last bracket — no ceiling

        taxable_in_band = min(remaining, band_width)
        if taxable_in_band <= 0:
            break
        tax += _round(taxable_in_band * rate)
        remaining -= taxable_in_band
        if remaining <= 0:
            break
    return tax


def calculate_payroll(
    db: Session,
    company_id: UUID,
    run: PayrollRun,
    employee_company_ids: list[UUID] | None = None,
) -> PayrollRun:
    """
    Calculate payroll for all active employees with payroll profiles.
    Populates payroll_items and payroll_item_lines on the run.

    Args:
        company_id: The parent company ID (used for settings and tax brackets).
        run: The PayrollRun to populate.
        employee_company_ids: If provided, load employees from these companies
            instead of just company_id. Used for group payroll.
    """
    # Load settings from the parent company
    settings_result = db.execute(
        select(PayrollSettings).where(PayrollSettings.company_id == company_id)
    )
    settings = settings_result.scalar_one_or_none()
    if settings is None:
        raise ValueError("Payroll settings not configured for this company")

    pension_ee_pct = Decimal(str(settings.pension_employee_pct))
    pension_er_pct = Decimal(str(settings.pension_employer_pct))
    nhf_pct = Decimal(str(settings.nhf_pct))
    nsitf_pct = Decimal(str(settings.nsitf_employee_pct))

    # Load tax brackets from the parent company
    brackets_result = db.execute(
        select(TaxBracket)
        .where(TaxBracket.company_id == company_id)
        .order_by(TaxBracket.sort_order)
    )
    brackets = list(brackets_result.scalars().all())
    if not brackets:
        raise ValueError("No tax brackets configured — set up PAYE brackets in Payroll Setup")

    # Load active employee profiles — across group companies if provided
    profile_cids = employee_company_ids if employee_company_ids else [company_id]
    profiles_result = db.execute(
        select(EmployeePayrollProfile)
        .where(
            EmployeePayrollProfile.company_id.in_(profile_cids),
            EmployeePayrollProfile.is_active == True,
        )
        .options(
            selectinload(EmployeePayrollProfile.allowances).selectinload(EmployeeAllowance.allowance_type),
            selectinload(EmployeePayrollProfile.deductions).selectinload(EmployeeDeduction.deduction_type),
        )
    )
    profiles = list(profiles_result.scalars().all())

    if not profiles:
        raise ValueError("No active payroll profiles found — add employee profiles first")

    # Delete existing items for this run (recalculate)
    db.execute(
        delete(PayrollItem).where(PayrollItem.payroll_run_id == run.id)
    )
    db.flush()

    # Accumulators for run totals
    run_gross = ZERO
    run_net = ZERO
    run_paye = ZERO
    run_pension_ee = ZERO
    run_pension_er = ZERO
    run_total_ded = ZERO

    for profile in profiles:
        basic = Decimal(str(profile.basic_salary))

        # ── Allowances ──────────────────────────────────────────────────
        allowance_lines: list[PayrollItemLine] = []
        total_allowances = ZERO
        pension_base_allowances = ZERO  # Housing + Transport for pension base
        for ea in (profile.allowances or []):
            if not ea.is_active:
                continue
            amt = Decimal(str(ea.amount))
            total_allowances += amt
            atype = ea.allowance_type
            code = atype.code if atype else "UNK"
            # Track allowances that form part of the pension base
            if code in PENSION_BASE_CODES:
                pension_base_allowances += amt
            allowance_lines.append(PayrollItemLine(
                line_type="ALLOWANCE",
                type_code=code,
                name=atype.name if atype else "Unknown",
                amount=amt,
            ))

        gross_monthly = basic + total_allowances
        gross_annual = gross_monthly * 12

        # ── CRA (Consolidated Relief Allowance) ─────────────────────────
        # CRA = MAX(₦200,000, 1% of Gross Annual) + 20% of Gross Annual
        cra_fixed = max(CRA_MINIMUM, _pct(gross_annual, Decimal(1)))
        cra = _round(cra_fixed + _pct(gross_annual, Decimal(20)))

        # ── Pension base = Basic + Housing + Transport (Pension Reform Act 2014)
        pension_base_monthly = basic + pension_base_allowances
        pension_ee_annual = _pct(pension_base_monthly * 12, pension_ee_pct)
        pension_ee_monthly = _round(pension_ee_annual / 12)

        # ── NHF (annual, based on basic salary only) ─────────────────────
        nhf_annual = _pct(basic * 12, nhf_pct)
        nhf_monthly = _round(nhf_annual / 12)

        # ── Taxable Income ───────────────────────────────────────────────
        taxable_annual = max(ZERO, gross_annual - cra - pension_ee_annual - nhf_annual)

        # ── PAYE Tax ─────────────────────────────────────────────────────
        paye_annual = _calc_paye_annual(taxable_annual, brackets)

        # Minimum tax check: 1% of gross income if PAYE < minimum tax
        # Exception: does not apply if gross income ≤ national minimum wage
        if gross_annual > MINIMUM_WAGE_ANNUAL:
            minimum_tax = _pct(gross_annual, Decimal(1))
            paye_annual = max(paye_annual, minimum_tax)

        paye_monthly = _round(paye_annual / 12)

        # ── Pension Employer (monthly, same base as employee) ────────────
        pension_er_monthly = _pct(pension_base_monthly, pension_er_pct)

        # ── NSITF (monthly) ──────────────────────────────────────────────
        nsitf_monthly = _pct(basic, nsitf_pct)

        # ── Other Deductions (non-statutory) ─────────────────────────────
        deduction_lines: list[PayrollItemLine] = []
        other_ded = ZERO
        for ed in (profile.deductions or []):
            if not ed.is_active:
                continue
            dtype = ed.deduction_type
            if dtype is None or not dtype.is_active:
                continue
            # Skip statutory deductions — handled above
            if dtype.is_statutory:
                continue

            method = dtype.calculation_method
            override = Decimal(str(ed.override_value)) if ed.override_value is not None else None
            default = Decimal(str(dtype.default_value)) if dtype.default_value is not None else ZERO

            if method == "FIXED":
                amt = override if override is not None else default
            elif method == "PERCENTAGE_BASIC":
                pct_val = override if override is not None else default
                amt = _pct(basic, pct_val)
            elif method == "PERCENTAGE_GROSS":
                pct_val = override if override is not None else default
                amt = _pct(gross_monthly, pct_val)
            else:
                # MANUAL or unknown — use override or 0
                amt = override if override is not None else ZERO

            other_ded += amt
            deduction_lines.append(PayrollItemLine(
                line_type="DEDUCTION",
                type_code=dtype.code,
                name=dtype.name,
                amount=amt,
            ))

        # ── Totals ───────────────────────────────────────────────────────
        total_deductions = paye_monthly + pension_ee_monthly + nhf_monthly + nsitf_monthly + other_ded
        net_pay = gross_monthly - total_deductions

        # ── Create PayrollItem ───────────────────────────────────────────
        item = PayrollItem(
            payroll_run_id=run.id,
            employee_id=profile.employee_id,
            company_id=profile.company_id,  # employee's own company (group-aware)
            basic_salary=basic,
            total_allowances=total_allowances,
            gross_pay=gross_monthly,
            cra=_round(cra / 12),  # store monthly CRA
            taxable_income_annual=taxable_annual,
            paye_tax=paye_monthly,
            pension_employee=pension_ee_monthly,
            pension_employer=pension_er_monthly,
            nhf=nhf_monthly,
            nsitf=nsitf_monthly,
            other_deductions=other_ded,
            total_deductions=total_deductions,
            net_pay=net_pay,
        )

        # Attach breakdown lines
        item.lines = allowance_lines + deduction_lines

        # Add statutory deduction lines for visibility
        item.lines.extend([
            PayrollItemLine(line_type="DEDUCTION", type_code="PAYE", name="PAYE Tax", amount=paye_monthly),
            PayrollItemLine(line_type="DEDUCTION", type_code="PEN_EE", name="Pension (Employee)", amount=pension_ee_monthly),
            PayrollItemLine(line_type="DEDUCTION", type_code="PEN_ER", name="Pension (Employer)", amount=pension_er_monthly),
            PayrollItemLine(line_type="DEDUCTION", type_code="NHF", name="NHF", amount=nhf_monthly),
            PayrollItemLine(line_type="DEDUCTION", type_code="NSITF", name="NSITF", amount=nsitf_monthly),
        ])

        db.add(item)

        # Accumulate totals
        run_gross += gross_monthly
        run_net += net_pay
        run_paye += paye_monthly
        run_pension_ee += pension_ee_monthly
        run_pension_er += pension_er_monthly
        run_total_ded += total_deductions

    # Update run totals
    run.employee_count = len(profiles)
    run.total_gross = run_gross
    run.total_net = run_net
    run.total_paye = run_paye
    run.total_pension_ee = run_pension_ee
    run.total_pension_er = run_pension_er
    run.total_deductions = run_total_ded
    run.status = "CALCULATED"
    run.run_date = DateType.today()

    db.flush()
    return run
