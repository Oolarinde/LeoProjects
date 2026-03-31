"""Service layer for Intercompany Transactions — create, confirm, void, list, balances."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.models.account import Account
from app.models.allocation_rule import AllocationRule, AllocationRuleLine
from app.models.company import Company
from app.models.company_group import CompanyGroupMember
from app.models.expense_transaction import ExpenseTransaction
from app.models.intercompany_transaction import IntercompanyTransaction
from app.models.revenue_transaction import RevenueTransaction
from app.models.user import User
from app.services.audit import log_action


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_ic_account(db: Session, company_id: UUID, code: str) -> Account:
    """Lookup an IC account by code in a company's chart of accounts."""
    acct = (db.execute(
        select(Account).where(
            Account.company_id == company_id,
            Account.code == code,
        )
    )).scalar_one_or_none()
    if acct is None:
        company = (db.execute(
            select(Company).where(Company.id == company_id)
        )).scalar_one()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"IC account {code} not found in {company.name}'s chart of accounts. Run CoA fix first.",
        )
    return acct


def _validate_companies_in_group(
    db: Session,
    group_id: UUID,
    source_company_id: UUID,
    target_company_id: UUID,
) -> None:
    """Ensure both companies belong to the same group."""
    if source_company_id == target_company_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Source and target company must be different",
        )
    for cid, label in [(source_company_id, "Source"), (target_company_id, "Target")]:
        member = (db.execute(
            select(CompanyGroupMember).where(
                CompanyGroupMember.company_group_id == group_id,
                CompanyGroupMember.company_id == cid,
            )
        )).scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{label} company is not in this group",
            )


def _create_mirror_entries(
    db: Session,
    ic_txn: IntercompanyTransaction,
    user: User,
) -> None:
    """Create FULL double-entry mirror entries in both companies' books.

    SOURCE company (two entries, must balance):
      - DR IC Expense (6500)     — cost recharge out
      - CR IC Payable (2500)     — liability owed to target

    TARGET company (two entries, must balance):
      - DR IC Receivable (1500)  — asset owed by source
      - CR IC Revenue (4500)     — income from recharge

    This produces 4 ledger entries total (2 per company), ensuring each
    company's standalone Trial Balance remains balanced.
    """
    source_cid = ic_txn.source_company_id
    target_cid = ic_txn.target_company_id
    ref_no = ic_txn.reference_no or f"IC-{str(ic_txn.id)[:8]}"
    desc = f"IC: {ic_txn.description or ic_txn.transaction_type}"

    # Lookup all 4 IC accounts
    source_expense_acct = _get_ic_account(db, source_cid, "6500")  # DR
    source_payable_acct = _get_ic_account(db, source_cid, "2500")  # CR
    target_receivable_acct = _get_ic_account(db, target_cid, "1500")  # DR
    target_revenue_acct = _get_ic_account(db, target_cid, "4500")  # CR

    # ── SOURCE company: DR IC Expense (6500) ─────────────────────────
    source_expense = ExpenseTransaction(
        id=uuid.uuid4(),
        company_id=source_cid,
        account_id=source_expense_acct.id,
        category="Intercompany",
        date=ic_txn.date,
        fiscal_year=ic_txn.fiscal_year,
        amount=ic_txn.amount,
        payment_method="IC Transfer",
        reference_no=ref_no,
        description=desc,
        vendor_name="Intercompany",
        created_by=user.id,
    )
    db.add(source_expense)

    # ── SOURCE company: CR IC Payable (2500) ─────────────────────────
    # Recorded as a revenue entry on the liability account (credit side)
    # to properly record the payable in the source company's books
    source_location_result = db.execute(
        sa.text("SELECT id FROM locations WHERE company_id = :cid LIMIT 1"),
        {"cid": source_cid},
    )
    source_loc_row = source_location_result.first()
    source_location_id = source_loc_row.id if source_loc_row else None

    source_payable = RevenueTransaction(
        id=uuid.uuid4(),
        company_id=source_cid,
        location_id=source_location_id,
        account_id=source_payable_acct.id,
        date=ic_txn.date,
        fiscal_year=ic_txn.fiscal_year,
        amount=ic_txn.amount,
        payment_method="IC Transfer",
        reference_no=ref_no,
        description=f"{desc} [IC Payable]",
        tenant_name="Intercompany",
        created_by=user.id,
        is_deposit=True,  # liability, not earned revenue
    )
    db.add(source_payable)

    # ── TARGET company: DR IC Receivable (1500) ──────────────────────
    # Recorded as an expense entry on the asset account (debit side)
    target_receivable = ExpenseTransaction(
        id=uuid.uuid4(),
        company_id=target_cid,
        account_id=target_receivable_acct.id,
        category="Intercompany",
        date=ic_txn.date,
        fiscal_year=ic_txn.fiscal_year,
        amount=ic_txn.amount,
        payment_method="IC Transfer",
        reference_no=ref_no,
        description=f"{desc} [IC Receivable]",
        vendor_name="Intercompany",
        created_by=user.id,
    )
    db.add(target_receivable)

    # ── TARGET company: CR IC Revenue (4500) ─────────────────────────
    target_location_result = db.execute(
        sa.text("SELECT id FROM locations WHERE company_id = :cid LIMIT 1"),
        {"cid": target_cid},
    )
    target_loc_row = target_location_result.first()
    target_location_id = target_loc_row.id if target_loc_row else None

    target_revenue = RevenueTransaction(
        id=uuid.uuid4(),
        company_id=target_cid,
        location_id=target_location_id,
        account_id=target_revenue_acct.id,
        date=ic_txn.date,
        fiscal_year=ic_txn.fiscal_year,
        amount=ic_txn.amount,
        payment_method="IC Transfer",
        reference_no=ref_no,
        description=desc,
        tenant_name="Intercompany",
        created_by=user.id,
    )
    db.add(target_revenue)
    db.flush()

    # Link all 4 entries back to the IC transaction
    ic_txn.source_expense_id = source_expense.id      # DR 6500
    ic_txn.source_revenue_id = source_payable.id       # CR 2500
    ic_txn.target_expense_id = target_receivable.id    # DR 1500
    ic_txn.target_revenue_id = target_revenue.id       # CR 4500
    db.flush()


