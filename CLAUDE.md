# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Stacks on top of `LeoProjects/CLAUDE.md` (workspace rules) and `~/.claude/CLAUDE.md` (universal rules).

---

## Project

Full-stack web Accounting Information System for **Talents Apartments** — a multi-location Nigerian student accommodation business in Ibadan, Nigeria (locations: Agbowo, UI). Replaces `Sample/TALENTS_AIS_FIXED.xlsx`, which is the authoritative source of business requirements and seed data.

---

## Commands

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000

alembic upgrade head
alembic revision --autogenerate -m "description"

pytest
pytest tests/test_revenue.py::test_create_revenue   # single test

ruff check . && black --check .
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # :5173
npm run build
npm run test       # Vitest
npm run lint
```

### Docker
```bash
docker-compose up -d
docker-compose logs -f api
docker-compose exec db psql -U postgres talents_ais
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async), Alembic |
| Frontend | React (TypeScript), Vite, Material-UI v5 |
| Database | PostgreSQL 15 via Docker |
| Auth | JWT Bearer tokens, httpOnly cookies for refresh, bcrypt, roles: OWNER / ADMIN / VIEWER |
| Charts | Recharts |
| PDF Export | WeasyPrint (Python) |
| Notifications | Africa's Talking API (SMS/WhatsApp — Nigerian telecom) |

Do not introduce new frameworks or dependencies without asking.

---

## Architecture

### WAT Framework
Automation, data operations, and scripted tasks (Excel import, PDF export, rent reminders) use the WAT pattern:
- `workflows/` — Markdown SOPs defining inputs, steps, outputs, and edge cases
- `tools/` — Python scripts for deterministic execution (Excel import, DB seed, API calls)
- `.tmp/` — Temporary files; regenerated as needed, never committed

