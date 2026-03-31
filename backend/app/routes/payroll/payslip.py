"""Payslip printable HTML endpoint — individual or bulk."""
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.payroll.payroll_run import PayrollRun
from app.models.payroll.payroll_item import PayrollItem
from app.models.payroll.payroll_item_line import PayrollItemLine
from app.utils.dependencies import get_current_user

router = APIRouter()

MONTH_NAMES = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]


def _fmt(v) -> str:
    return f"₦{Decimal(str(v)):,.2f}"


def _payslip_html(item: PayrollItem, run: PayrollRun, company_name: str = "—") -> str:
    emp = item.employee
    emp_name = emp.name if emp else "Employee"
    emp_ref = emp.employee_ref if emp else "—"
    period = f"{MONTH_NAMES[run.month - 1]} {run.year}"

    allowances = [l for l in (item.lines or []) if l.line_type == "ALLOWANCE"]
    deductions = [l for l in (item.lines or []) if l.line_type == "DEDUCTION"]

    alloc_rows = ""
    for a in allowances:
        alloc_rows += f'<tr><td>{a.name}</td><td class="right">{_fmt(a.amount)}</td></tr>'
    if not allowances:
        alloc_rows = '<tr><td colspan="2" class="muted">No allowances</td></tr>'

    ded_rows = ""
    for d in deductions:
        ded_rows += f'<tr><td>{d.name}</td><td class="right red">{_fmt(d.amount)}</td></tr>'

    from html import escape
    safe_company = escape(company_name)
    return f"""
    <div class="payslip">
      <div class="header">
        <div>
          <h2>{safe_company}</h2>
          <p class="sub">Payslip — {period}</p>
        </div>
        <div class="right-header">
          <p><strong>{emp_name}</strong></p>
          <p>Ref: {emp_ref}</p>
        </div>
      </div>

      <div class="columns">
        <div class="col">
          <h3>Earnings</h3>
          <table>
            <tr><td>Basic Salary</td><td class="right">{_fmt(item.basic_salary)}</td></tr>
            {alloc_rows}
            <tr class="total"><td>Gross Pay</td><td class="right">{_fmt(item.gross_pay)}</td></tr>
          </table>
        </div>
        <div class="col">
          <h3>Deductions</h3>
          <table>
            {ded_rows}
            <tr class="total"><td>Total Deductions</td><td class="right red">{_fmt(item.total_deductions)}</td></tr>
          </table>
        </div>
      </div>

      <div class="net-pay">
        <span>NET PAY</span>
        <span class="amount">{_fmt(item.net_pay)}</span>
      </div>

      <div class="details">
        <table>
          <tr><td>CRA (monthly)</td><td class="right">{_fmt(item.cra)}</td></tr>
          <tr><td>Taxable Income (annual)</td><td class="right">{_fmt(item.taxable_income_annual)}</td></tr>
          <tr><td>Pension — Employer Contribution</td><td class="right">{_fmt(item.pension_employer)}</td></tr>
        </table>
      </div>

      <div class="footer-note">
        This is a computer-generated payslip. No signature required.
      </div>
    </div>
    """


def _wrap_payslips(payslips_html: str, title: str) -> str:
    return f"""<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Mulish', sans-serif; font-size: 11px; color: #344767; }}
  .payslip {{ page-break-after: always; padding: 32px; max-width: 700px; margin: 0 auto; }}
  .payslip:last-child {{ page-break-after: auto; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1B2A4A; padding-bottom: 12px; margin-bottom: 16px; }}
  .header h2 {{ font-size: 16px; color: #1B2A4A; }}
  .header .sub {{ font-size: 11px; color: #5a6580; }}
  .right-header {{ text-align: right; }}
  .right-header p {{ font-size: 11px; }}
  .columns {{ display: flex; gap: 24px; margin-bottom: 16px; }}
  .col {{ flex: 1; }}
  h3 {{ font-size: 11px; color: #1B2A4A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e9ecef; }}
  table {{ width: 100%; border-collapse: collapse; }}
  td {{ padding: 4px 8px; border-bottom: 1px solid #f0f2f5; font-size: 10px; }}
  td.right {{ text-align: right; }}
  td.red {{ color: #ea0606; }}
  td.muted {{ color: #6e7a93; font-style: italic; }}
  tr.total td {{ font-weight: 800; border-top: 2px solid #1B2A4A; border-bottom: none; font-size: 11px; }}
  .net-pay {{ background: #1B2A4A; color: #fff; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }}
  .net-pay span {{ font-size: 12px; font-weight: 700; }}
  .net-pay .amount {{ font-size: 18px; font-weight: 900; }}
  .details {{ margin-bottom: 16px; }}
  .details table td {{ color: #5a6580; font-size: 9px; }}
  .footer-note {{ text-align: center; font-size: 9px; color: #6e7a93; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e9ecef; }}
  @media print {{ body {{ margin: 0; }} .payslip {{ padding: 16px; }} }}
</style>
</head><body>
{payslips_html}
</body></html>"""


@router.get("/runs/{run_id}/payslip/{employee_id}", response_class=HTMLResponse)
async def get_payslip(
    run_id: UUID,
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Single employee payslip."""
    result = await db.execute(
        select(PayrollItem)
        .where(
            PayrollItem.payroll_run_id == run_id,
            PayrollItem.employee_id == employee_id,
            PayrollItem.company_id == current_user.company_id,
        )
        .options(
            selectinload(PayrollItem.employee),
            selectinload(PayrollItem.lines),
            selectinload(PayrollItem.run),
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Payslip not found")

    company = (await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )).scalar_one_or_none()
    company_name = company.name if company else "—"
    html = _payslip_html(item, item.run, company_name)
    return _wrap_payslips(html, f"Payslip — {item.employee.name if item.employee else 'Employee'}")


@router.get("/runs/{run_id}/payslips", response_class=HTMLResponse)
async def get_all_payslips(
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk payslips — all employees in a payroll run, one per page."""
    run_result = await db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.company_id == current_user.company_id,
        )
    )
    run = run_result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    items_result = await db.execute(
        select(PayrollItem)
        .where(PayrollItem.payroll_run_id == run_id)
        .options(
            selectinload(PayrollItem.employee),
            selectinload(PayrollItem.lines),
        )
    )
    items = list(items_result.scalars().all())
    if not items:
        raise HTTPException(status_code=404, detail="No payroll items found for this run")

    company = (await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )).scalar_one_or_none()
    company_name = company.name if company else "—"
    html = "".join(_payslip_html(item, run, company_name) for item in items)
    period = f"{MONTH_NAMES[run.month - 1]} {run.year}"
    return _wrap_payslips(html, f"Payslips — {period}")