# ── Create IC transaction ─────────────────────────────────────────────────────

def create_ic_transaction(
    db: Session,
    group_id: UUID,
    data,  # IcTransactionCreate
    user: User,
) -> IntercompanyTransaction:
    """Create an IC transaction and auto-generate mirror entries in both companies."""
    _validate_companies_in_group(db, group_id, data.source_company_id, data.target_company_id)

    ic_txn = IntercompanyTransaction(
        id=uuid.uuid4(),
        company_group_id=group_id,
        source_company_id=data.source_company_id,
        target_company_id=data.target_company_id,
        transaction_type=data.transaction_type,
        date=data.date,
        fiscal_year=data.date.year,
        amount=data.amount,
        description=data.description,
        reference_no=data.reference_no,
        status="PENDING",
        created_by=user.id,
    )
    db.add(ic_txn)
    db.flush()

    # Create mirror entries in both company books
    _create_mirror_entries(db, ic_txn, user)

    # Audit trail
    log_action(
        db,
        company_id=ic_txn.source_company_id,
        table_name="intercompany_transactions",
        record_id=ic_txn.id,
        action="ic_create",
        user_id=user.id,
        changed_fields={"type": ic_txn.transaction_type, "amount": str(ic_txn.amount)},
    )

    return ic_txn


