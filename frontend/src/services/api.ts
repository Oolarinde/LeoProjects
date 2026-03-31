import axios from "axios";
import { useAppStore } from "../utils/store";

export interface ApiError {
  response?: { data?: { detail?: string }; status?: number };
  message?: string;
}

export function getErrorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  return apiErr?.response?.data?.detail ?? apiErr?.message ?? "An unexpected error occurred";
}

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Try store first, fall back to localStorage if store hasn't hydrated yet
  let token = useAppStore.getState().accessToken;
  if (!token) {
    try {
      const persisted = localStorage.getItem("tal-auth");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        token = parsed?.state?.accessToken || null;
      }
    } catch {
      // localStorage parse failed — ignore
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    // Handle both 401 and 403 "Not authenticated" (FastAPI HTTPBearer returns 403)
    if (status === 401 || (status === 403 && detail === "Not authenticated")) {
      const { accessToken, refreshToken, setTokens, logout } = useAppStore.getState();
      // Only attempt session recovery if user was actually logged in
      if (!accessToken && !refreshToken) {
        // Not logged in — don't trigger session-expired
        return Promise.reject(error);
      }
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const resp = await axios.post("/api/auth/refresh", {
            refresh_token: refreshToken,
          });
          setTokens(resp.data.access_token, resp.data.refresh_token);
          error.config.headers.Authorization = `Bearer ${resp.data.access_token}`;
          return api(error.config);
        } catch {
          // Refresh failed — session is truly expired
          logout();
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
      } else {
        logout();
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
  }) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

// Reference
export const referenceApi = {
  getLocations: () => api.get("/reference/locations"),
  getDropdowns: () => api.get("/reference/dropdowns"),
  getUnits: (locationId?: string) => api.get("/reference/units", { params: { location_id: locationId } }),
  getAccounts: () => api.get("/reference/accounts"),
  getEmployees: () => api.get("/reference/employees"),
};

