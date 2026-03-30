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
}

interface AppState {
  year: number;
  location: Location | null; // null = "All locations"
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setYear: (year: number) => void;
  setLocation: (location: Location | null) => void;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export function hasAccess(
  user: User | null,
  module: string,
  level: "read" | "write" = "read"
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const perm = user.permissions?.[module] ?? "none";
  if (level === "read") return perm === "read" || perm === "write";
  if (level === "write") return perm === "write";
  return false;
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || user.role === "ADMIN";
}

export const useAppStore = create<AppState>((set) => ({
  year: new Date().getFullYear(),
  location: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  setYear: (year) => set({ year }),
  setLocation: (location) => set({ location }),
  setUser: (user) => set({ user }),
  setTokens: (access, refresh) =>
    set({ accessToken: access, refreshToken: refresh }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    }),
}));