def create_allocated_ic_transaction(
    db: Session,
    group_id: UUID,
    allocation_rule_id: UUID,
    data,  # IcTransactionCreate — source is the payer, target is ignored (derived from rule)
    user: User,
) -> list[IntercompanyTransaction]:
    """Split a shared expense using an allocation rule.
    Creates one IC transaction per target company with proportional amounts.
    """
    rule = (db.execute(
        select(AllocationRule).where(
            AllocationRule.id == allocation_rule_id,
            AllocationRule.company_group_id == group_id,
            AllocationRule.is_active == True,
        )
    )).scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation rule not found or inactive")

    lines = (db.execute(
        select(AllocationRuleLine).where(AllocationRuleLine.rule_id == rule.id)
    )).scalars().all()

    if not lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Allocation rule has no lines",
        )

    transactions = []
    total_amount = data.amount

    # Compute allocated amounts for non-source companies
    target_lines = [l for l in lines if l.company_id != data.source_company_id]
    if not target_lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No target companies in allocation rule (source company is the only member)",
        )

    # Calculate each target's share, then reconcile rounding
    allocated_amounts: list[tuple] = []  # (line, amount)
    running_total = Decimal("0")
    for i, line in enumerate(target_lines):
        if i < len(target_lines) - 1:
            # Normal calculation for all but the last
            amt = (total_amount * line.percentage / Decimal("100")).quantize(Decimal("0.01"))
        else:
            # Last line gets the remainder to ensure exact total
            source_pct = Decimal("0")
            for l in lines:
                if l.company_id == data.source_company_id:
                    source_pct = l.percentage
                    break
            expected_total = (total_amount * (Decimal("100") - source_pct) / Decimal("100")).quantize(Decimal("0.01"))
            amt = expected_total - running_total
        running_total += amt
        if amt > 0:
            allocated_amounts.append((line, amt))

    for line, allocated_amount in allocated_amounts:
        _validate_companies_in_group(db, group_id, data.source_company_id, line.company_id)

        ic_txn = IntercompanyTransaction(
            id=uuid.uuid4(),
            company_group_id=group_id,
            source_company_id=data.source_company_id,
            target_company_id=line.company_id,
            transaction_type="SHARED_EXPENSE",
            date=data.date,
            fiscal_year=data.date.year,
            amount=allocated_amount,
            description=f"Allocated: {data.description or 'Shared expense'} ({line.percentage}%)",
            reference_no=data.reference_no,
            status="PENDING",
            created_by=user.id,
        )
        db.add(ic_txn)
        db.flush()

        _create_mirror_entries(db, ic_txn, user)
        transactions.append(ic_txn)

    return transactions


# ── Confirm / Void ────────────────────────────────────────────────────────────

