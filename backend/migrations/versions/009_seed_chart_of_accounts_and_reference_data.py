"""Seed Chart of Accounts, locations, units, reference data for existing companies

Revision ID: 009
Revises: 008
Create Date: 2026-03-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

ACCOUNTS = [
    ("1010", "Cash",                     "Asset",     "Dr"),
    ("1020", "Bank",                     "Asset",     "Dr"),
    ("1030", "Accounts Receivable",      "Asset",     "Dr"),
    ("1040", "Prepaid Expenses",         "Asset",     "Dr"),
    ("2010", "Accounts Payable",         "Liability", "Cr"),
    ("2020", "Caution Deposits Payable", "Liability", "Cr"),
    ("2030", "Loans Payable",            "Liability", "Cr"),
    ("2040", "Accrued Expenses",         "Liability", "Cr"),
    ("3010", "Owner's Capital",          "Equity",    "Cr"),
    ("3020", "Retained Earnings",        "Equity",    "Cr"),
    ("4010", "Room Revenue",             "Revenue",   "Cr"),
    ("4020", "Shop Rent",                "Revenue",   "Cr"),
    ("4030", "Caution Fee Income",       "Revenue",   "Cr"),
    ("4040", "Extra Charges",            "Revenue",   "Cr"),
    ("4050", "Form & Legal Fees",        "Revenue",   "Cr"),
    ("4090", "Other Income",             "Revenue",   "Cr"),
    ("5010", "Salaries",                 "Expense",   "Dr"),
    ("5020", "Construction",             "Expense",   "Dr"),
    ("5030", "Maintenance",              "Expense",   "Dr"),
    ("5040", "Utilities",                "Expense",   "Dr"),
    ("5050", "Inventory",                "Expense",   "Dr"),
    ("5060", "Administrative",           "Expense",   "Dr"),
    ("5070", "Loans & Advances",         "Expense",   "Dr"),
    ("5080", "Transportation",           "Expense",   "Dr"),
    ("5085", "IT & Communications",      "Expense",   "Dr"),
    ("5090", "Other Expenses",           "Expense",   "Dr"),
]

LOCATIONS = [
    ("Agbowo", "Agbowo, Ibadan, Oyo State"),
    ("UI",     "University of Ibadan, Oyo State"),
]

# location_name -> list of (unit_name, unit_type)
UNITS = {
    "Agbowo": [
        ("Anooore 1",    "apartment"),
        ("Anooore 2",    "apartment"),
        ("Anooore X",    "apartment"),
        ("Scholar",      "apartment"),
        ("Scholar 2",    "apartment"),
        ("Vine",         "apartment"),
        ("Vine 1",       "apartment"),
        ("Vine 2",       "apartment"),
        ("Vine Special", "apartment"),
        ("VINE X",       "apartment"),
        ("Kollege",      "apartment"),
        ("Premier",      "apartment"),
    ],
    "UI": [
        ("Provision Shop",  "shop"),
        ("Salon",           "shop"),
        ("Business Centre", "shop"),
    ],
}

REFERENCE_DATA = {
    "payment_method":   ["Cash", "Bank Transfer", "POS", "Mobile Transfer", "Cheque"],
    "expense_category": [
        "Salaries", "Construction", "Maintenance", "Utilities", "Inventory",
        "Administrative", "Loans & Advances", "Transportation",
        "IT & Communications", "Other",
    ],
    "department":       ["Admin", "Maintenance", "Project", "Inventory", "IT", "Accounts"],
    "revenue_account":  [
        "Room Revenue", "Shop Rent", "Caution Fee Income",
        "Extra Charges", "Form & Legal Fees", "Other Income",
    ],
}

EMPLOYEES = [
    ("E001", "Adekunle Johnson",  "Site Manager",     "Male",   "Admin"),
    ("E002", "Blessing Okafor",   "Accountant",       "Female", "Accounts"),
    ("E003", "Chidi Nwosu",       "Maintenance Lead", "Male",   "Maintenance"),
    ("E004", "Damilola Adebayo",  "Receptionist",     "Female", "Admin"),
    ("E005", "Emmanuel Eze",      "Security",         "Male",   "Admin"),
    ("E006", "Funke Adesanya",    "Cleaner",          "Female", "Maintenance"),
    ("E007", "Gabriel Obi",       "Electrician",      "Male",   "Maintenance"),
    ("E008", "Habiba Yusuf",      "IT Support",       "Female", "IT"),
    ("E009", "Ibrahim Musa",      "Plumber",          "Male",   "Maintenance"),
    ("E010", "Janet Okonkwo",     "Cook",             "Female", "Inventory"),
    ("E011", "Kehinde Balogun",   "Driver",           "Male",   "Admin"),
    ("E012", "Lateef Adewale",    "Project Worker",   "Male",   "Project"),
]


def upgrade() -> None:
    conn = op.get_bind()

    companies = conn.execute(sa.text("SELECT id FROM companies")).fetchall()

    for (company_id,) in companies:
        # ── Chart of Accounts ─────────────────────────────────────────
        for code, name, acct_type, normal_balance in ACCOUNTS:
            conn.execute(sa.text(
                "INSERT INTO accounts (id, company_id, code, name, type, normal_balance) "
                "VALUES (gen_random_uuid(), :cid, :code, :name, :type, :nb) "
                "ON CONFLICT ON CONSTRAINT uq_account_company_code DO NOTHING"
            ), {
                "cid": company_id,
                "code": code,
                "name": name,
                "type": acct_type,
                "nb": normal_balance,
            })

        # ── Locations ─────────────────────────────────────────────────
        for loc_name, loc_address in LOCATIONS:
            conn.execute(sa.text(
                "INSERT INTO locations (id, company_id, name, address) "
                "VALUES (gen_random_uuid(), :cid, :name, :address) "
                "ON CONFLICT ON CONSTRAINT uq_location_company_name DO NOTHING"
            ), {
                "cid": company_id,
                "name": loc_name,
                "address": loc_address,
            })

        # ── Units (need location_id from locations just inserted) ────
        for loc_name, unit_list in UNITS.items():
            loc_row = conn.execute(sa.text(
                "SELECT id FROM locations "
                "WHERE company_id = :cid AND name = :loc_name"
            ), {"cid": company_id, "loc_name": loc_name}).fetchone()

            if loc_row is None:
                continue

            location_id = loc_row[0]

            for unit_name, unit_type in unit_list:
                conn.execute(sa.text(
                    "INSERT INTO units (id, company_id, location_id, name, unit_type) "
                    "VALUES (gen_random_uuid(), :cid, :lid, :name, :utype) "
                    "ON CONFLICT ON CONSTRAINT uq_units_company_location_name DO NOTHING"
                ), {
                    "cid": company_id,
                    "lid": location_id,
                    "name": unit_name,
                    "utype": unit_type,
                })

        # ── Reference Data ────────────────────────────────────────────
        for category, values in REFERENCE_DATA.items():
            for value in values:
                conn.execute(sa.text(
                    "INSERT INTO reference_data (id, company_id, category, value) "
                    "VALUES (gen_random_uuid(), :cid, :cat, :val) "
                    "ON CONFLICT ON CONSTRAINT uq_ref_company_cat_val DO NOTHING"
                ), {
                    "cid": company_id,
                    "cat": category,
                    "val": value,
                })

        # ── Employees ─────────────────────────────────────────────────
        for emp_ref, name, designation, gender, department in EMPLOYEES:
            conn.execute(sa.text(
                "INSERT INTO employees "
                "(id, company_id, employee_ref, name, designation, gender, monthly_salary, status) "
                "VALUES (gen_random_uuid(), :cid, :ref, :name, :desig, :gender, 0, 'Active') "
                "ON CONFLICT ON CONSTRAINT uq_employees_company_employee_ref DO NOTHING"
            ), {
                "cid": company_id,
                "ref": emp_ref,
                "name": name,
                "desig": designation,
                "gender": gender,
            })


def downgrade() -> None:
    # Seed / reference data is safer left in place on downgrade.
    # Removing it could break FK references from transaction tables.
    pass
