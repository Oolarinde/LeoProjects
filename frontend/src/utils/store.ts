import { create } from "zustand";

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  permissions: Record<string, string>;
  group_id: string;
  preferred_language: string;
  avatar_url: string | null;
  effective_role?: string; // GROUP_ADMIN | COMPANY_ADMIN | VIEWER
  is_parent_company?: boolean;
}

export interface CompanyInfo {
  id: string;
  name: string;
  role: string;
  is_default: boolean;
  entity_prefix: string | null;
  company_group_id: string | null;
}

interface AppState {
  year: number;
  location: Location | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  appVersion: string | null;
  companyName: string | null;
  companies: CompanyInfo[];
  companyGroupId: string | null;
  companyGroupName: string | null;
  setYear: (year: number) => void;
  setLocation: (location: Location | null) => void;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  setAppConfig: (version: string, companyName: string) => void;
  setCompanies: (companies: CompanyInfo[]) => void;
  setCompanyGroup: (id: string | null, name: string | null) => void;
  switchCompany: (
    companyId: string,
    tokens: { access_token: string; refresh_token: string },
    companyName: string
  ) => void;
  logout: () => void;
}

export function hasAccess(
  user: User | null,
  module: string,
  level: "read" | "write" = "read"
): boolean {
  if (!user) return false;
  const role = user.effective_role || user.role;
  // Full-access roles
  if (["SUPER_ADMIN", "GROUP_ADMIN"].includes(role)) return true;
  if (role === "COMPANY_ADMIN") return true;
  // VIEWER / STAFF: read-only
  if (role === "VIEWER" || role === "STAFF") {
    return level === "read";
  }
  // Fallback to explicit permissions
  const perm = user.permissions?.[module] ?? "none";
  if (level === "read") return perm === "read" || perm === "write";
  if (level === "write") return perm === "write";
  return false;
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return (
    ["SUPER_ADMIN", "ADMIN", "GROUP_ADMIN", "COMPANY_ADMIN"].includes(user.role) ||
    ["GROUP_ADMIN", "COMPANY_ADMIN"].includes(user.effective_role || "")
  );
}

export function isGroupAdmin(user: User | null): boolean {
  return user?.effective_role === "GROUP_ADMIN";
}

export function isCompanyAdmin(user: User | null): boolean {
  const role = user?.effective_role;
  return role === "COMPANY_ADMIN" || role === "GROUP_ADMIN";
}

export function isViewer(user: User | null): boolean {
  return user?.effective_role === "VIEWER";
}

export function canWrite(user: User | null): boolean {
  return user?.effective_role !== "VIEWER";
}

export const useAppStore = create<AppState>((set) => ({
  year: new Date().getFullYear(),
  location: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  appVersion: null,
  companyName: null,
  companies: [],
  companyGroupId: null,
  companyGroupName: null,
  setYear: (year) => set({ year }),
  setLocation: (location) => set({ location }),
  setUser: (user) => set({ user }),
  setTokens: (access, refresh) =>
    set({ accessToken: access, refreshToken: refresh }),
  setAppConfig: (version, companyName) => set({ appVersion: version, companyName }),
  setCompanies: (companies) => set({ companies }),
  setCompanyGroup: (id, name) => set({ companyGroupId: id, companyGroupName: name }),
  switchCompany: (companyId, newTokens, companyName) =>
    set((state) => {
      const target = state.companies.find((c) => c.id === companyId);
      return {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        companyName,
        location: null,
        companyGroupId: target?.company_group_id ?? state.companyGroupId,
        companies: state.companies.map((c) => ({
          ...c,
          is_default: c.id === companyId,
        })),
      };
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      companies: [],
      companyGroupId: null,
      companyGroupName: null,
    }),
}));