def confirm_ic_transaction(
    db: Session,
    group_id: UUID,
    ic_id: UUID,
    user: User,
) -> IntercompanyTransaction:
    """Move IC transaction from PENDING to CONFIRMED."""
    ic_txn = (db.execute(
        select(IntercompanyTransaction).where(
            IntercompanyTransaction.id == ic_id,
            IntercompanyTransaction.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if ic_txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IC transaction not found")
    if ic_txn.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm transaction in '{ic_txn.status}' status",
        )

    ic_txn.status = "CONFIRMED"
    ic_txn.confirmed_by = user.id
    ic_txn.confirmed_at = datetime.now(timezone.utc)
    db.flush()

    log_action(
        db,
        company_id=ic_txn.source_company_id,
        table_name="intercompany_transactions",
        record_id=ic_txn.id,
        action="ic_confirm",
        user_id=user.id,
    )

    return ic_txn


def void_ic_transaction(
    db: Session,
    group_id: UUID,
    ic_id: UUID,
    reason: str,
    user: User,
) -> IntercompanyTransaction:
    """Void an IC transaction and its linked mirror entries."""
    ic_txn = (db.execute(
        select(IntercompanyTransaction).where(
            IntercompanyTransaction.id == ic_id,
            IntercompanyTransaction.company_group_id == group_id,
        )
    )).scalar_one_or_none()
    if ic_txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IC transaction not found")
    if ic_txn.status == "VOIDED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction already voided")

    now = datetime.now(timezone.utc)
    ic_txn.status = "VOIDED"
    ic_txn.voided_by = user.id
    ic_txn.voided_at = now
    ic_txn.void_reason = reason

    # Void linked mirror entries
    if ic_txn.source_expense_id:
        source_exp = (db.execute(
            select(ExpenseTransaction).where(ExpenseTransaction.id == ic_txn.source_expense_id)
        )).scalar_one_or_none()
        if source_exp and not source_exp.is_voided:
            source_exp.is_voided = True
            source_exp.void_reason = f"IC voided: {reason}"
            source_exp.voided_by = user.id
            source_exp.voided_at = now

    if ic_txn.source_revenue_id:
        source_rev = (db.execute(
            select(RevenueTransaction).where(RevenueTransaction.id == ic_txn.source_revenue_id)
        )).scalar_one_or_none()
        if source_rev and not source_rev.is_voided:
            source_rev.is_voided = True
            source_rev.void_reason = f"IC voided: {reason}"
            source_rev.voided_by = user.id
            source_rev.voided_at = now

    if ic_txn.target_expense_id:
        target_exp = (db.execute(
            select(ExpenseTransaction).where(ExpenseTransaction.id == ic_txn.target_expense_id)
        )).scalar_one_or_none()
        if target_exp and not target_exp.is_voided:
            target_exp.is_voided = True
            target_exp.void_reason = f"IC voided: {reason}"
            target_exp.voided_by = user.id
            target_exp.voided_at = now

    if ic_txn.target_revenue_id:
        target_rev = (db.execute(
            select(RevenueTransaction).where(RevenueTransaction.id == ic_txn.target_revenue_id)
        )).scalar_one_or_none()
        if target_rev and not target_rev.is_voided:
            target_rev.is_voided = True
            target_rev.void_reason = f"IC voided: {reason}"
            target_rev.voided_by = user.id
            target_rev.voided_at = now

    db.flush()

    log_action(
        db,
        company_id=ic_txn.source_company_id,
        table_name="intercompany_transactions",
        record_id=ic_txn.id,
        action="ic_void",
        user_id=user.id,
        changed_fields={"reason": reason},
    )

    return ic_txn


# ── List / query ──────────────────────────────────────────────────────────────

def list_ic_transactions(
    db: Session,
    group_id: UUID,
    year: int,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """List IC transactions with company names, paginated."""
    # Count
    count_result = db.execute(
        sa.text("""
            SELECT COUNT(*) FROM intercompany_transactions
            WHERE company_group_id = :gid AND fiscal_year = :year
        """),
        {"gid": group_id, "year": year},
    )
    total = count_result.scalar_one() or 0

    # Items
    result = db.execute(
        sa.text("""
            SELECT
                ic.id, ic.company_group_id,
                ic.source_company_id, sc.name AS source_company_name,
                ic.target_company_id, tc.name AS target_company_name,
                ic.transaction_type, ic.date, ic.fiscal_year, ic.amount,
                ic.description, ic.reference_no, ic.status,
                ic.created_at, ic.created_by, ic.confirmed_by, ic.confirmed_at
            FROM intercompany_transactions ic
            JOIN companies sc ON ic.source_company_id = sc.id
            JOIN companies tc ON ic.target_company_id = tc.id
            WHERE ic.company_group_id = :gid AND ic.fiscal_year = :year
            ORDER BY ic.created_at DESC
            LIMIT :lim OFFSET :off
        """),
        {"gid": group_id, "year": year, "lim": limit, "off": offset},
    )

    items = []
    for row in result:
        items.append({
            "id": str(row.id),
            "company_group_id": str(row.company_group_id),
            "source_company_id": str(row.source_company_id),
            "source_company_name": row.source_company_name,
            "target_company_id": str(row.target_company_id),
            "target_company_name": row.target_company_name,
            "transaction_type": row.transaction_type,
            "date": row.date.isoformat() if row.date else None,
            "fiscal_year": row.fiscal_year,
            "amount": Decimal(str(row.amount)),
            "description": row.description,
            "reference_no": row.reference_no,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "created_by": str(row.created_by) if row.created_by else None,
            "confirmed_by": str(row.confirmed_by) if row.confirmed_by else None,
            "confirmed_at": row.confirmed_at.isoformat() if row.confirmed_at else None,
        })

    return items, total


def get_ic_balances(
    db: Session,
    group_id: UUID,
    year: int,
) -> list[dict]:
    """Net balances between company pairs for a given year.
    Positive = source owes target.
    """
    result = db.execute(
        sa.text("""
            SELECT
                ic.source_company_id, sc.name AS source_company_name,
                ic.target_company_id, tc.name AS target_company_name,
                SUM(
                    CASE WHEN ic.status IN ('PENDING', 'CONFIRMED') THEN ic.amount ELSE 0 END
                ) AS net_balance
            FROM intercompany_transactions ic
            JOIN companies sc ON ic.source_company_id = sc.id
            JOIN companies tc ON ic.target_company_id = tc.id
            WHERE ic.company_group_id = :gid
              AND ic.fiscal_year = :year
              AND ic.status != 'VOIDED'
            GROUP BY ic.source_company_id, sc.name, ic.target_company_id, tc.name
            HAVING SUM(
                CASE WHEN ic.status IN ('PENDING', 'CONFIRMED') THEN ic.amount ELSE 0 END
            ) != 0
            ORDER BY sc.name, tc.name
        """),
        {"gid": group_id, "year": year},
    )

    return [
        {
            "source_company_id": str(row.source_company_id),
            "source_company_name": row.source_company_name,
            "target_company_id": str(row.target_company_id),
            "target_company_name": row.target_company_name,
            "net_balance": Decimal(str(row.net_balance)),
        }
        for row in result
    ]
