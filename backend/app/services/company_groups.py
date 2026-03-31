"""Service layer for Company Group administration — CRUD, CoA template, allocation rules."""
from __future__ import annotations


import uuid
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.allocation_rule import AllocationRule, AllocationRuleLine
from app.models.company import Company
from app.models.company_group import CompanyGroup, CompanyGroupMember
from app.models.group_coa_template import GroupCoATemplate
from app.models.intercompany_transaction import IntercompanyTransaction
from app.models.user import User
from app.models.user_company_membership import UserCompanyMembership
from app.services.auth import _ensure_default_roles
import sqlalchemy as sa


# ── Group payroll helper ─────────────────────────────────────────────────────

def get_group_company_ids_for_user(db: Session, user: User) -> list[UUID]:
    """Get all company IDs in the user's group. Returns [user.company_id] if no group."""
    company = (db.execute(
        select(Company).where(Company.id == user.company_id)
    )).scalar_one()
    if not company.company_group_id:
        return [user.company_id]
    members = (db.execute(
        select(CompanyGroupMember.company_id)
        .where(CompanyGroupMember.company_group_id == company.company_group_id)
    )).scalars().all()
    return list(members) if members else [user.company_id]


# ── IC account seeds ──────────────────────────────────────────────────────────
IC_ACCOUNT_SEEDS = [
    {"code": "1500", "name": "IC Receivable", "type": "Asset", "normal_balance": "Dr", "is_intercompany": True},
    {"code": "2500", "name": "IC Payable", "type": "Liability", "normal_balance": "Cr", "is_intercompany": True},
    {"code": "4500", "name": "IC Revenue", "type": "Revenue", "normal_balance": "Cr", "is_intercompany": True},
    {"code": "6500", "name": "IC Expense", "type": "Expense", "normal_balance": "Dr", "is_intercompany": True},
]


# ── Group CRUD ────────────────────────────────────────────────────────────────

def create_group(
    db: Session,
    name: str,
    description: str | None,
    fiscal_year_end: int,
    user: User,
) -> CompanyGroup:
    """Create a company group, seed IC CoA template entries, and add user's company as parent."""
    group = CompanyGroup(
        id=uuid.uuid4(),
        name=name,
        description=description,
        fiscal_year_end=fiscal_year_end,
        base_currency="NGN",
        created_by=user.id,
    )
    db.add(group)
    db.flush()

    # Seed default IC accounts in the group CoA template
    for seed in IC_ACCOUNT_SEEDS:
        entry = GroupCoATemplate(
            id=uuid.uuid4(),
            company_group_id=group.id,
            code=seed["code"],
            name=seed["name"],
            type=seed["type"],
            normal_balance=seed["normal_balance"],
            is_intercompany=seed["is_intercompany"],
        )
        db.add(entry)

    db.flush()

    # Auto-add the user's current company as the parent member
    company = (db.execute(
        select(Company).where(Company.id == user.company_id)
    )).scalar_one()
    company.company_group_id = group.id

    member = CompanyGroupMember(
        id=uuid.uuid4(),
        company_group_id=group.id,
        company_id=company.id,
        is_parent=True,
        ownership_pct=Decimal("100.00"),
    )
    db.add(member)
    db.flush()

    return group


def get_user_group(db: Session, user: User) -> CompanyGroup | None:
    """Return the CompanyGroup for the user's current company, or None."""
    company = (db.execute(
        select(Company).where(Company.id == user.company_id)
    )).scalar_one_or_none()
    if company is None or company.company_group_id is None:
        return None
    return (db.execute(
        select(CompanyGroup).where(CompanyGroup.id == company.company_group_id)
    )).scalar_one_or_none()


def update_group(
    db: Session,
    group_id: UUID,
    data: dict,
    user: User,
) -> CompanyGroup:
    group = (db.execute(
        select(CompanyGroup).where(CompanyGroup.id == group_id)
    )).scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    for field in ("name", "description", "fiscal_year_end"):
        if field in data and data[field] is not None:
            setattr(group, field, data[field])
    group.updated_by = user.id
    db.flush()
    return group


