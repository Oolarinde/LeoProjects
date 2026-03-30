import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Switch,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { usersApi, groupsApi } from "../services/api";
import { useAppStore } from "../utils/store";
import { tokens } from "../theme/theme";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  is_active: boolean;
  permissions: Record<string, string>;
  group_id: string;
  created_at: string;
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

const ROLE_COLORS: Record<string, "error" | "primary" | "default"> = {
  SUPER_ADMIN: "error",
  ADMIN: "primary",
  STAFF: "default",
};

export default function UserManagement() {
  const { t } = useTranslation();
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "STAFF",
    password: "",
    group_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResp, rolesResp] = await Promise.all([
        usersApi.list(),
        groupsApi.list(),
      ]);
      setUsers(usersResp.data);
      setRoles(rolesResp.data);
    } catch {
      setError(t("users.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canManage = (target: UserRecord) => {
    if (currentUser?.role === "SUPER_ADMIN") return target.id !== currentUser.id;
    if (currentUser?.role === "ADMIN") return target.role === "STAFF";
    return false;
  };

  const getRoleName = (groupId: string) => {
    return roles.find((r) => r.id === groupId)?.name ?? "—";
  };

  const openAddDialog = () => {
    setEditingUser(null);
    setForm({ email: "", full_name: "", role: "STAFF", password: "", group_id: roles[0]?.id ?? "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserRecord) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: "",
      group_id: user.group_id,
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.full_name.trim()) return t("users.nameRequired");
    if (!editingUser && !form.email.trim()) return t("users.emailRequired");
    if (!editingUser && form.password.length < 8) return t("users.passwordMin");
    if (!form.group_id) return t("users.roleRequired");
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    setSaving(true);
    setDialogError("");
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          full_name: form.full_name,
          role: form.role,
          group_id: form.group_id,
        });
      } else {
        await usersApi.create({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
          group_id: form.group_id,
        });
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || t("users.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    if (togglingId) return;
    setTogglingId(user.id);
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || t("users.failedStatus"));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("users.title")}</Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t("users.addUser")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={56} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.name")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.email")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("users.systemRole")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("users.customRole")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.active")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <TableCell>{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={t(`roles.${u.role}`)}
                      size="small"
                      color={ROLE_COLORS[u.role] || "default"}
                      variant={u.role === "SUPER_ADMIN" ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleName(u.group_id)}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: tokens.primary, color: tokens.primary }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      onChange={() => handleToggleActive(u)}
                      disabled={!canManage(u) || togglingId === u.id}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canManage(u) && (
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => openEditDialog(u)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("users.noUsers")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? t("users.editUser") : t("users.addNewUser")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}

          <TextField
            label={t("users.fullName")}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            size="small"
            fullWidth
          />

          <TextField
            label={t("common.email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            size="small"
            fullWidth
            disabled={!!editingUser}
          />

          {!editingUser && (
            <TextField
              label={t("users.tempPassword")}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              size="small"
              fullWidth
              helperText={t("users.changeAfterLogin")}
            />
          )}

          <FormControl size="small" fullWidth>
            <InputLabel>{t("users.systemRole")}</InputLabel>
            <Select
              value={form.role}
              label={t("users.systemRole")}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              disabled={editingUser?.role === "SUPER_ADMIN"}
            >
              {editingUser?.role === "SUPER_ADMIN" && (
                <MenuItem value="SUPER_ADMIN">{t("roles.SUPER_ADMIN")}</MenuItem>
              )}
              {currentUser?.role === "SUPER_ADMIN" && (
                <MenuItem value="ADMIN">{t("roles.ADMIN")}</MenuItem>
              )}
              <MenuItem value="STAFF">{t("roles.STAFF")}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>{t("users.customRole")}</InputLabel>
            <Select
              value={form.group_id}
              label={t("users.customRole")}
              onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.name}</Typography>
                    {r.description && (
                      <Typography sx={{ fontSize: 11, color: tokens.muted }}>{r.description}</Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : editingUser ? t("users.update") : t("users.createUser")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