Before writing any new script, check `tools/` first. If a fix involves paid API calls (Africa's Talking), confirm with the user before rerunning. Do not create or overwrite `workflows/` files without asking.

### Global Filter Context
Every financial query is scoped by `year` (INT) and optionally `location_id` (UUID) — mirroring the Excel's year selector (`Dashboard!$B$1`) and location filter (`C5`). The React global store holds `{ year, location }` passed as query params to every report endpoint.

```python
@router.get("/summary")
async def get_summary(
    year: int = Query(...),
    location_id: Optional[UUID] = Query(None),  # None = all locations
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

### Multi-Tenancy
All financial tables include `company_id UUID`. Every query must filter by `current_user.company_id`. Never query financial tables without this filter. `get_current_user` must be used on all protected routes.

### Report Engine
Computed reports (P&L, Cash Flow, Balance Sheet, Trial Balance, Dashboard) are pure SQL aggregations — no business logic in Python. Use `EXTRACT(YEAR FROM date)` for year filtering. These map directly to the Excel SUMPRODUCT formulas.

### Build Order
For any new feature: models → schemas → routes → services (backend), then API service → state → UI component (frontend).

### Design Tokens
```
#1B2A4A  — navy       headers, sidebar, title text
#E85D5D  — red        expense totals, warnings
#F0F4F8  — light grey page background, alt data rows
#2D3748  — dark slate body text
#4A5568  — mid grey   secondary text, subtitles
#FFF8E7  — light yellow filter cells, active dropdowns
```
MUI component defaults: DataGrid for tables, Dialog for forms, Skeleton for loading, Alert for errors and empty states.

### Currency
All amounts stored as `NUMERIC(15,2)` in Nigerian Naira (₦). Display with `₦` prefix and comma-separated thousands.

---

## Testing

Every new API endpoint requires three tests minimum:
1. Happy path
2. Unauthorized access (missing or invalid token)
3. Invalid input (malformed data, missing fields, negative amounts)

Integration tests must hit a real PostgreSQL instance — never mock the database.

```bash
pytest tests/test_revenue.py -v
```

---

## Security

- JWT refresh tokens must use httpOnly cookies in production. Any `localStorage` token storage is known tech debt and must be removed before production deployment.
- Rate-limit `/auth/login` — 5 attempts / 15 min (insider threat + brute force, Nigerian public IP deployment).
- Audit log required on every write to financial tables.

---

## Domain Modules

15 Excel sheets map to web modules:

| Module | Type | Route | Excel Source |
|---|---|---|---|
| Revenue Transactions | CRUD | `/revenue` | `Revenue_Log` |
| Expense Transactions | CRUD | `/expenses` | `Expenses_Log` |
| Payroll Records | CRUD | `/payroll` | `Staff_Salaries` |
| Budget Planning | CRUD grid | `/budget` | `Budget` |
| Dashboard | Computed | `/dashboard` | `Dashboard` |
| Analysis / Charts | Computed | `/analysis` | `Analysis` |
| General Ledger | Computed | `/ledger` | `General_Ledger` |
| Profit & Loss | Report | `/reports/pnl` | `Profit_Loss` |
| Cash Flow | Report | `/reports/cashflow` | `Cash_Flow` |
| Balance Sheet | Report | `/reports/balance-sheet` | `Balance_Sheet` |
| Trial Balance | Report | `/reports/trial-balance` | `Trial_Balance` |
| Chart of Accounts | Settings | `/settings/accounts` | `Chart_of_Accounts` |
| Employees | Settings | `/settings/employees` | `Employee_Data` |
| Locations & Units | Settings | `/settings/locations` | `Dropdown_Lists` |
| Reference Data | Settings | `/settings/reference` | `Dropdown_Lists` |

---

## Seed Data

Canonical values from `Dropdown_Lists` sheet — use as DB seed:

- **Locations:** Agbowo, UI
- **Units (15):** Anooore 1, Anooore 2, Anooore X, Scholar, Scholar 2, Vine, Vine 1, Vine 2, Vine Special, VINE X, Kollege, Premier, Provision Shop, Salon, Business Centre
- **Revenue Accounts:** Room Revenue, Shop Rent, Caution Fee Income, Extra Charges, Form & Legal Fees, Other Income
- **Expense Categories:** Salaries, Construction, Maintenance, Utilities, Inventory, Administrative, Loans & Advances, Transportation, IT & Communications, Other
- **Payment Methods:** Cash, Bank Transfer, POS, Mobile Transfer, Cheque
- **Departments:** Admin, Maintenance, Project, Inventory, IT, Accounts

---

## Database

Key table relationships:
- `companies` → `locations` → `units`
- `revenue_transactions` — scoped to `company_id`, `location_id`, `unit_id`
- `expense_transactions` — scoped to `company_id`, `location_id`
- `payroll_records` — unique on `(company_id, year, month)`
- `budget_lines` — unique on `(company_id, year, month, category, line_type)`
- `accounts` — Chart of Accounts, codes 1000–5090
- `employees` — refs `E001`–`E012`

Check existing migrations before writing any model changes that touch the database.

---

## Known Business Logic

- **Caution Fee Income** must also credit `Caution Deposits Payable` (liability) — it is refundable
- **Balance Sheet liabilities** are all `0` in the Excel — wire `Loans & Advances` → Loans Payable, Caution Fee Income → Deposits Payable in the web version
- **General Ledger** is a union view over revenue + expense transactions for Phase 1, not a separate entry table
- **Payroll** in the Excel is a monthly lump sum per run — `payroll_records` stores the roll-up; `employees.monthly_salary` is the rate reference

---

## Environment Variables

```
DATABASE_URL=
SECRET_KEY=
ANTHROPIC_API_KEY=
AFRICAS_TALKING_API_KEY=
AFRICAS_TALKING_USERNAME=
```

---

## Build Phases

| Phase | Scope |
|---|---|
| **0 — Foundation** | Docker, DB schema + seeds, JWT auth, React shell |
| **1 — Data Entry** | Revenue, Expense, Payroll CRUD + 2024 Excel import |
| **2 — Reports** | Dashboard, Budget, P&L, Cash Flow, Balance Sheet, Trial Balance, General Ledger |
| **3 — Analytics** | 6 Recharts charts + PDF export |
| **4 — Settings** | Accounts, Employees, Locations/Units, Reference data |
| **5 — Tenant Ops** | Tenant registry, leases, rent tracking, AR on Balance Sheet |
| **6 — Mobile/Notify** | PWA, Africa's Talking SMS/WhatsApp, expense approval workflow |
| **7 — Intelligence** | Multi-year comparison, budget forecasting, AI categorization |

---

## Current Status

**Phase 0 — Foundation: COMPLETE.** Auth (JWT + RBAC), User Management, Group/Role Management, multi-tenancy, React shell with collapsible sidebar, i18n (en/fr), design system matched to portal.

**Design System:** Mulish font, portal-matched tokens (navy #1B2A4A, primary #17C1E8, WCAG AA contrast-fixed muted/secondary colors). See `frontend/src/theme/theme.ts` for all tokens.

**Dashboard:** Accounting-focused — 5 KPIs (Revenue, Expenses, Net Profit, Margin, Salaries), P&L trend chart with 5 expense lines, 6 revenue streams donut, Expense vs Budget bar chart, Cash Position summary, Trial Balance snapshot, GL entries table with Debit/Credit.

**Phase 1 — Data Entry: COMPLETE** (Revenue, Expense, Settings CRUD, Dashboard live data, Seed migration 009)

**Payroll Module — Sprint 1 COMPLETE, Sprint 2 COMPLETE.**

### Council Audit (2026-03-30) — All Fixes Applied

| Fix | Migration | Status |
|---|---|---|
| `float` → `Decimal` on all financial model fields | — (model only) | DONE |
| Mass assignment whitelist on payroll service `setattr()` calls | — | DONE |
| `employee_ref` global unique → compound `(company_id, employee_ref)` | 005 | DONE |
| Missing `company_id` indexes on locations, accounts, employees, reference_data | 005 | DONE |
| CORS restricted to explicit methods/headers | — | DONE |
| Language endpoint `dict` → `LanguageUpdate` Pydantic schema | — | DONE |
| React Error Boundary added | — | DONE |
| `ApiError` type + `getErrorMessage` helper added | — | DONE |
| `expense_transactions.location_id` NOT NULL → nullable | 010 | DONE |
| Missing `account_id` + `category` indexes on transaction tables | 010 | DONE |
| `update_revenue`/`update_expense` silently dropped None → fixed | — | DONE |
| `formatNaira` + `PAYMENT_METHODS` extracted to `frontend/src/utils/format.ts` | — | DONE |
| Revenue/Expense search promoted from client-side to server-side | — | DONE |

### Known Issues (remaining)

- No pagination on list endpoints (users, groups, payroll types) — Phase 2
- JWT contains company_id + permissions in payload (acceptable now, review Phase 6+)
- No test coverage yet — add with Sprint 5

### Payroll Sprint Status

| Sprint | Scope | Status |
|---|---|---|
| 1 | Config tables + PayrollSetup.tsx UI + Nigerian PAYE/pension/NHF/NSITF defaults | DONE |
| 2 | Employee payroll profiles + allowances/deductions + leave balances + leave requests with approval workflow | DONE |
| 3 | Payroll calculation engine (PAYE progressive tax, CRA) + PayrollProcessing.tsx stepper | NEXT |
| 4 | Payslip generation + PDF export (WeasyPrint) | |
| 5 | Integration tests + edge cases + 13th month bonus | |

### Migration Chain (all applied)

001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010

### Payroll Tables (Sprint 3 — not yet created)

`payroll_runs`, `payroll_items`, `payroll_item_lines`

### Known Backend Gotchas

- **DO NOT** add `from __future__ import annotations` to FastAPI route files — breaks Pydantic v2 body parsing
- **Login rate limit** is 30/15min during dev (tighten to 5/15min before production)
- **Vite proxy** points to `http://localhost:8000` — only works when running frontend locally (not inside Docker)
- **Docker frontend container** must be stopped when running `npm run dev` locally (port 5173 conflict)
