import axios from "axios";
import { useAppStore } from "../utils/store";

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

export default api;
