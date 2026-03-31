# Current Status

**Phase 0 — Foundation: COMPLETE.** Auth (JWT + RBAC), User Management, Group/Role Management, multi-tenancy, React shell with collapsible sidebar, i18n (en/fr), design system matched to portal.

**Design System:** Mulish font, portal-matched tokens (navy #1B2A4A, primary #17C1E8, WCAG AA contrast-fixed muted/secondary colors). See `frontend/src/theme/theme.ts` for all tokens.

**Dashboard:** Accounting-focused — 5 KPIs (Revenue, Expenses, Net Profit, Margin, Salaries), P&L trend chart with 5 expense lines, 6 revenue streams donut, Expense vs Budget bar chart, Cash Position summary, Trial Balance snapshot, GL entries table with Debit/Credit.

**Phase 1 — Data Entry: COMPLETE** (Revenue, Expense, Settings CRUD, Dashboard live data, Seed migration 009)

**Phase 2 — Reports: COMPLETE** (P&L, Cash Flow, Balance Sheet, Trial Balance, General Ledger, Budget Planning — all wired to live SQL. Migration 011: opening_balances table. Shared `report_helpers.py`. Option A balance sheet — cumulative cash-basis. Budget grid with bulk upsert, dashboard Expense vs Budget wired to real budget_lines data.)

**Phase 3 — Analytics: COMPLETE** (Analysis page with 6 Recharts charts, printable HTML export for P&L + Balance Sheet)

**Payroll Module — Sprints 1-4 COMPLETE.** (Config → Profiles → PAYE Engine → Payslip HTML export)

**Phase 5 — Tenant Ops: COMPLETE** (Tenant registry, leases, rent payments, AR summary. Migration 013.)

## Infrastructure Fixes (2026-03-30)
- `docker-compose.yml`: `DATABASE_URL` override for API container (`localhost` → `db` service)
- `app/utils/config.py`: Pydantic Settings `extra: "ignore"` to allow `POSTGRES_PASSWORD` in `.env`

## Council Audit (2026-03-30) — All Fixes Applied

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

## Known Issues (remaining)

- No pagination on list endpoints (users, groups, payroll types) — Phase 2
- JWT contains company_id + permissions in payload (acceptable now, review Phase 6+)
- No test coverage yet — add with Sprint 5

## Payroll Sprint Status

| Sprint | Scope | Status |
|---|---|---|
| 1 | Config tables + PayrollSetup.tsx UI + Nigerian PAYE/pension/NHF/NSITF defaults | DONE |
| 2 | Employee payroll profiles + allowances/deductions + leave balances + leave requests with approval workflow | DONE |
| 3 | PAYE calculation engine (CRA, progressive brackets, pension, NHF, NSITF) + PayrollProcessing.tsx stepper | DONE |
| 4 | Payslip HTML export (printable, browser print-to-PDF) | DONE |
| 5 | Integration tests + edge cases + 13th month bonus | |

## Group Accounting (Phase 6) — IMPLEMENTED (2026-03-30)

Multi-company group accounting for Executive Talents Group. One accountant manages all subsidiaries.

| Component | Status |
|---|---|
| Company Groups model + migration 015 (8 new tables + backfill) | DONE |
| `get_current_user` company context switching via JWT | DONE |
| `/auth/switch-company` endpoint + enhanced `/auth/me` | DONE |
| Company Switcher component in Layout header | DONE |
| Group sidebar section (conditional on group membership) | DONE |
| Company color identity bar | DONE |
| Group admin CRUD (routes, services, schemas) | DONE |
| Group Settings page (Companies, Users, CoA Template, Allocation Rules tabs) | DONE |
| Group CoA template with `is_intercompany` flag | DONE |
| CoA mismatch check on company join | DONE |
| Allocation rules engine (PERCENTAGE/EQUAL/CUSTOM, SUM=100% validation) | DONE |
| IC transaction CRUD + auto-mirror entries | DONE |
| IC transaction confirm/void with audit trail | DONE |
| Inter-Company Transactions page | DONE |
| Consolidated P&L (columnar per company + elimination + group total) | DONE |
| Consolidated Balance Sheet (same columnar format) | DONE |
| Consolidated Trial Balance (DR/CR per company + elimination) | DONE |
| Group Dashboard (4 KPIs, subsidiary performance, charts) | DONE |
| i18n keys for all group features (en) | DONE |

**Key decisions:** Independent-first onboarding, always-switch-first data view, one-group-only, holding-pays-allocates-down, CoA mismatch check on join, group features invisible to independent companies, holding company has own books, keep IC history on removal.

## Group Payroll (2026-03-31)

Centralized payroll managed by GROUP_ADMIN at holding company (EXG).

| Feature | Status |
|---|---|
| Payroll moved from Bookkeeping to dedicated "Staff" sidebar section | DONE |
| Staff section only visible to GROUP_ADMIN | DONE |
| Employee cost allocations (subsidiary + percentage) | DONE |
| Migration 017: employee_cost_allocations table + backfill | DONE |
| Multi-company employee listing (all group employees in one view) | DONE |
| Subsidiary filter on employee list | DONE |
| Group payroll run (all employees in ONE run) | DONE |
| GL posting splits salary costs to subsidiaries by allocation % | DONE |
| Cost by Subsidiary summary on payroll processing page | DONE |
| Salary account (5010) seeded in all subsidiaries | DONE |

## Role-Based Visibility (2026-03-31)

| Role | Home | Sees | Menu |
|---|---|---|---|
| GROUP_ADMIN | Group Dashboard | All companies + switcher | Everything + Group + Staff |
| COMPANY_ADMIN | Company Dashboard | Only their company | Bookkeeping + Reports + Settings |
| VIEWER | Company Dashboard | Only their company (read-only) | Dashboard + Reports only |

## Migration Chain (all applied)

001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017
