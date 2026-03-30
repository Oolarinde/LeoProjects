// ── P&L ─────────────────────────────────────────────────────────────────────
export interface PnlLineItem {
  code: string;
  name: string;
  total: number;
  monthly: number[];
}

export interface PnlSummary {
  revenue_lines: PnlLineItem[];
  expense_lines: PnlLineItem[];
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  month_names: string[];
}

// ── Cash Flow ────────────────────────────────────────────────────────────────
export interface MonthlyCashRow {
  month: string;
  cash_in: number;
  cash_out: number;
  net: number;
  running_balance: number;
}

export interface CashFlowSummary {
  opening_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  net_cash_flow: number;
  closing_balance: number;
  monthly_breakdown: MonthlyCashRow[];
}

// ── Balance Sheet ────────────────────────────────────────────────────────────
export interface BalanceSheetSummary {
  cash_and_bank: number;
  accounts_receivable: number;
  total_assets: number;
  caution_deposits_payable: number;
  total_liabilities: number;
  retained_earnings_prior: number;
  current_year_profit: number;
  total_equity: number;
  is_balanced: boolean;
  imbalance_amount: number;
}

// ── Trial Balance ────────────────────────────────────────────────────────────
export interface TrialBalanceLine {
  code: string;
  name: string;
  account_type: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceSummary {
  lines: TrialBalanceLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  difference: number;
}

// ── General Ledger ───────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  date: string;
  code: string;
  account: string;
  entry_type: string;
  description: string;
  location_name: string;
  reference_no: string;
  debit: number;
  credit: number;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  total: number;
  page: number;
  size: number;
}