// Users (admin)
export const usersApi = {
  list: () => api.get("/users"),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: {
    email: string;
    full_name: string;
    role: string;
    password: string;
    group_id: string;
  }) => api.post("/users", data),
  update: (
    id: string,
    data: {
      full_name?: string;
      role?: string;
      is_active?: boolean;
      group_id?: string;
    }
  ) => api.patch(`/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

// Groups (admin)
export const groupsApi = {
  list: () => api.get("/groups"),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: {
    name: string;
    description?: string;
    permissions: Record<string, string>;
  }) => api.post("/groups", data),
  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: Record<string, string>;
    }
  ) => api.patch(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addMembers: (id: string, userIds: string[]) =>
    api.post(`/groups/${id}/members`, { user_ids: userIds }),
  removeMembers: (id: string, userIds: string[]) =>
    api.delete(`/groups/${id}/members`, { data: { user_ids: userIds } }),
};

// Config
export const configApi = {
  get: () => api.get("/config"),
};

// Dashboard
export const dashboardApi = {
  summary: (year: number, locationId?: string) =>
    api.get("/dashboard/summary", { params: { year, location_id: locationId || undefined } }),
};

// Login history
export const loginHistoryApi = {
  list: (limit = 50, offset = 0) =>
    api.get("/auth/me/login-history", { params: { limit, offset } }),
};

// Language preference
export const languageApi = {
  update: (lang: string) => api.patch("/auth/me/language", { preferred_language: lang }),
};

// Avatar upload
export const avatarApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.post("/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Payroll
export const payrollApi = {
  // Settings
  getSettings: () => api.get("/payroll/settings"),
  updateSettings: (data: Record<string, unknown>) =>
    api.put("/payroll/settings", data),

  // Allowance Types
  listAllowanceTypes: () => api.get("/payroll/allowance-types"),
  createAllowanceType: (data: Record<string, unknown>) =>
    api.post("/payroll/allowance-types", data),
  updateAllowanceType: (id: string, data: Record<string, unknown>) =>
    api.patch(`/payroll/allowance-types/${id}`, data),
  deleteAllowanceType: (id: string) =>
    api.delete(`/payroll/allowance-types/${id}`),

  // Deduction Types
  listDeductionTypes: () => api.get("/payroll/deduction-types"),
  createDeductionType: (data: Record<string, unknown>) =>
    api.post("/payroll/deduction-types", data),
  updateDeductionType: (id: string, data: Record<string, unknown>) =>
    api.patch(`/payroll/deduction-types/${id}`, data),
  deleteDeductionType: (id: string) =>
    api.delete(`/payroll/deduction-types/${id}`),

  // Tax Brackets
  listTaxBrackets: () => api.get("/payroll/tax-brackets"),
  replaceTaxBrackets: (brackets: Record<string, unknown>[]) =>
    api.put("/payroll/tax-brackets", { brackets }),

  // Leave Policies
  listLeavePolicies: () => api.get("/payroll/leave-policies"),
  createLeavePolicy: (data: Record<string, unknown>) =>
    api.post("/payroll/leave-policies", data),
  updateLeavePolicy: (id: string, data: Record<string, unknown>) =>
    api.patch(`/payroll/leave-policies/${id}`, data),
  deleteLeavePolicy: (id: string) =>
    api.delete(`/payroll/leave-policies/${id}`),

  // Sprint 2 — Payroll Profiles
  listProfiles: () => api.get("/payroll/profiles"),
  getProfile: (employeeId: string) => api.get(`/payroll/profiles/${employeeId}`),
  upsertProfile: (data: Record<string, unknown>) => api.put("/payroll/profiles", data),

  // Sprint 2 — Employee Allowances
  listEmployeeAllowances: (employeeId: string) =>
    api.get(`/payroll/employees/${employeeId}/allowances`),
  upsertEmployeeAllowance: (employeeId: string, data: Record<string, unknown>) =>
    api.put(`/payroll/employees/${employeeId}/allowances`, data),
  deleteEmployeeAllowance: (employeeId: string, itemId: string) =>
    api.delete(`/payroll/employees/${employeeId}/allowances/${itemId}`),

  // Sprint 2 — Employee Deductions
  listEmployeeDeductions: (employeeId: string) =>
    api.get(`/payroll/employees/${employeeId}/deductions`),
  upsertEmployeeDeduction: (employeeId: string, data: Record<string, unknown>) =>
    api.put(`/payroll/employees/${employeeId}/deductions`, data),
  deleteEmployeeDeduction: (employeeId: string, itemId: string) =>
    api.delete(`/payroll/employees/${employeeId}/deductions/${itemId}`),

  // Sprint 2 — Leave Balances
  getLeaveBalances: (employeeId: string, year: number) =>
    api.get(`/payroll/employees/${employeeId}/leave-balances`, { params: { year } }),

  // Sprint 2 — Leave Requests
  listLeaveRequests: (params?: Record<string, unknown>) =>
    api.get("/payroll/leave-requests", { params }),
  createLeaveRequest: (data: Record<string, unknown>) =>
    api.post("/payroll/leave-requests", data),
  updateLeaveRequestStatus: (requestId: string, data: Record<string, unknown>) =>
    api.patch(`/payroll/leave-requests/${requestId}/status`, data),
  cancelLeaveRequest: (requestId: string) =>
    api.patch(`/payroll/leave-requests/${requestId}/cancel`),

  // Sprint 3 — Payroll Runs
  listRuns: (year?: number) =>
    api.get("/payroll/runs", { params: year ? { year } : {} }),
  getRunDetail: (runId: string) =>
    api.get(`/payroll/runs/${runId}`),
  createRun: (data: { year: number; month: number; notes?: string }) =>
    api.post("/payroll/runs", data),
  calculateRun: (runId: string) =>
    api.post(`/payroll/runs/${runId}/calculate`),
  approveRun: (runId: string) =>
    api.post(`/payroll/runs/${runId}/approve`),
  cancelRun: (runId: string) =>
    api.post(`/payroll/runs/${runId}/cancel`),
  deleteRun: (runId: string) =>
    api.delete(`/payroll/runs/${runId}`),

  // History & Export
  history: (year: number, month?: number) =>
    api.get("/payroll/runs", { params: { year, ...(month ? { month } : {}) } }),
  exportHistory: (year: number, month?: number, format?: string) =>
    api.get("/payroll/export", {
      params: { year, ...(month ? { month } : {}), format: format || "xlsx" },
      responseType: format === "pdf" ? "blob" : "json",
    }),
};

// Revenue
export const revenueApi = {
  list: (params: Record<string, unknown>) => api.get("/revenue", { params }),
  summary: (year: number, locationId?: string) =>
    api.get("/revenue/summary", { params: { year, location_id: locationId || undefined } }),
  create: (data: Record<string, unknown>) => api.post("/revenue", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/revenue/${id}`, data),
  void: (id: string, reason = "") => api.post(`/revenue/${id}/void`, null, { params: { reason } }),
};

