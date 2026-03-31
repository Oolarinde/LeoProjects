"""Auto-post payroll journal to expense_transactions on approval.

For GROUP payroll: splits salary costs across subsidiaries using
employee_cost_allocations. Each subsidiary gets an expense entry
proportional to its allocation percentage.

For SINGLE-COMPANY payroll: posts one expense to the company.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date as DateType
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.employee_cost_allocation import EmployeeCostAllocation
from app.models.expense_transaction import ExpenseTransaction
from app.models.payroll.payroll_item import PayrollItem
from app.models.payroll.payroll_run import PayrollRun

MONTH_LAST_DAY = {
    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
}


def _posting_date(year: int, month: int) -> DateType:
    """Last day of the payroll month."""
    day = MONTH_LAST_DAY.get(month, 28)
    if month == 2 and (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)):
        day = 29
    return DateType(year, month, day)


async def _get_salary_account(db: AsyncSession, company_id: UUID) -> Account | None:
    """Find salary account (5010) in a company's chart of accounts."""
    result = await db.execute(
        select(Account).where(
            Account.company_id == company_id,
            Account.code == "5010",
        )
    )
    return result.scalar_one_or_none()


async def post_payroll_to_gl(
    db: AsyncSession,
    company_id: UUID,
    run: PayrollRun,
    user_id: UUID,
) -> None:
    """Post payroll salary costs to subsidiary expense accounts.

    For each payroll item (employee), looks up cost allocations and splits
    the gross salary across the allocated subsidiaries. If no allocations
    exist, posts 100% to the employee's home company.

    Creates one expense_transaction per subsidiary, aggregating all
    employee costs allocated to that subsidiary.
    """
    ref_no = f"PAYROLL-{run.year}-{run.month:02d}"
    posting_date = _posting_date(run.year, run.month)

    # Check if already posted (idempotent)
    existing = await db.execute(
        select(ExpenseTransaction).where(
            ExpenseTransaction.reference_no == ref_no,
            ExpenseTransaction.category == "Salaries",
            ExpenseTransaction.is_voided == False,
        )
    )
    if existing.first():
        return  # Already posted

    # Load all payroll items for this run
    items_result = await db.execute(
        select(PayrollItem).where(PayrollItem.payroll_run_id == run.id)
    )
    items = items_result.scalars().all()
    if not items:
        return

    # Load all cost allocations for employees in this run
    employee_ids = [item.employee_id for item in items]
    allocs_result = await db.execute(
        select(EmployeeCostAllocation).where(
            EmployeeCostAllocation.employee_id.in_(employee_ids)
        )
    )
    allocs = allocs_result.scalars().all()

    # Build allocation map: employee_id -> [(company_id, percentage)]
    alloc_map: dict[UUID, list[tuple[UUID, Decimal]]] = defaultdict(list)
    for a in allocs:
        alloc_map[a.employee_id].append((a.company_id, Decimal(str(a.percentage))))

    # Aggregate cost per subsidiary
    # subsidiary_cost[company_id] = total salary cost allocated to that subsidiary
    subsidiary_cost: dict[UUID, Decimal] = defaultdict(Decimal)
    subsidiary_employees: dict[UUID, int] = defaultdict(int)

    for item in items:
        gross = Decimal(str(item.gross_pay))
        if gross <= 0:
            continue

        employee_allocs = alloc_map.get(item.employee_id)

        if not employee_allocs:
            # No allocations — 100% to the employee's home company
            subsidiary_cost[item.company_id] += gross
            subsidiary_employees[item.company_id] += 1
        else:
            # Split across allocated subsidiaries
            remaining = gross
            for i, (sub_company_id, pct) in enumerate(employee_allocs):
                if i < len(employee_allocs) - 1:
                    share = (gross * pct / Decimal("100")).quantize(Decimal("0.01"))
                else:
                    share = remaining  # last one gets remainder (rounding fix)
                remaining -= share
                subsidiary_cost[sub_company_id] += share
                subsidiary_employees[sub_company_id] += 1

    # Post one expense transaction per subsidiary
    for sub_company_id, total_cost in subsidiary_cost.items():
        if total_cost <= 0:
            continue

        salary_account = await _get_salary_account(db, sub_company_id)
        if salary_account is None:
            # Try to create the account if it doesn't exist
            continue

        emp_count = subsidiary_employees.get(sub_company_id, 0)
        txn = ExpenseTransaction(
            id=uuid.uuid4(),
            company_id=sub_company_id,
            account_id=salary_account.id,
            category="Salaries",
            date=posting_date,
            fiscal_year=run.year,
            amount=total_cost,
            payment_method="Bank Transfer",
            reference_no=ref_no,
            description=f"Payroll — {emp_count} staff, {run.year}/{run.month:02d}",
            vendor_name="Payroll",
            created_by=user_id,
        )
        db.add(txn)

    await db.flush()
