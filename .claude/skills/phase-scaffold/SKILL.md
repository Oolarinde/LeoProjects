---
name: phase-scaffold
description: 'Scaffolds a complete build phase for the Talents Apartments AIS project. Use when the user says "scaffold phase N", "build phase N", "start phase N", or "/phase-scaffold N". Generates all files, folders, migrations, and boilerplate for the specified phase number (0–7) based on CLAUDE.md.'
argument-hint: 'Phase number: 0=Foundation, 1=Data Entry, 2=Reports, 3=Analytics, 4=Settings, 5=Tenant Ops, 6=Mobile/Notify, 7=Intelligence'
disable-model-invocation: true
---

# Phase Scaffold

Generates all production-ready files for a given build phase of the Talents Apartments AIS.

## Before Starting

1. Read `CLAUDE.md` in the project root — it is the source of truth for stack, patterns, and phase scope
2. Run `ls` on the project root to check what already exists — never overwrite existing files without asking
3. Check `backend/migrations/` for existing migrations before writing new model changes

## Phase Definitions

### Phase 0 — Foundation
Generate in this order:
1. `docker-compose.yml` — PostgreSQL 15, FastAPI api service, React frontend service, Nginx
2. `backend/requirements.txt` — fastapi, uvicorn, sqlalchemy[asyncio], alembic, asyncpg, pydantic, python-jose, passlib[bcrypt], python-multipart, ruff, black, pytest, pytest-asyncio, httpx
3. `backend/database.py` — async SQLAlchemy engine + session factory
4. `backend/main.py` — FastAPI app, CORS, router registration, lifespan
5. `backend/app/models/` — all models: User, Company, Location, Unit, Account, Employee (from CLAUDE.md Database section)
6. `backend/migrations/` — Alembic env.py + initial migration with full schema
7. `backend/app/utils/security.py` — JWT encode/decode, bcrypt hashing
8. `backend/app/utils/dependencies.py` — get_db, get_current_user
9. `backend/app/routes/auth.py` + `backend/app/services/auth.py` — login, refresh, register
10. `backend/app/schemas/schemas.py` — all Pydantic schemas for auth + reference models
11. `frontend/package.json` — react, typescript, vite, @mui/material, @mui/icons-material, recharts, axios, zustand, react-router-dom
12. `frontend/src/utils/store.ts` — Zustand store with shape:
    ```ts
    { year: number, location: { id: string | null, name: string } | null, user: User | null }
    ```
    `location: null` means "All locations". Year defaults to current year.
13. `frontend/src/App.tsx` — router setup, protected routes
14. `frontend/src/components/Layout.tsx` — sidebar + header with year selector and location filter ("All" | "Agbowo" | "UI")
15. `.env.example` — all required keys from CLAUDE.md Environment Variables section
16. `.gitignore`

### Phase 1 — Data Entry
1. `backend/app/models/` — RevenueTransaction, ExpenseTransaction, PayrollRecord models
2. `backend/migrations/versions/002_transactions.py`
3. `backend/app/routes/revenue.py` + `services/revenue.py` — full CRUD
4. `backend/app/routes/expenses.py` + `services/expense.py` — full CRUD
5. `backend/app/routes/payroll.py` + `services/payroll.py` — full CRUD
6. `backend/tests/test_revenue.py` — happy path, unauth, invalid input
7. `backend/tests/test_expenses.py` — same 3 tests
8. `frontend/src/pages/Revenue.tsx` — form + filterable table
9. `frontend/src/pages/Expenses.tsx` — form + filterable table
10. `frontend/src/pages/Payroll.tsx` — monthly entry form + summary table
11. `tools/import_excel_2024.py` — 2024 data migration script; follow the full spec in the `/import-excel` skill

### Phase 2 — Reports
1. `backend/app/routes/dashboard.py` + `services/dashboard.py` — KPI summary + monthly matrix
2. `backend/app/routes/reports.py` + `services/reports.py` — pnl, cashflow, balance_sheet, trial_balance, general_ledger, budget
3. `backend/tests/test_reports.py` — happy path, unauth, invalid year
4. `frontend/src/pages/Dashboard.tsx` — 5 KPI cards + monthly matrix table
5. `frontend/src/pages/Budget.tsx` — 12-month grid, editable budget per category
6. `frontend/src/pages/ProfitLoss.tsx`
7. `frontend/src/pages/CashFlow.tsx`
8. `frontend/src/pages/BalanceSheet.tsx`
9. `frontend/src/pages/TrialBalance.tsx`
10. `frontend/src/pages/GeneralLedger.tsx` — paginated table

### Phase 3 — Analytics
1. `backend/app/routes/analysis.py` + `services/analysis.py` — monthly series, revenue by location, expenses by category
2. `frontend/src/pages/Analysis.tsx` — 6 Recharts charts (see CLAUDE.md Domain Modules)
3. `backend/app/routes/export.py` — PDF export via WeasyPrint for P&L, Cash Flow, Balance Sheet
4. `frontend/src/components/charts/` — one component per chart type

### Phase 4 — Settings
1. `backend/app/routes/settings.py` — accounts, employees, locations, units, reference data CRUD
2. `frontend/src/pages/settings/` — Accounts, Employees, Locations, ReferenceData pages
3. `frontend/src/pages/settings/Users.tsx` — invite + role management

### Phase 5 — Tenant Ops
1. `backend/app/models/` — Tenant, Lease, RentRecord models
2. `backend/migrations/versions/003_tenants.py`
3. `backend/app/routes/tenants.py` + `services/tenants.py`
4. `frontend/src/pages/Tenants.tsx`
5. `frontend/src/pages/Occupancy.tsx` — unit occupancy dashboard

### Phase 6 — Mobile/Notify
1. `backend/app/services/notifications.py` — Africa's Talking SMS/WhatsApp integration
2. `frontend/public/manifest.json` + service worker — PWA setup
3. `backend/app/routes/approvals.py` — expense approval workflow

### Phase 7 — Intelligence
1. `backend/app/services/forecasting.py` — budget vs YTD run rate projection
2. `backend/app/services/ai_categorize.py` — Claude API expense categorization
3. `frontend/src/pages/Intelligence.tsx` — multi-year comparison + forecast charts

## Output Rules

- Every backend route must use `get_current_user` and filter by `current_user.company_id`
- Every report endpoint must accept `year: int` and `location_id: Optional[UUID]` query params
- Every new endpoint needs 3 tests: happy path, unauth, invalid input
- Never mock the database in tests — use a real PostgreSQL test instance
- All amounts `NUMERIC(15,2)`, display as `₦` prefix with comma thousands
- Follow build order: models → schemas → routes → services (backend), then API service → state → component (frontend)

## After Scaffolding

Tell the user:
1. Which files were created (grouped by backend / frontend / config)
2. Exact startup sequence:
   ```bash
   cp .env.example .env          # fill in all values before next step
   docker-compose up -d db       # start DB first
   cd backend && alembic upgrade head
   docker-compose up -d          # start all services
   python tools/seed_db.py       # load reference data
   ```
3. Any values in `.env` that need to be filled manually before the app will start (DATABASE_URL, SECRET_KEY minimum)