# ── Company membership ────────────────────────────────────────────────────────

def create_subsidiary(
    db: Session,
    group_id: UUID,
    name: str,
    entity_prefix: str | None,
    rc_number: str | None,
    ownership_pct: Decimal,
    user: User,
) -> tuple[Company, CompanyGroupMember]:
    """Create a brand-new company and add it to the group as a subsidiary."""
    # Check for duplicate name in the group
    existing_name = (db.execute(
        select(Company).where(
            Company.company_group_id == group_id,
            Company.name == name,
        )
    )).scalar_one_or_none()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A company named '{name}' already exists in this group",
        )

    # Check for duplicate entity prefix in the group
    if entity_prefix:
        existing_prefix = (db.execute(
            select(Company).where(
                Company.company_group_id == group_id,
                Company.entity_prefix == entity_prefix,
            )
        )).scalar_one_or_none()
        if existing_prefix:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Entity prefix '{entity_prefix}' is already used by '{existing_prefix.name}' in this group",
            )

    company = Company(
        id=uuid.uuid4(),
        name=name,
        entity_prefix=entity_prefix,
        rc_number=rc_number,
        company_group_id=group_id,
        created_by=user.id,
    )
    db.add(company)
    db.flush()

    member = CompanyGroupMember(
        id=uuid.uuid4(),
        company_group_id=group_id,
        company_id=company.id,
        is_parent=False,
        ownership_pct=ownership_pct,
    )
    db.add(member)

    # Create default roles and user membership for the acting user
    admin_role, _staff_role = _ensure_default_roles(db, company.id)
    membership = UserCompanyMembership(
        user_id=user.id,
        company_id=company.id,
        role="ADMIN",
        permissions=admin_role.permissions,
        group_id=admin_role.id,
        is_default=False,
    )
    db.add(membership)

    # Seed payroll defaults for the new company
    from app.services.payroll.settings import get_or_create_settings
    from app.services.payroll.types import seed_payroll_defaults
    get_or_create_settings(db, company.id)
    seed_payroll_defaults(db, company.id)

    db.flush()
    return company, member


