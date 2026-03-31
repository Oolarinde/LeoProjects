"""Service layer for consolidated financial reports — P&L, Balance Sheet, Trial Balance."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.models.company_group import CompanyGroupMember
from app.models.company import Company
from sqlalchemy import select


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_group_company_ids(db: Session, group_id: UUID) -> list[dict]:
    """Return list of {id, name} for all companies in the group."""
    result = db.execute(
        select(CompanyGroupMember.company_id, Company.name)
        .join(Company, CompanyGroupMember.company_id == Company.id)
        .where(CompanyGroupMember.company_group_id == group_id)
        .order_by(Company.name)
    )
    return [{"id": row.company_id, "name": row.name} for row in result.all()]


def _to_dec(val) -> Decimal:
    if val is None:
        return Decimal(0)
    return Decimal(str(val))


# ── Consolidated P&L ─────────────────────────────────────────────────────────

def get_consolidated_pnl(
    db: Session,
    group_id: UUID,
    year: int,
) -> dict:
    """Consolidated P&L across all group companies with IC elimination column.

    Returns:
        companies: [{id, name}]
        revenue_lines: [{code, name, amounts: {company_id: Decimal}, elimination, group_total}]
        expense_lines: same structure
        totals: {total_revenue, total_expenses, net_profit, per company + elimination}
    """
    companies = get_group_company_ids(db, group_id)
    if not companies:
        return {"companies": [], "revenue_lines": [], "expense_lines": [],
                "totals": {"total_revenue": Decimal(0), "total_expenses": Decimal(0), "net_profit": Decimal(0)}}

    cids = [c["id"] for c in companies]

    # Revenue by account and company
    rev_result = db.execute(
        sa.text("""
            SELECT a.code, a.name, r.company_id,
                   COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = ANY(:cids)
              AND r.is_voided = false
              AND r.is_deposit = false
              AND r.fiscal_year = :year
            GROUP BY a.code, a.name, r.company_id
            ORDER BY a.code
        """),
        {"cids": cids, "year": year},
    )

    # Build revenue map: (code, name) -> {company_id: amount}
    rev_map: dict[tuple, dict] = {}
    for row in rev_result:
        key = (row.code, row.name)
        if key not in rev_map:
            rev_map[key] = {}
        rev_map[key][row.company_id] = _to_dec(row.total)

    # Expenses by account and company
    exp_result = db.execute(
        sa.text("""
            SELECT a.code, a.name, e.company_id,
                   COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            JOIN accounts a ON e.account_id = a.id
            WHERE e.company_id = ANY(:cids)
              AND e.is_voided = false
              AND e.fiscal_year = :year
            GROUP BY a.code, a.name, e.company_id
            ORDER BY a.code
        """),
        {"cids": cids, "year": year},
    )

    exp_map: dict[tuple, dict] = {}
    for row in exp_result:
        key = (row.code, row.name)
        if key not in exp_map:
            exp_map[key] = {}
        exp_map[key][row.company_id] = _to_dec(row.total)

    # IC eliminations from confirmed intercompany transactions
    # Revenue elimination: IC Revenue (4500) in target company
    # Expense elimination: IC Expense (6500) in source company
    ic_elim_result = db.execute(
        sa.text("""
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM intercompany_transactions
            WHERE company_group_id = :gid
              AND fiscal_year = :year
              AND status = 'CONFIRMED'
        """),
        {"gid": group_id, "year": year},
    )
    ic_elimination_total = _to_dec(ic_elim_result.scalar_one())

    # Consolidation adjustments
    adj_result = db.execute(
        sa.text("""
            SELECT account_code, debit_amount, credit_amount
            FROM consolidation_adjustments
            WHERE company_group_id = :gid AND fiscal_year = :year
              AND is_voided = false
        """),
        {"gid": group_id, "year": year},
    )
    adjustments_by_code: dict[str, Decimal] = {}
    for row in adj_result:
        code = row.account_code
        # Net adjustment: positive = debit, negative = credit
        net = _to_dec(row.debit_amount) - _to_dec(row.credit_amount)
        adjustments_by_code[code] = adjustments_by_code.get(code, Decimal(0)) + net

    # Build response lines
    def build_lines(acct_map: dict[tuple, dict], is_expense: bool) -> list[dict]:
        lines = []
        for (code, name), amounts in sorted(acct_map.items()):
            elimination = Decimal(0)
            # All IC accounts get eliminated (1500, 2500, 4500, 6500)
            if code in ("1500", "2500", "4500", "6500"):
                elimination = -sum(amounts.values())

            # Apply manual adjustments
            adj = adjustments_by_code.get(code, Decimal(0))
            if is_expense:
                # For expenses: debit adjustment increases expense
                elimination += adj
            else:
                # For revenue: credit adjustment increases revenue, debit decreases
                elimination -= adj

            company_total = sum(amounts.values())
            group_total = company_total + elimination

            line = {
                "code": code,
                "name": name,
                "amounts": {str(cid): amounts.get(cid, Decimal(0)) for cid in cids},
                "elimination": elimination,
                "group_total": group_total,
            }
            lines.append(line)
        return lines

    revenue_lines = build_lines(rev_map, is_expense=False)
    expense_lines = build_lines(exp_map, is_expense=True)

    total_revenue = sum(ln["group_total"] for ln in revenue_lines)
    total_expenses = sum(ln["group_total"] for ln in expense_lines)

    # Per-company totals
    company_totals = {}
    for cid in cids:
        c_rev = sum(amounts.get(cid, Decimal(0)) for amounts in rev_map.values())
        c_exp = sum(amounts.get(cid, Decimal(0)) for amounts in exp_map.values())
        company_totals[str(cid)] = {"revenue": c_rev, "expenses": c_exp, "net_profit": c_rev - c_exp}

    return {
        "companies": [{"id": str(c["id"]), "name": c["name"]} for c in companies],
        "revenue_lines": revenue_lines,
        "expense_lines": expense_lines,
        "totals": {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_profit": total_revenue - total_expenses,
            # In the current cash-basis system, IC transactions flow symmetrically:
            # the same confirmed IC total is eliminated from both revenue and expense
            # sides because each IC transaction creates equal revenue (target) and
            # expense (source) entries. Both elimination amounts are therefore identical.
            "ic_elimination_revenue": -ic_elimination_total,
            "ic_elimination_expense": -ic_elimination_total,
            "by_company": company_totals,
        },
    }


# ── Consolidated Balance Sheet ───────────────────────────────────────────────

def get_consolidated_balance_sheet(
    db: Session,
    group_id: UUID,
    year: int,
) -> dict:
    """Consolidated Balance Sheet across all group companies.
    Assets, Liabilities, Equity sections with IC elimination.
    Cumulative balances (not just current year for BS).
    """
    companies = get_group_company_ids(db, group_id)
    if not companies:
        return {"companies": [], "assets": {}, "liabilities": {}, "equity": {},
                "is_balanced": True, "imbalance_amount": Decimal(0)}

    cids = [c["id"] for c in companies]

    def scalar_sum(sql: str, params: dict) -> Decimal:
        result = db.execute(sa.text(sql), params)
        return _to_dec(result.scalar_one())

    # Per-company BS figures
    company_data = []
    group_assets = Decimal(0)
    group_liabilities = Decimal(0)
    group_equity = Decimal(0)

    for c in companies:
        cid = c["id"]
        p = {"cid": cid, "year": year}

        # Cash & Bank: all-time revenue - all-time expenses (up to selected year)
        all_rev = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM revenue_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year <= :year", p)
        all_exp = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM expense_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year <= :year", p)
        cash = all_rev - all_exp

        # Caution deposits payable (liabilities)
        caution = scalar_sum(
            "SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
            "JOIN accounts a ON r.account_id = a.id "
            "WHERE r.company_id = :cid AND r.is_voided = false AND a.code = '4030' AND r.fiscal_year <= :year", p)

        # Retained earnings (prior years) + current year profit
        prior_rev = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM revenue_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year < :year", p)
        prior_exp = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM expense_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year < :year", p)
        prior_caution = scalar_sum(
            "SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
            "JOIN accounts a ON r.account_id = a.id "
            "WHERE r.company_id = :cid AND r.is_voided = false AND a.code = '4030' AND r.fiscal_year < :year", p)
        retained = prior_rev - prior_caution - prior_exp

        cur_rev = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM revenue_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year = :year", p)
        cur_exp = scalar_sum(
            "SELECT COALESCE(SUM(amount), 0) FROM expense_transactions "
            "WHERE company_id = :cid AND is_voided = false AND fiscal_year = :year", p)
        cur_caution = scalar_sum(
            "SELECT COALESCE(SUM(r.amount), 0) FROM revenue_transactions r "
            "JOIN accounts a ON r.account_id = a.id "
            "WHERE r.company_id = :cid AND r.is_voided = false AND a.code = '4030' AND r.fiscal_year = :year", p)
        current_profit = cur_rev - cur_caution - cur_exp

        total_assets = cash
        total_liabilities = caution
        total_equity = retained + current_profit

        group_assets += total_assets
        group_liabilities += total_liabilities
        group_equity += total_equity

        company_data.append({
            "company_id": str(cid),
            "company_name": c["name"],
            "cash_and_bank": cash,
            "total_assets": total_assets,
            "caution_deposits_payable": caution,
            "total_liabilities": total_liabilities,
            "retained_earnings": retained,
            "current_year_profit": current_profit,
            "total_equity": total_equity,
        })

    # IC elimination on BS: remove IC Receivable / IC Payable balances
    ic_balance = scalar_sum(
        "SELECT COALESCE(SUM(amount), 0) FROM intercompany_transactions "
        "WHERE company_group_id = :gid AND fiscal_year <= :year AND status = 'CONFIRMED'",
        {"gid": group_id, "year": year},
    )

    # Consolidation adjustments for BS
    adj_result = db.execute(
        sa.text("""
            SELECT SUM(debit_amount) AS total_debit, SUM(credit_amount) AS total_credit
            FROM consolidation_adjustments
            WHERE company_group_id = :gid AND fiscal_year = :year
              AND is_voided = false
        """),
        {"gid": group_id, "year": year},
    )
    adj_row = adj_result.one()
    total_adj_debit = _to_dec(adj_row.total_debit)
    total_adj_credit = _to_dec(adj_row.total_credit)

    # Apply IC elimination to group totals:
    # IC Receivable (1500) inflates assets — remove it
    # IC Payable (2500) inflates liabilities — remove it
    # Both sides equal ic_balance, so they cancel out in the BS equation
    consolidated_assets = group_assets - ic_balance
    consolidated_liabilities = group_liabilities - ic_balance
    consolidated_equity = group_equity

    imbalance = consolidated_assets - (consolidated_liabilities + consolidated_equity)
    is_balanced = abs(imbalance) < Decimal("0.01")

    return {
        "companies": [{"id": str(c["id"]), "name": c["name"]} for c in companies],
        "by_company": company_data,
        "consolidated": {
            "total_assets": consolidated_assets,
            "total_liabilities": consolidated_liabilities,
            "total_equity": consolidated_equity,
            "pre_elimination_assets": group_assets,
            "pre_elimination_liabilities": group_liabilities,
            "ic_elimination": ic_balance,
            "adjustments_debit": total_adj_debit,
            "adjustments_credit": total_adj_credit,
        },
        "is_balanced": is_balanced,
        "imbalance_amount": imbalance,
    }


# ── Consolidated Trial Balance ────────────────────────────────────────────────

def get_consolidated_trial_balance(
    db: Session,
    group_id: UUID,
    year: int,
) -> dict:
    """Consolidated Trial Balance: debit/credit per account per company."""
    companies = get_group_company_ids(db, group_id)
    if not companies:
        return {"companies": [], "rows": [], "total_debit": Decimal(0), "total_credit": Decimal(0)}

    cids = [c["id"] for c in companies]

    # Revenue by account and company (credits)
    rev_result = db.execute(
        sa.text("""
            SELECT a.code, a.name, a.type, a.normal_balance,
                   r.company_id,
                   COALESCE(SUM(r.amount), 0) AS total
            FROM revenue_transactions r
            JOIN accounts a ON r.account_id = a.id
            WHERE r.company_id = ANY(:cids)
              AND r.is_voided = false
              AND r.fiscal_year = :year
            GROUP BY a.code, a.name, a.type, a.normal_balance, r.company_id
            ORDER BY a.code
        """),
        {"cids": cids, "year": year},
    )

    # Expenses by account and company (debits)
    exp_result = db.execute(
        sa.text("""
            SELECT a.code, a.name, a.type, a.normal_balance,
                   e.company_id,
                   COALESCE(SUM(e.amount), 0) AS total
            FROM expense_transactions e
            JOIN accounts a ON e.account_id = a.id
            WHERE e.company_id = ANY(:cids)
              AND e.is_voided = false
              AND e.fiscal_year = :year
            GROUP BY a.code, a.name, a.type, a.normal_balance, e.company_id
            ORDER BY a.code
        """),
        {"cids": cids, "year": year},
    )

    # Build account map: code -> {name, type, normal_balance, company_amounts: {cid: amount}}
    acct_map: dict[str, dict] = {}

    for row in rev_result:
        code = row.code
        if code not in acct_map:
            acct_map[code] = {
                "name": row.name, "type": row.type, "normal_balance": row.normal_balance,
                "company_credits": {}, "company_debits": {},
            }
        acct_map[code]["company_credits"][row.company_id] = _to_dec(row.total)

    for row in exp_result:
        code = row.code
        if code not in acct_map:
            acct_map[code] = {
                "name": row.name, "type": row.type, "normal_balance": row.normal_balance,
                "company_credits": {}, "company_debits": {},
            }
        acct_map[code]["company_debits"][row.company_id] = _to_dec(row.total)

    # Consolidation adjustments
    adj_result = db.execute(
        sa.text("""
            SELECT account_code, debit_amount, credit_amount
            FROM consolidation_adjustments
            WHERE company_group_id = :gid AND fiscal_year = :year
              AND is_voided = false
        """),
        {"gid": group_id, "year": year},
    )
    adj_debit_by_code: dict[str, Decimal] = {}
    adj_credit_by_code: dict[str, Decimal] = {}
    for row in adj_result:
        adj_debit_by_code[row.account_code] = adj_debit_by_code.get(row.account_code, Decimal(0)) + _to_dec(row.debit_amount)
        adj_credit_by_code[row.account_code] = adj_credit_by_code.get(row.account_code, Decimal(0)) + _to_dec(row.credit_amount)

    # Build rows
    rows = []
    total_debit = Decimal(0)
    total_credit = Decimal(0)

    for code in sorted(acct_map.keys()):
        info = acct_map[code]
        company_amounts = {}

        for c in companies:
            cid = c["id"]
            debit = info["company_debits"].get(cid, Decimal(0))
            credit = info["company_credits"].get(cid, Decimal(0))
            company_amounts[str(cid)] = {"debit": debit, "credit": credit}

        # IC elimination for ALL IC accounts (1500, 2500, 4500, 6500)
        elimination_debit = Decimal(0)
        elimination_credit = Decimal(0)
        if code == "4500":    # IC Revenue — eliminate credit
            elimination_credit = -sum(info["company_credits"].values())
        elif code == "6500":  # IC Expense — eliminate debit
            elimination_debit = -sum(info["company_debits"].values())
        elif code == "1500":  # IC Receivable — eliminate debit (asset)
            elimination_debit = -sum(info["company_debits"].values())
        elif code == "2500":  # IC Payable — eliminate credit (liability)
            elimination_credit = -sum(info["company_credits"].values())

        # Apply manual adjustments
        adj_dr = adj_debit_by_code.get(code, Decimal(0))
        adj_cr = adj_credit_by_code.get(code, Decimal(0))

        sum_debit = sum(info["company_debits"].values()) + elimination_debit + adj_dr
        sum_credit = sum(info["company_credits"].values()) + elimination_credit + adj_cr

        total_debit += sum_debit
        total_credit += sum_credit

        rows.append({
            "code": code,
            "name": info["name"],
            "type": info["type"],
            "normal_balance": info["normal_balance"],
            "by_company": company_amounts,
            "elimination_debit": elimination_debit,
            "elimination_credit": elimination_credit,
            "adjustment_debit": adj_dr,
            "adjustment_credit": adj_cr,
            "group_debit": sum_debit,
            "group_credit": sum_credit,
        })

    return {
        "companies": [{"id": str(c["id"]), "name": c["name"]} for c in companies],
        "rows": rows,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": abs(total_debit - total_credit) < Decimal("0.01"),
    }
