export interface MonthlyPnlRow {
  month: string;
  revenue: number;
  expenses: number;
}

export interface RevenueStreamRow {
  name: string;
  value: number;
}

export interface ExpenseBudgetRow {
  category: string;
  spent: number;
  budget: number;
}

export interface CashPositionRow {
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  closing_balance: number;
}

export interface TrialBalanceRow {
  label: string;
  debit: number;
  credit: number;
}

export interface GlEntryRow {
  id: string;
  date: string;
  account: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
}

export interface DashboardSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  staff_salaries: number;
  revenue_change_pct: number | null;
  expense_change_pct: number | null;
  monthly_pnl: MonthlyPnlRow[];
  revenue_streams: RevenueStreamRow[];
  expense_budget: ExpenseBudgetRow[];
  cash_position: CashPositionRow;
  trial_balance: TrialBalanceRow[];
  recent_gl_entries: GlEntryRow[];
}