def set_parent_company(
    db: Session,
    group_id: UUID,
    company_id: UUID,
) -> None:
    """Set a company as the parent/holding company. Clears is_parent from all others."""
    # Verify company is in the group
    member = (db.execute(
        select(CompanyGroupMember).where(
            CompanyGroupMember.company_group_id == group_id,
            CompanyGroupMember.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not in this group")

    # Clear is_parent on all members in the group
    all_members = (db.execute(
        select(CompanyGroupMember).where(CompanyGroupMember.company_group_id == group_id)
    )).scalars().all()
    for m in all_members:
        m.is_parent = (m.company_id == company_id)
    db.flush()


def update_company(
    db: Session,
    group_id: UUID,
    company_id: UUID,
    data: dict,
    user: User,
) -> Company:
    """Update a company's details. Company must be in the group."""
    # Validate company is in the group
    member = (db.execute(
        select(CompanyGroupMember).where(
            CompanyGroupMember.company_group_id == group_id,
            CompanyGroupMember.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not in this group")

    company = (db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one()

    for field in ("name", "entity_prefix", "rc_number", "tin", "vat_number", "entity_type"):
        if field in data and data[field] is not None:
            setattr(company, field, data[field])
    company.updated_by = user.id
    db.flush()
    return company


def add_company_to_group(
    db: Session,
    group_id: UUID,
    company_id: UUID,
    is_parent: bool,
    ownership_pct: Decimal,
    entity_prefix: str | None,
    user: User,
) -> CompanyGroupMember:
    """Add a company to the group. Creates memberships for the acting user in that company."""
    # Validate group exists
    group = (db.execute(
        select(CompanyGroup).where(CompanyGroup.id == group_id)
    )).scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Validate company exists
    company = (db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # SECURITY: Verify the acting user has a legitimate relationship with the target company.
    # A user can only add a company they already have membership in, OR a company with
    # no users (orphaned/newly created). This prevents hijacking other orgs' companies.
    user_has_membership = (db.execute(
        select(UserCompanyMembership).where(
            UserCompanyMembership.user_id == user.id,
            UserCompanyMembership.company_id == company_id,
        )
    )).scalar_one_or_none()
    company_has_users = (db.execute(
        select(User).where(User.company_id == company_id).limit(1)
    )).scalar_one_or_none()
    if not user_has_membership and company_has_users is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add a company you do not have access to",
        )

    # Check not already in a group
    if company.company_group_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company is already in a group",
        )

    # Check duplicate membership
    existing = (db.execute(
        select(CompanyGroupMember).where(
            CompanyGroupMember.company_group_id == group_id,
            CompanyGroupMember.company_id == company_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company already in this group")

    # Set group on company
    company.company_group_id = group_id
    if entity_prefix:
        company.entity_prefix = entity_prefix

    member = CompanyGroupMember(
        id=uuid.uuid4(),
        company_group_id=group_id,
        company_id=company_id,
        is_parent=is_parent,
        ownership_pct=ownership_pct,
    )
    db.add(member)

    # Ensure default roles exist in the target company
    admin_role, staff_role = _ensure_default_roles(db, company_id)

    # Create membership for the group accountant (acting user) in the target company
    existing_membership = (db.execute(
        select(UserCompanyMembership).where(
            UserCompanyMembership.user_id == user.id,
            UserCompanyMembership.company_id == company_id,
        )
    )).scalar_one_or_none()

    if not existing_membership:
        membership = UserCompanyMembership(
            user_id=user.id,
            company_id=company_id,
            role="ADMIN",
            permissions=admin_role.permissions,
            group_id=admin_role.id,
            is_default=False,
        )
        db.add(membership)

    db.flush()
    return member


def remove_company_from_group(
    db: Session,
    group_id: UUID,
    company_id: UUID,
) -> None:
    """Remove a company from the group. Checks for unresolved IC transactions first."""
    # Check for unresolved IC transactions
    pending = (db.execute(
        select(sa.func.count()).select_from(IntercompanyTransaction).where(
            IntercompanyTransaction.company_group_id == group_id,
            IntercompanyTransaction.status == "PENDING",
            sa.or_(
                IntercompanyTransaction.source_company_id == company_id,
                IntercompanyTransaction.target_company_id == company_id,
            ),
        )
    )).scalar() or 0

    if pending > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot remove: {pending} pending IC transaction(s) must be resolved first",
        )

    # Remove membership
    db.execute(
        delete(CompanyGroupMember).where(
            CompanyGroupMember.company_group_id == group_id,
            CompanyGroupMember.company_id == company_id,
        )
    )

    # Unset group on company
    company = (db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one_or_none()
    if company:
        company.company_group_id = None

    db.flush()


def list_group_companies(
    db: Session,
    group_id: UUID,
) -> list[dict]:
    """List all companies in a group with member details."""
    result = db.execute(
        select(CompanyGroupMember, Company)
        .join(Company, CompanyGroupMember.company_id == Company.id)
        .where(CompanyGroupMember.company_group_id == group_id)
        .order_by(CompanyGroupMember.is_parent.desc(), Company.name)
    )
    rows = result.all()
    return [
        {
            "id": str(m.Company.id),  # company_id as primary ID for the frontend
            "membership_id": str(m.CompanyGroupMember.id),
            "company_id": str(m.Company.id),
            "name": m.Company.name,
            "company_name": m.Company.name,
            "entity_prefix": m.Company.entity_prefix,
            "rc_number": m.Company.rc_number,
            "is_parent": m.CompanyGroupMember.is_parent,
            "role": "PARENT" if m.CompanyGroupMember.is_parent else "SUBSIDIARY",
            "ownership_pct": m.CompanyGroupMember.ownership_pct,
            "joined_at": m.CompanyGroupMember.joined_at,
        }
        for m in rows
    ]


# ── CoA mismatch check & fix ─────────────────────────────────────────────────

def check_coa_mismatches(
    db: Session,
    group_id: UUID,
    company_id: UUID,
) -> dict:
    """Compare company's chart of accounts against the group CoA template."""
    # Get template entries
    template_rows = (db.execute(
        select(GroupCoATemplate).where(GroupCoATemplate.company_group_id == group_id)
    )).scalars().all()

    # Get company accounts
    company_rows = (db.execute(
        select(Account).where(Account.company_id == company_id)
    )).scalars().all()

    company_map = {a.code: a for a in company_rows}
    matching = 0
    missing = []
    conflicts = []

    for tmpl in template_rows:
        acct = company_map.get(tmpl.code)
        if acct is None:
            missing.append({
                "code": tmpl.code,
                "name": tmpl.name,
                "type": tmpl.type,
                "normal_balance": tmpl.normal_balance,
            })
        elif acct.name != tmpl.name or acct.type != tmpl.type:
            conflicts.append({
                "code": tmpl.code,
                "template_name": tmpl.name,
                "template_type": tmpl.type,
                "company_name": acct.name,
                "company_type": acct.type,
            })
        else:
            matching += 1

    return {"matching": matching, "missing": missing, "conflicts": conflicts}


def add_missing_accounts(
    db: Session,
    group_id: UUID,
    company_id: UUID,
) -> int:
    """Copy missing template accounts into the company. Returns count added."""
    mismatches = check_coa_mismatches(db, group_id, company_id)
    added = 0
    for entry in mismatches["missing"]:
        acct = Account(
            id=uuid.uuid4(),
            company_id=company_id,
            code=entry["code"],
            name=entry["name"],
            type=entry["type"],
            normal_balance=entry["normal_balance"],
        )
        db.add(acct)
        added += 1
    db.flush()
    return added


# ── Group dashboard ───────────────────────────────────────────────────────────

def get_group_dashboard(
    db: Session,
    group_id: UUID,
    year: int,
) -> dict:
    """Aggregate revenue/expenses across all group companies for the dashboard."""
    # Get company IDs in this group
    members = (db.execute(
        select(CompanyGroupMember.company_id, Company.name)
        .join(Company, CompanyGroupMember.company_id == Company.id)
        .where(CompanyGroupMember.company_group_id == group_id)
    )).all()

    if not members:
        return {
            "group_revenue": Decimal(0),
            "group_expenses": Decimal(0),
            "group_net_profit": Decimal(0),
            "ic_balance": Decimal(0),
            "subsidiaries": [],
            "pending_ic_count": 0,
            "pending_ic_total": Decimal(0),
        }

    cids = [m.company_id for m in members]
    cid_names = {m.company_id: m.name for m in members}

    # Revenue per company
    rev_result = db.execute(
        sa.text("""
            SELECT company_id, COALESCE(SUM(amount), 0) AS total
            FROM revenue_transactions
            WHERE company_id = ANY(:cids) AND is_voided = false AND fiscal_year = :year
            GROUP BY company_id
        """),
        {"cids": cids, "year": year},
    )
    rev_by_company = {row.company_id: Decimal(str(row.total)) for row in rev_result}

    # Expense per company
    exp_result = db.execute(
        sa.text("""
            SELECT company_id, COALESCE(SUM(amount), 0) AS total
            FROM expense_transactions
            WHERE company_id = ANY(:cids) AND is_voided = false AND fiscal_year = :year
            GROUP BY company_id
        """),
        {"cids": cids, "year": year},
    )
    exp_by_company = {row.company_id: Decimal(str(row.total)) for row in exp_result}

    # Pending IC transactions
    ic_pending = db.execute(
        sa.text("""
            SELECT COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total
            FROM intercompany_transactions
            WHERE company_group_id = :gid AND status = 'PENDING' AND fiscal_year = :year
        """),
        {"gid": group_id, "year": year},
    )
    ic_row = ic_pending.one()

    # Total IC balance (confirmed, not eliminated)
    ic_bal_result = db.execute(
        sa.text("""
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM intercompany_transactions
            WHERE company_group_id = :gid AND status = 'CONFIRMED' AND fiscal_year = :year
        """),
        {"gid": group_id, "year": year},
    )
    ic_balance = Decimal(str(ic_bal_result.scalar_one() or 0))

    # Build subsidiary list
    group_revenue = Decimal(0)
    group_expenses = Decimal(0)
    subsidiaries = []
    for cid in cids:
        rev = rev_by_company.get(cid, Decimal(0))
        exp = exp_by_company.get(cid, Decimal(0))
        group_revenue += rev
        group_expenses += exp
        subsidiaries.append({
            "company_id": str(cid),
            "company_name": cid_names[cid],
            "revenue": rev,
            "expenses": exp,
            "net_profit": rev - exp,
        })

    return {
        "group_revenue": group_revenue,
        "group_expenses": group_expenses,
        "group_net_profit": group_revenue - group_expenses,
        "ic_balance": ic_balance,
        "subsidiaries": subsidiaries,
        "pending_ic_count": int(ic_row.cnt),
        "pending_ic_total": Decimal(str(ic_row.total)),
    }


# ── Allocation rules CRUD ────────────────────────────────────────────────────

def create_allocation_rule(
    db: Session,
    group_id: UUID,
    name: str,
    description: str | None,
    allocation_type: str,
    lines: list[dict],
    user: User,
) -> AllocationRule:
    """Create an allocation rule. SUM(percentages) must equal 100.00."""
    total_pct = sum(Decimal(str(ln["percentage"])) for ln in lines)
    if abs(total_pct - Decimal("100.00")) > Decimal("0.01"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Allocation percentages must sum to 100.00 (got {total_pct})",
        )

    # Validate all companies are in the group
    for ln in lines:
        member = (db.execute(
            select(CompanyGroupMember).where(
                CompanyGroupMember.company_group_id == group_id,
                CompanyGroupMember.company_id == ln["company_id"],
            )
        )).scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Company {ln['company_id']} is not in this group",
            )

    rule = AllocationRule(
        id=uuid.uuid4(),
        company_group_id=group_id,
        name=name,
        description=description,
        allocation_type=allocation_type,
        created_by=user.id,
    )
    db.add(rule)
    db.flush()

    for ln in lines:
        line = AllocationRuleLine(
            id=uuid.uuid4(),
            rule_id=rule.id,
            company_id=ln["company_id"],
            percentage=Decimal(str(ln["percentage"])),
        )
        db.add(line)

    db.flush()
    return rule


def list_allocation_rules(
    db: Session,
    group_id: UUID,
) -> list[dict]:
    """List all allocation rules with their lines and company names."""
    rules = (db.execute(
        select(AllocationRule)
        .where(AllocationRule.company_group_id == group_id)
        .order_by(AllocationRule.name)
    )).scalars().all()

    result = []
    for rule in rules:
        lines_result = db.execute(
            select(AllocationRuleLine, Company)
            .join(Company, AllocationRuleLine.company_id == Company.id)
            .where(AllocationRuleLine.rule_id == rule.id)
            .order_by(AllocationRuleLine.percentage.desc())
        )
        lines = [
            {
                "id": str(ln.AllocationRuleLine.id),
                "company_id": str(ln.AllocationRuleLine.company_id),
                "company_name": ln.Company.name,
                "percentage": ln.AllocationRuleLine.percentage,
            }
            for ln in lines_result.all()
        ]
        result.append({
            "id": str(rule.id),
            "name": rule.name,
            "description": rule.description,
            "allocation_type": rule.allocation_type,
            "is_active": rule.is_active,
            "lines": lines,
        })
    return result


def update_allocation_rule(
    db: Session,
    group_id: UUID,
    rule_id: UUID,
    name: str | None,
    description: str | None,
    allocation_type: str | None,
    lines: list[dict] | None,
    user: User,
) -> AllocationRule:
    """Update an allocation rule. If lines are provided, replace all lines."""
    rule = (db.execute(
        select(AllocationRule).where(
            AllocationRule.id == rule_id,
            AllocationRule.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")

    if name is not None:
        rule.name = name
    if description is not None:
        rule.description = description
    if allocation_type is not None:
        rule.allocation_type = allocation_type

    if lines is not None:
        total_pct = sum(Decimal(str(ln["percentage"])) for ln in lines)
        if abs(total_pct - Decimal("100.00")) > Decimal("0.01"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Allocation percentages must sum to 100.00 (got {total_pct})",
            )
        # Delete existing lines and recreate
        db.execute(
            delete(AllocationRuleLine).where(AllocationRuleLine.rule_id == rule_id)
        )
        for ln in lines:
            line = AllocationRuleLine(
                id=uuid.uuid4(),
                rule_id=rule.id,
                company_id=ln["company_id"],
                percentage=Decimal(str(ln["percentage"])),
            )
            db.add(line)

    db.flush()
    return rule


def delete_allocation_rule(
    db: Session,
    group_id: UUID,
    rule_id: UUID,
) -> None:
    """Delete an allocation rule and its lines."""
    rule = (db.execute(
        select(AllocationRule).where(
            AllocationRule.id == rule_id,
            AllocationRule.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found")

    db.execute(
        delete(AllocationRuleLine).where(AllocationRuleLine.rule_id == rule_id)
    )
    db.execute(
        delete(AllocationRule).where(AllocationRule.id == rule_id)
    )
    db.flush()


# ── CoA template CRUD ─────────────────────────────────────────────────────────

def list_coa_template(
    db: Session,
    group_id: UUID,
) -> list[GroupCoATemplate]:
    """List all CoA template entries for a group."""
    result = db.execute(
        select(GroupCoATemplate)
        .where(GroupCoATemplate.company_group_id == group_id)
        .order_by(GroupCoATemplate.code)
    )
    return list(result.scalars().all())


def create_coa_template_entry(
    db: Session,
    group_id: UUID,
    data: dict,
) -> GroupCoATemplate:
    """Add a new entry to the group CoA template."""
    # Check for duplicate code
    existing = (db.execute(
        select(GroupCoATemplate).where(
            GroupCoATemplate.company_group_id == group_id,
            GroupCoATemplate.code == data["code"],
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template entry with code '{data['code']}' already exists",
        )

    entry = GroupCoATemplate(
        id=uuid.uuid4(),
        company_group_id=group_id,
        code=data["code"],
        name=data["name"],
        type=data["type"],
        normal_balance=data["normal_balance"],
        description=data.get("description"),
        is_intercompany=data.get("is_intercompany", False),
        cost_centre=data.get("cost_centre"),
    )
    db.add(entry)
    db.flush()
    return entry


def update_coa_template_entry(
    db: Session,
    group_id: UUID,
    entry_id: UUID,
    data: dict,
) -> GroupCoATemplate:
    """Update a CoA template entry."""
    entry = (db.execute(
        select(GroupCoATemplate).where(
            GroupCoATemplate.id == entry_id,
            GroupCoATemplate.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template entry not found")

    for field in ("code", "name", "type", "normal_balance", "description", "is_intercompany", "cost_centre"):
        if field in data:
            setattr(entry, field, data[field])
    db.flush()
    return entry


def delete_coa_template_entry(
    db: Session,
    group_id: UUID,
    entry_id: UUID,
) -> None:
    """Delete a CoA template entry."""
    entry = (db.execute(
        select(GroupCoATemplate).where(
            GroupCoATemplate.id == entry_id,
            GroupCoATemplate.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template entry not found")

    db.execute(
        delete(GroupCoATemplate).where(GroupCoATemplate.id == entry_id)
    )
    db.flush()


# ── Group user management ────────────────────────────────────────────────────

def list_group_users(db: Session, group_id: UUID) -> list[dict]:
    """List all users who have access to any company in the group."""
    group_companies = list_group_companies(db, group_id)
    company_ids = [UUID(c["id"]) for c in group_companies]

    if not company_ids:
        return []

    result = db.execute(
        select(UserCompanyMembership, User, Company)
        .join(User, UserCompanyMembership.user_id == User.id)
        .join(Company, UserCompanyMembership.company_id == Company.id)
        .where(UserCompanyMembership.company_id.in_(company_ids))
        .order_by(User.full_name, Company.name)
    )
    rows = result.all()

    users_map: dict[str, dict] = {}
    for row in rows:
        uid = str(row.User.id)
        if uid not in users_map:
            users_map[uid] = {
                "id": uid,
                "email": row.User.email,
                "full_name": row.User.full_name,
                "role": row.User.role,
                "is_active": row.User.is_active,
                "memberships": [],
            }
        users_map[uid]["memberships"].append({
            "membership_id": str(row.UserCompanyMembership.id),
            "company_id": str(row.UserCompanyMembership.company_id),
            "company_name": row.Company.name,
            "entity_prefix": row.Company.entity_prefix,
            "role": row.UserCompanyMembership.role,
            "is_default": row.UserCompanyMembership.is_default,
        })

    return list(users_map.values())


def update_user_access(
    db: Session,
    group_id: UUID,
    user_id: UUID,
    memberships: list,
) -> None:
    """Update which subsidiaries a user can access and their role in each."""
    from app.utils.permissions import ALL_READ, ALL_WRITE

    group_companies = list_group_companies(db, group_id)
    valid_company_ids = {UUID(c["id"]) for c in group_companies}

    # Validate all company_ids are in the group
    for m in memberships:
        if m.company_id not in valid_company_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Company {m.company_id} is not in this group",
            )

    # Exactly one default
    defaults = [m for m in memberships if m.is_default]
    if len(defaults) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Exactly one company must be marked as default",
        )

    # Delete existing memberships for this user in group companies
    existing = (db.execute(
        select(UserCompanyMembership).where(
            UserCompanyMembership.user_id == user_id,
            UserCompanyMembership.company_id.in_(valid_company_ids),
        )
    )).scalars().all()
    for e in existing:
        db.delete(e)
    db.flush()

    # Create new memberships
    for m in memberships:
        admin_role, staff_role = _ensure_default_roles(db, m.company_id)
        if m.role == "VIEWER":
            perms = dict(ALL_READ)
            group_obj = staff_role
        else:
            perms = dict(ALL_WRITE)
            group_obj = admin_role

        membership = UserCompanyMembership(
            user_id=user_id,
            company_id=m.company_id,
            role=m.role,
            permissions=perms,
            group_id=group_obj.id,
            is_default=m.is_default,
        )
        db.add(membership)
    db.flush()


# ── Add user to company in group ──────────────────────────────────────────────

def add_user_to_company(
    db: Session,
    group_id: UUID,
    company_id: UUID,
    user_id: UUID,
    role: str,
) -> UserCompanyMembership:
    """Add a user to a company within the group."""
    # Validate company is in the group
    member = (db.execute(
        select(CompanyGroupMember).where(
            CompanyGroupMember.company_group_id == group_id,
            CompanyGroupMember.company_id == company_id,
        )
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not in this group")

    # Validate target user exists
    target_user = (db.execute(
        select(User).where(User.id == user_id)
    )).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check not already a member
    existing = (db.execute(
        select(UserCompanyMembership).where(
            UserCompanyMembership.user_id == user_id,
            UserCompanyMembership.company_id == company_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already has access to this company")

    # Get the appropriate role group
    admin_role, staff_role = _ensure_default_roles(db, company_id)
    group_obj = admin_role if role in ("SUPER_ADMIN", "ADMIN") else staff_role

    membership = UserCompanyMembership(
        user_id=user_id,
        company_id=company_id,
        role=role,
        permissions=group_obj.permissions,
        group_id=group_obj.id,
        is_default=False,
    )
    db.add(membership)
    db.flush()
    return membership
