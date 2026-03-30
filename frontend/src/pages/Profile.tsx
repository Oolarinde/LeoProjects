import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CircularProgress, Skeleton } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";
import { useAppStore } from "../utils/store";
import { loginHistoryApi, avatarApi } from "../services/api";
import type { LoginSession } from "../types/audit";

export default function Profile() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const companyName = useAppStore((s) => s.companyName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [tab, setTab] = useState(0);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState("");

  // Inject Tailwind CDN only on this page
  useEffect(() => {
    const existing = document.getElementById("tailwind-cdn");
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.id = "tailwind-cdn";
      document.head.appendChild(script);
    }
    return () => {
      const el = document.getElementById("tailwind-cdn");
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    if (tab === 1) {
      setLoadingSessions(true);
      setSessionError("");
      loginHistoryApi
        .list()
        .then((resp) => setSessions(resp.data.items ?? resp.data))
        .catch(() => setSessionError(t("loginHistory.noSessions")))
        .finally(() => setLoadingSessions(false));
    }
  }, [tab, t]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatLocation = (s: LoginSession) => {
    const parts = [s.city, s.region, s.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      const resp = await avatarApi.upload(file);
      if (user) {
        setUser({ ...user, avatar_url: resp.data.avatar_url });
      }
    } catch (err: any) {
      setAvatarError(err.response?.data?.detail ?? "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initials = user?.full_name?.slice(0, 2).toUpperCase() ?? "??";

  const roleBadge: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    ADMIN: "bg-blue-100 text-blue-700",
    STAFF: "bg-green-100 text-green-700",
  };
  const roleClass = roleBadge[user?.role ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="min-h-screen bg-gray-50 -m-6 p-0">
      {/* Hero banner */}
      <div className="relative h-44 overflow-hidden rounded-none"
        style={{ background: "linear-gradient(135deg, #1B2A4A 0%, #17C1E8 100%)" }}>
        {/* Subtle pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        <div className="absolute bottom-0 left-8 pb-3">
          <p className="text-cyan-200 text-xs font-semibold tracking-widest uppercase">My Account</p>
          <h1 className="text-white text-2xl font-bold leading-tight">{user?.full_name ?? "User"}</h1>
        </div>
      </div>

      {/* Content area */}
      <div className="px-8 pb-10">
        {/* Avatar + quick info row */}
        <div className="flex items-end gap-5 -mt-12 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2152FF, #21D4FD)" }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center h-full text-white text-2xl font-bold">
                  {initials}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-md hover:bg-cyan-600 transition-colors disabled:opacity-60"
            >
              {uploadingAvatar
                ? <CircularProgress size={14} sx={{ color: "#fff" }} />
                : <PhotoCamera sx={{ fontSize: 15 }} />}
            </button>
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2 mt-12">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${roleClass}`}>
                {user?.role?.replace(/_/g, " ") ?? "—"}
              </span>
              <span className="text-xs text-gray-400">{user?.email}</span>
            </div>
            {avatarError && (
              <p className="text-xs text-red-500 mt-1">{avatarError}</p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {[t("profile.info"), t("profile.loginHistory")].map((label, i) => (
            <button
              key={label}
              onClick={() => setTab(i)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === i
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Profile Info ── */}
        {tab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
            {[
              { label: t("profile.name"), value: user?.full_name ?? "—", icon: "👤" },
              { label: t("profile.email"), value: user?.email ?? "—", icon: "✉️" },
              { label: t("profile.role"), value: user?.role?.replace(/_/g, " ") ?? "—", icon: "🔑" },
              { label: t("profile.company"), value: companyName ?? "—", icon: "🏢" },
            ].map((row) => (
              <div key={row.label}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{row.icon}</span>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{row.label}</p>
                </div>
                <p className="text-base font-semibold text-gray-800 truncate">{row.value}</p>
              </div>
            ))}

            {/* Account status card — full width */}
            <div className="md:col-span-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-5 border border-cyan-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">Account Status</p>
                  <p className="text-base font-bold text-gray-800">Active &amp; Verified</p>
                  <p className="text-xs text-gray-500 mt-0.5">Full system access granted</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Login History ── */}
        {tab === 1 && (
          <div>
            {sessionError && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl px-4 py-3 mb-4">
                {sessionError}
              </div>
            )}

            {loadingSessions ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height={52} sx={{ borderRadius: 2 }} />
                ))}
              </div>
            ) : sessions.length === 0 && !sessionError ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl px-4 py-3">
                {t("loginHistory.noSessions")}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {[
                        t("loginHistory.dateTime"),
                        t("loginHistory.browser"),
                        t("loginHistory.os"),
                        t("loginHistory.device"),
                        t("loginHistory.location"),
                        t("loginHistory.ipAddress"),
                      ].map((h) => (
                        <th key={h}
                          className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => (
                      <tr key={s.id}
                        className={`border-b border-gray-50 hover:bg-cyan-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium text-xs">{formatDate(s.created_at)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.browser ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.os ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.device_type ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{formatLocation(s)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
