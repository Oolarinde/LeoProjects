export interface LoginSession {
  id: string;
  ip_address: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  created_at: string;
}

export interface LoginHistoryResponse {
  items: LoginSession[];
  total: number;
}
