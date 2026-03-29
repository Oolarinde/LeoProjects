---
name: import-excel
description: 'Runs the 2024 historical data migration from the Talents Apartments Excel workbook into the PostgreSQL database. Use when the user says "import excel", "migrate excel data", "load 2024 data", or "/import-excel". Reads Sample/TALENTS_AIS_FIXED.xlsx and inserts Revenue_Log, Expenses_Log, and Staff_Salaries rows.'
argument-hint: 'Optional: sheet name to import only one sheet, e.g. "Revenue_Log"'
disable-model-invocation: true
---

# Import Excel

One-time migration of 2024 historical data from `Sample/TALENTS_AIS_FIXED.xlsx` into PostgreSQL.

## Before Starting

1. Confirm the database is running: `docker-compose up -d db`
2. Confirm migrations are applied: `alembic upgrade head`
3. Confirm seed data is loaded (locations, units, accounts) — run `/db-seed` first if not
4. Read `CLAUDE.md` — Reference Data section for canonical location/unit/account names

## Workflow

The import script lives at `tools/import_excel_2024.py`. If it doesn't exist yet, generate it following the spec below.

### Step 1 — Read the workbook
```python
import openpyxl
wb = openpyxl.load_workbook("Sample/TALENTS_AIS_FIXED.xlsx", data_only=True)
```

### Step 2 — Import Revenue_Log
Sheet: `Revenue_Log` | Data starts: row 6 | Columns: `Date | Location | Unit Name | Account | Description | Txn ID | Payment Method | Amount`

For each row:
- Skip if `Date` is empty or not a valid date
- Skip if `Amount` is not numeric, zero, or negative
- Look up `location_id` from DB by name (Agbowo / UI)
- Look up `unit_id` from DB by name
- Look up `account_id` from DB by account name
- Insert into `revenue_transactions` — skip duplicates on `txn_ref`

### Step 3 — Import Expenses_Log
Sheet: `Expenses_Log` | Data starts: row 6 | Columns: `Date | Location | Category | Vendor/Staff | Department | Description | Amount | Payment Method | Acct Code`

For each row:
- Skip if `Date` is empty or `Amount` is not numeric
- Look up `location_id` from DB by name
- Insert into `expense_transactions`

### Step 4 — Import Staff_Salaries
Sheet: `Staff_Salaries` | Data starts: row 6 | Columns: `Year | Month | Description | Staff Count | Total Paid | Payment Method | Notes`

For each row:
- Convert month name to integer (January=1, etc.)
- Insert into `payroll_records` — unique on `(company_id, year, month)`

### Step 5 — Report
After import, print:
```
Revenue rows imported:  XXXX
Expense rows imported:  XXXX
Payroll rows imported:  12
Rows skipped (invalid): XX
Duplicate rows skipped: XX
```

## Error Handling

- If a location name in the Excel doesn't match any DB location → log warning, skip row, continue (do not fail the entire import)
- If a unit name doesn't match → only set `unit_id = NULL` if the schema allows it (check migration); otherwise skip the row and log warning
- If `Amount` is not numeric → skip row, log warning
- Never delete existing DB rows — this is an additive import only
- Wrap each sheet's import in a separate `try/except` with a DB transaction rollback — a failure on Expenses_Log should not roll back Revenue_Log rows already committed

## Running the Script

```bash
cd /path/to/TALAccounting-software
source backend/venv/bin/activate
python tools/import_excel_2024.py
```

## After Import

Verify counts match the Excel:
- Revenue_Log has ~1,180 rows in the Excel
- Expenses_Log has ~1,163 rows
- Staff_Salaries has 12 rows (Jan–Dec 2024)

Run a quick sanity check:
```sql
SELECT COUNT(*) FROM revenue_transactions;
SELECT COUNT(*) FROM expense_transactions;
SELECT year, month, total_paid FROM payroll_records ORDER BY year, month;
```
