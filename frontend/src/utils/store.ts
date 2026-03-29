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
