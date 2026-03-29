---
name: db-seed
description: 'Seeds the Talents Apartments AIS PostgreSQL database with all reference data: Chart of Accounts, Locations, Units, Employees, and Dropdown values. Use when the user says "seed the database", "load reference data", "seed db", or "/db-seed". Must be run after alembic upgrade head and before import-excel.'
argument-hint: 'Optional: specific table to seed, e.g. "accounts" or "employees"'
disable-model-invocation: true
---

# DB Seed

Seeds all reference data into PostgreSQL. Run after `alembic upgrade head`, before `/import-excel`.

## Before Starting

1. Confirm DB is running: `docker-compose up -d db`
2. Confirm migrations applied: `alembic upgrade head`
3. Read `CLAUDE.md` — Seed Data and Database sections for canonical values

## Seed Script

Generate `tools/seed_db.py` if it doesn't exist. The script must be idempotent — safe to run multiple times using `INSERT ... ON CONFLICT DO NOTHING`. Example:
```sql
INSERT INTO locations (id, company_id, name)
VALUES (gen_random_uuid(), :company_id, 'Agbowo')
ON CONFLICT (company_id, name) DO NOTHING;
```
This requires a `UNIQUE(company_id, name)` constraint on the locations table — verify it exists in the migration before running.

Create the company first and capture its `id` — use that `id` as `company_id` for every subsequent insert. Do not hardcode a UUID; let the DB generate it and read it back after the company insert.

---

## Seed Order (dependencies matter)

### 1. Company
```python
INSERT INTO companies (id, name) VALUES (gen_random_uuid(), 'Talents Apartments')
ON CONFLICT DO NOTHING;
```

### 2. Locations
```
Agbowo
UI
```

### 3. Units (link to location)
```
Agbowo: Anooore 1, Anooore 2, Anooore X, Scholar, Scholar 2,
        Vine, Vine 1, Vine 2, Vine Special, VINE X, Kollege, Premier
UI:     Provision Shop, Salon, Business Centre
```

### 4. Chart of Accounts (27 accounts — expanded from Excel's 23 to properly wire liabilities)
| Code | Name | Type | Normal Balance |
|---|---|---|---|
| 1000 | Cash on Hand | Asset | Dr |
| 1010 | Bank Account | Asset | Dr |
| 1100 | Accounts Receivable | Asset | Dr |
| 1200 | Inventory | Asset | Dr |
| 1300 | Fixed Assets | Asset | Dr |
| 2000 | Accounts Payable | Liability | Cr |
| 2100 | Salaries Payable | Liability | Cr |
| 2200 | Loans Payable | Liability | Cr |
| 2300 | Caution Deposits Payable | Liability | Cr |
| 3000 | Owner Equity | Equity | Cr |
| 3100 | Retained Earnings | Equity | Cr |
| 4000 | Room Revenue | Revenue | Cr |
| 4010 | Shop Rent | Revenue | Cr |
| 4020 | Caution Fee Income | Revenue | Cr |
| 4030 | Extra Charges | Revenue | Cr |
| 4040 | Form & Legal Fees | Revenue | Cr |
| 4050 | Other Income | Revenue | Cr |
| 5000 | Salaries | Expense | Dr |
| 5010 | Construction | Expense | Dr |
| 5020 | Maintenance | Expense | Dr |
| 5030 | Utilities | Expense | Dr |
| 5040 | Inventory | Expense | Dr |
| 5050 | Administrative | Expense | Dr |
| 5060 | Loans & Advances | Expense | Dr |
| 5070 | Transportation | Expense | Dr |
| 5080 | IT & Communications | Expense | Dr |
| 5090 | Other | Expense | Dr |

### 5. Employees (12 staff from Employee_Data sheet)
| Ref | Name | Designation | Salary |
|---|---|---|---|
| E001 | (name) | Project Manager | 60000 |
| E002 | (name) | Student Relations Manager | 60000 |
| E003 | (name) | Maintenance Officer | 50000 |
| E004 | (name) | Housekeeper | 25000 |
| E005 | (name) | Housekeeper | 25000 |
| E006 | (name) | Front Desk | 30000 |
| E007 | (name) | Front Desk | 30000 |
| E008 | (name) | Porter | 20000 |
| E009 | (name) | Cleaner | 20000 |
| E010 | (name) | Security | 25000 |
| E011 | (name) | Security | 25000 |
| E012 | (name) | Electrician | 30000 |

Read actual names from `Sample/TALENTS_AIS_FIXED.xlsx` → `Employee_Data` sheet, rows 6–17, column B. If the file is not accessible, use the placeholder `(name)` and log a warning so the user knows to update them manually.

### 6. Reference / Dropdown values
Store in a `reference_data` table with structure:
```sql
CREATE TABLE reference_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  category VARCHAR NOT NULL,   -- "payment_method", "expense_category", "department", "staff_status"
  value VARCHAR NOT NULL,
  UNIQUE(company_id, category, value)
);
```
Seed values:
- `payment_method`: Cash, Bank Transfer, POS, Mobile Transfer, Cheque
- `expense_category`: Salaries, Construction, Maintenance, Utilities, Inventory, Administrative, Loans & Advances, Transportation, IT & Communications, Other
- `department`: Admin, Maintenance, Project, Inventory, IT, Accounts
- `staff_status`: Active, Non Active

## Running the Script

```bash
cd /path/to/TALAccounting-software
source backend/venv/bin/activate
python tools/seed_db.py
```

## Verification

After seeding, confirm:
```sql
SELECT COUNT(*) FROM locations;    -- 2
SELECT COUNT(*) FROM units;        -- 15
SELECT COUNT(*) FROM accounts;     -- 27
SELECT COUNT(*) FROM employees;    -- 12
```
