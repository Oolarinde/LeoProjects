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
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, setTokens, logout } = useAppStore.getState();
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
          logout();
        }
      } else {
        logout();
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
};

// Revenue
export const revenueApi = {
  list: (params: Record<string, unknown>) => api.get("/revenue", { params }),
  summary: (year: number, locationId?: string) =>
    api.get("/revenue/summary", { params: { year, location_id: locationId || undefined } }),
  create: (data: Record<string, unknown>) => api.post("/revenue", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/revenue/${id}`, data),
  delete: (id: string) => api.delete(`/revenue/${id}`),
};

// Expenses
export const expensesApi = {
  list: (params: Record<string, unknown>) => api.get("/expenses", { params }),
  summary: (year: number, locationId?: string) =>
    api.get("/expenses/summary", { params: { year, location_id: locationId || undefined } }),
  create: (data: Record<string, unknown>) => api.post("/expenses", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
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

export default api;
