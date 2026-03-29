---
name: build-report
description: 'Generates a complete financial report for Talents Apartments AIS — FastAPI endpoint, SQL aggregation query, and React page. Use when the user says "build report", "generate report", "create the P&L", "add cash flow page", or "/build-report [name]". Reports: pnl, cashflow, balance-sheet, trial-balance, general-ledger, dashboard, budget.'
argument-hint: 'Report name: pnl | cashflow | balance-sheet | trial-balance | general-ledger | dashboard | budget'
disable-model-invocation: true
---

# Build Report

Generates a financial report end-to-end: SQL aggregation → FastAPI route → React page.

## Before Starting

1. Read `CLAUDE.md` — Domain Modules table and Report Engine Pattern section
2. Read `Sample/TALENTS_AIS_FIXED.xlsx` analysis notes in CLAUDE.md Known Business Logic section
3. Check `backend/app/routes/reports.py` — add to existing file rather than creating new ones

## Report Specifications

Every report endpoint must follow this signature:
```python
@router.get("/<report-name>")
async def get_<report>(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

### P&L (`/api/reports/pnl`)
SQL pattern — replicate Excel `Profit_Loss` sheet:
- Revenue lines: `SELECT account, SUM(amount) FROM revenue_transactions WHERE company_id=? AND EXTRACT(YEAR FROM date)=? [AND location_id=?] GROUP BY account`
- Expense lines: `SELECT category, SUM(amount) FROM expense_transactions WHERE ...`
- Staff Salaries: `SELECT SUM(total_paid) FROM payroll_records WHERE company_id=? AND year=?`
- Budget column: from `budget_lines` table
- Response: `{ revenue: {line: amount}, total_revenue, expenses: {line: amount}, total_expenses, net_profit, budget_revenue, budget_expenses }`

### Cash Flow (`/api/reports/cashflow`)
Three sections — Operating, Investing, Financing:
- Operating: total revenue − total expenses − staff salaries
- Investing: Construction expense category (negative)
- Financing: Loans & Advances expense category (negative)
- Response: `{ operating: {revenue, expenses, salaries, net}, investing: {capex}, financing: {loan_repayments}, net_change }`

### Balance Sheet (`/api/reports/balance-sheet`)
- Cash & Bank = net cash change from Cash Flow
- Retained Earnings = net profit from P&L
- Caution Deposits Payable = SUM of Caution Fee Income revenue (liability — refundable)
- Loans Payable = SUM of Loans & Advances expenses
- Response: `{ assets: {...}, liabilities: {...}, equity: {...}, check: assets - liabilities - equity }` (check should = 0)

### Trial Balance (`/api/reports/trial-balance`)
The General Ledger is a union view over transactions — not a separate table. Query it as:
```sql
SELECT account_code, account_name,
  SUM(CASE WHEN txn_type = 'revenue' THEN amount ELSE 0 END) AS credit,
  SUM(CASE WHEN txn_type = 'expense' THEN amount ELSE 0 END) AS debit
FROM (
  SELECT account_id AS account_code, account_name, amount, 'revenue' AS txn_type FROM revenue_transactions WHERE ...
  UNION ALL
  SELECT acct_code, category, amount, 'expense' AS txn_type FROM expense_transactions WHERE ...
) AS ledger
GROUP BY account_code, account_name
```
- Totals row: SUM debits, SUM credits, diff (should = 0)

### General Ledger (`/api/reports/general-ledger`)
- Paginated: `page` (default 1), `page_size` (default 50) query params
- Union of revenue + expense transactions ordered by `date ASC`
- Running balance: use SQL window function `SUM(debit - credit) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)`
- Also return `total_count` for frontend pagination controls

### Dashboard (`/api/dashboard/summary` + `/api/dashboard/monthly`)
- Summary: total_revenue, total_expenses, net_profit, staff_salaries, profit_margin
- Monthly: array of 12 months, each with revenue_by_category and expenses_by_category
- Both endpoints accept `year` + `location_id`

### Budget (`/api/budget`)
- GET: returns all budget_lines for a year, grouped by category and month
- PUT: upserts a single budget_line `{ year, month, category, line_type, budget_amount }`

## React Page Pattern

Each report page:
1. Reads `{ year, location }` from Zustand store
2. Calls the API on mount and whenever year/location changes
3. Displays as a styled MUI Table matching the Excel layout
4. Shows `₦` prefix with `toLocaleString()` comma formatting
5. Includes a "Export PDF" button that calls `/api/export/<report-name>?year=&location_id=`
6. Use `<Skeleton variant="rectangular" />` (MUI) while fetching; `<Alert severity="error">` if API fails
7. If API returns all zeros or empty data, show `<Alert severity="info">No data for {year} {location}</Alert>` — never render a blank table

## PDF Export

Add a corresponding export endpoint using WeasyPrint. Create the Jinja2 template first:
1. Create `backend/app/templates/<report-name>.html` — styled HTML table matching the MUI layout, with `₦` formatting
2. Then add the endpoint:
```python
from jinja2 import Environment, FileSystemLoader
import weasyprint

templates_env = Environment(loader=FileSystemLoader("app/templates"))

@router.get("/export/<report-name>")
async def export_<report>_pdf(year: int, location_id: Optional[UUID] = None, ...):
    data = await get_<report>(year, location_id, db, current_user)
    template = templates_env.get_template("<report-name>.html")
    html = template.render(data=data, year=year)
    return Response(weasyprint.HTML(string=html).write_pdf(), media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={report-name}-{year}.pdf"})
```

## Tests

3 required tests per report endpoint:
1. Happy path — valid year returns correct structure
2. Unauthorized — missing token returns 401
3. Invalid input — non-numeric year returns 422