// Expenses
export const expensesApi = {
  list: (params: Record<string, unknown>) => api.get("/expenses", { params }),
  summary: (year: number, locationId?: string) =>
    api.get("/expenses/summary", { params: { year, location_id: locationId || undefined } }),
  create: (data: Record<string, unknown>) => api.post("/expenses", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/expenses/${id}`, data),
  void: (id: string, reason = "") => api.post(`/expenses/${id}/void`, null, { params: { reason } }),
};

// Settings
export const settingsApi = {
  // Accounts
  listAccounts: () => api.get("/settings/accounts"),
  createAccount: (data: Record<string, unknown>) => api.post("/settings/accounts", data),
  updateAccount: (id: string, data: Record<string, unknown>) => api.patch(`/settings/accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/settings/accounts/${id}`),
  // Locations
  listLocations: () => api.get("/settings/locations"),
  createLocation: (data: Record<string, unknown>) => api.post("/settings/locations", data),
  updateLocation: (id: string, data: Record<string, unknown>) => api.patch(`/settings/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/settings/locations/${id}`),
  // Units
  listUnits: (locationId?: string) => api.get("/settings/units", { params: { location_id: locationId } }),
  createUnit: (data: Record<string, unknown>) => api.post("/settings/units", data),
  updateUnit: (id: string, data: Record<string, unknown>) => api.patch(`/settings/units/${id}`, data),
  deleteUnit: (id: string) => api.delete(`/settings/units/${id}`),
  // Employees
  listEmployees: () => api.get("/settings/employees"),
  createEmployee: (data: Record<string, unknown>) => api.post("/settings/employees", data),
  updateEmployee: (id: string, data: Record<string, unknown>) => api.patch(`/settings/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/settings/employees/${id}`),
  // Reference Data
  listReferenceData: (category?: string) => api.get("/settings/reference-data", { params: { category } }),
  createReferenceData: (data: Record<string, unknown>) => api.post("/settings/reference-data", data),
  updateReferenceData: (id: string, data: Record<string, unknown>) => api.patch(`/settings/reference-data/${id}`, data),
  deleteReferenceData: (id: string) => api.delete(`/settings/reference-data/${id}`),
};

// Reports
export const reportsApi = {
  pnlSummary: (year: number, locationId?: string) =>
    api.get("/reports/pnl/summary", { params: { year, location_id: locationId || undefined } }),
  cashFlowSummary: (year: number, locationId?: string) =>
    api.get("/reports/cashflow/summary", { params: { year, location_id: locationId || undefined } }),
  setOpeningBalance: (year: number, amount: number, notes = "") =>
    api.put("/reports/cashflow/opening-balance", { amount, notes }, { params: { year } }),
  balanceSheetSummary: (year: number, locationId?: string) =>
    api.get("/reports/balance-sheet/summary", { params: { year, location_id: locationId || undefined } }),
  trialBalanceSummary: (year: number, locationId?: string) =>
    api.get("/reports/trial-balance/summary", { params: { year, location_id: locationId || undefined } }),
};

// General Ledger
export const ledgerApi = {
  entries: (params: Record<string, unknown>) => api.get("/ledger/entries", { params }),
};

// Budget
export const budgetApi = {
  getGrid: (year: number, lineType = "EXPENSE") =>
    api.get("/budget/grid", { params: { year, line_type: lineType } }),
  bulkSave: (data: { year: number; line_type: string; cells: { category: string; month: number; amount: number }[] }) =>
    api.put("/budget/bulk", data),
  clearAll: (year: number, lineType = "EXPENSE") =>
    api.delete("/budget/clear/", { params: { year, line_type: lineType } }),
};

// Tenants
export const tenantApi = {
  list: (search?: string) => api.get("/tenants/", { params: search ? { search } : {} }),
  create: (data: Record<string, unknown>) => api.post("/tenants/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  listLeases: (params?: Record<string, unknown>) => api.get("/tenants/leases", { params }),
  createLease: (data: Record<string, unknown>) => api.post("/tenants/leases", data),
  updateLeaseStatus: (id: string, status: string) => api.patch(`/tenants/leases/${id}/status`, null, { params: { new_status: status } }),
  listPayments: (params?: Record<string, unknown>) => api.get("/tenants/rent-payments", { params }),
  createPayment: (data: Record<string, unknown>) => api.post("/tenants/rent-payments", data),
  summary: () => api.get("/tenants/summary"),
};

// Analysis
export const analysisApi = {
  summary: (year: number, locationId?: string) =>
    api.get("/analysis/summary", { params: { year, location_id: locationId || undefined } }),
};

// Company switching
export const companyApi = {
  switchCompany: (companyId: string) =>
    api.post("/auth/switch-company", { company_id: companyId }),
};

// Group accounting
export const groupApi = {
  getGroup: () => api.get("/company-groups/mine"),
  listCompanies: () => api.get("/company-groups/companies"),
  createSubsidiary: (data: any) => api.post("/company-groups/companies/create", data),
  addCompany: (data: any) => api.post("/company-groups/companies", data),
  updateCompany: (companyId: string, data: any) => api.patch(`/company-groups/companies/${companyId}`, data),
  setParentCompany: (companyId: string) => api.patch(`/company-groups/companies/${companyId}/set-parent`),
  removeCompany: (companyId: string) => api.delete(`/company-groups/companies/${companyId}`),
  getCoaMismatches: (companyId: string) => api.get(`/company-groups/coa-check/${companyId}`),

  // Group user management
  listGroupUsers: () => api.get("/company-groups/users"),
  updateUserAccess: (userId: string, memberships: { company_id: string; role: string; is_default: boolean }[]) =>
    api.put(`/company-groups/users/${userId}/access`, { memberships }),

  // CoA template
  getCoaTemplate: () => api.get("/company-groups/coa-template"),
  createCoaTemplate: (data: any) => api.post("/company-groups/coa-template", data),
  updateCoaTemplateEntry: (entryId: string, data: any) => api.put(`/company-groups/coa-template/${entryId}`, data),
  deleteCoaTemplateEntry: (entryId: string) => api.delete(`/company-groups/coa-template/${entryId}`),

  // Allocation rules
  listAllocationRules: () => api.get("/company-groups/allocation-rules"),
  createAllocationRule: (data: any) => api.post("/company-groups/allocation-rules", data),
  updateAllocationRule: (id: string, data: any) => api.put(`/company-groups/allocation-rules/${id}`, data),
  deleteAllocationRule: (id: string) => api.delete(`/company-groups/allocation-rules/${id}`),

  // IC transactions
  listIcTransactions: (params: { year: number }) => api.get("/intercompany/transactions", { params }),
  createIcTransaction: (data: any) => api.post("/intercompany/transactions", data),
  confirmIcTransaction: (id: string) => api.patch(`/intercompany/transactions/${id}/confirm`),
  voidIcTransaction: (id: string, reason: string) => api.patch(`/intercompany/transactions/${id}/void`, { void_reason: reason }),
  getIcBalances: (year: number) => api.get("/intercompany/balances", { params: { year } }),

  // Consolidated reports
  consolidatedPnl: (year: number) => api.get("/reports/consolidated/pnl/summary", { params: { year } }),
  consolidatedBs: (year: number) => api.get("/reports/consolidated/balance-sheet/summary", { params: { year } }),
  consolidatedTb: (year: number) => api.get("/reports/consolidated/trial-balance/summary", { params: { year } }),

  // Group dashboard
  groupDashboard: (year: number) => api.get("/company-groups/dashboard", { params: { year } }),

  // Cost allocations
  getEmployeeAllocations: (employeeId: string) => api.get(`/payroll/employees/${employeeId}/cost-allocations`),
  setEmployeeAllocations: (employeeId: string, allocations: { company_id: string; percentage: number }[]) =>
    api.put(`/payroll/employees/${employeeId}/cost-allocations`, { allocations }),
};

// Staff profiles
export const staffApi = {
  getProfile: (id: string) => api.get(`/staff/${id}`),
  updateProfile: (id: string, data: Record<string, unknown>) => api.put(`/staff/${id}`, data),
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return api.post(`/staff/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getPayrollHistory: (id: string) => api.get(`/staff/${id}/payroll-history`),
  getLeave: (id: string, year?: number) => api.get(`/staff/${id}/leave`, { params: year ? { year } : {} }),
  getLoginHistory: (id: string) => api.get(`/staff/${id}/login-history`),
  createStaff: (data: Record<string, unknown>) => api.post("/staff", data),
  createLogin: (id: string, data: { email: string; role: string }) => api.post(`/staff/${id}/create-login`, data),
};

export default api;
