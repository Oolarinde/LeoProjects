// ── Payroll Settings ────────────────────────────────────────────

export interface PayrollSettings {
  id: string;
  company_id: string;
  pay_period: string;
  pension_employee_pct: number;
  pension_employer_pct: number;
  nhf_pct: number;
  nsitf_employee_pct: number;
  tax_method: string;
  enable_13th_month: boolean;
  fiscal_year_start_month: number;
  created_at: string;
  updated_at: string | null;
}

export interface PayrollSettingsUpdate {
  pay_period?: string;
  pension_employee_pct?: number;
  pension_employer_pct?: number;
  nhf_pct?: number;
  nsitf_employee_pct?: number;
  tax_method?: string;
  enable_13th_month?: boolean;
  fiscal_year_start_month?: number;
}

// ── Allowance Types ─────────────────────────────────────────────

export interface AllowanceType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  is_taxable: boolean;
  is_active: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface AllowanceTypeCreate {
  name: string;
  code: string;
  is_taxable?: boolean;
  description?: string;
  sort_order?: number;
}

export interface AllowanceTypeUpdate {
  name?: string;
  code?: string;
  is_taxable?: boolean;
  is_active?: boolean;
  description?: string;
  sort_order?: number;
}

// ── Deduction Types ─────────────────────────────────────────────

export type CalculationMethod =
  | "FIXED"
  | "PERCENTAGE_GROSS"
  | "PERCENTAGE_BASIC"
  | "TAX_TABLE"
  | "MANUAL";

export interface DeductionType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  is_statutory: boolean;
  calculation_method: CalculationMethod;
  default_value: number | null;
  is_active: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface DeductionTypeCreate {
  name: string;
  code: string;
  is_statutory?: boolean;
  calculation_method?: CalculationMethod;
  default_value?: number;
  description?: string;
  sort_order?: number;
}

export interface DeductionTypeUpdate {
  name?: string;
  code?: string;
  is_statutory?: boolean;
  calculation_method?: CalculationMethod;
  default_value?: number;
  is_active?: boolean;
  description?: string;
  sort_order?: number;
}

// ── Tax Brackets ────────────────────────────────────────────────

export interface TaxBracket {
  id: string;
  company_id: string;
  lower_bound: number;
  upper_bound: number | null;
  rate_pct: number;
  sort_order: number;
  created_at: string;
}

export interface TaxBracketInput {
  lower_bound: number;
  upper_bound: number | null;
  rate_pct: number;
  sort_order?: number;
}

// ── Leave Policies ──────────────────────────────────────────────

export type LeaveType =
  | "ANNUAL"
  | "SICK"
  | "CASUAL"
  | "MATERNITY"
  | "PATERNITY"
  | "UNPAID"
  | "COMPASSIONATE";

export interface LeavePolicy {
  id: string;
  company_id: string;
  leave_type: LeaveType;
  days_per_year: number;
  is_paid: boolean;
  carry_over_allowed: boolean;
  max_carry_over_days: number | null;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeavePolicyCreate {
  leave_type: LeaveType;
  days_per_year: number;
  is_paid?: boolean;
  carry_over_allowed?: boolean;
  max_carry_over_days?: number;
  requires_approval?: boolean;
}

export interface LeavePolicyUpdate {
  days_per_year?: number;
  is_paid?: boolean;
  carry_over_allowed?: boolean;
  max_carry_over_days?: number;
  requires_approval?: boolean;
  is_active?: boolean;
}
