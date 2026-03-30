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

// Language preference
export const languageApi = {
  update: (lang: string) => api.patch("/auth/me/language", { preferred_language: lang }),
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
};

export default api;
