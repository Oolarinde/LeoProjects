import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Alert,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { loginHistoryApi } from "../services/api";
import type { LoginSession } from "../types/audit";

export default function Profile() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const companyName = useAppStore((s) => s.companyName);
  const [tab, setTab] = useState(0);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState("");

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
    return parts.length > 0 ? parts.join(", ") : "--";
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            background: tokens.gradPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Person sx={{ fontSize: 24, color: "#fff" }} />
        </Box>
        <Box>
          <Typography variant="h1">{t("profile.title")}</Typography>
          <Typography sx={{ fontSize: 13, color: tokens.muted }}>
            {user?.email}
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: `1px solid ${tokens.border}` }}
      >
        <Tab label={t("profile.info")} sx={{ textTransform: "none", fontWeight: 600 }} />
        <Tab label={t("profile.loginHistory")} sx={{ textTransform: "none", fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && (
        <Card variant="outlined" sx={{ maxWidth: 520 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 3 }}>
            {[
              { label: t("profile.name"), value: user?.full_name ?? "--" },
              { label: t("profile.email"), value: user?.email ?? "--" },
              { label: t("profile.role"), value: user?.role?.replace(/_/g, " ") ?? "--" },
              { label: t("profile.company"), value: companyName ?? "--" },
            ].map((row) => (
              <Box key={row.label}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.muted, textTransform: "uppercase", mb: 0.25 }}>
                  {row.label}
                </Typography>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: tokens.heading }}>
                  {row.value}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Box>
          {sessionError && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {sessionError}
            </Alert>
          )}

          {loadingSessions ? (
            <Box>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
              ))}
            </Box>
          ) : sessions.length === 0 && !sessionError ? (
            <Alert severity="info">{t("loginHistory.noSessions")}</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.dateTime")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.browser")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.os")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.device")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.location")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("loginHistory.ipAddress")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(s.created_at)}</TableCell>
                      <TableCell>{s.browser ?? "--"}</TableCell>
                      <TableCell>{s.os ?? "--"}</TableCell>
                      <TableCell>{s.device_type ?? "--"}</TableCell>
                      <TableCell>{formatLocation(s)}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{s.ip_address}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
}
