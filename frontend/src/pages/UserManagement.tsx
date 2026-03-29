import { useEffect, useState } from "react";
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
import { usersApi } from "../services/api";
import { useAppStore } from "../utils/store";
import PermissionsGrid from "../components/PermissionsGrid";
import { tokens } from "../theme/theme";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  is_active: boolean;
  permissions: Record<string, string>;
  created_at: string;
}

const ALL_WRITE: Record<string, string> = {
  dashboard: "write", revenue: "write", expenses: "write", payroll: "write",
  budget: "write", analysis: "write", ledger: "write", pnl: "write",
  cashflow: "write", balance_sheet: "write", trial_balance: "write",
  accounts: "write", employees: "write", locations: "write", reference: "write",
};

const ROLE_COLORS: Record<string, "error" | "primary" | "default"> = {
  SUPER_ADMIN: "error",
  ADMIN: "primary",
  STAFF: "default",
};

export default function UserManagement() {
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState<UserRecord[]>([]);
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
    permissions: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const resp = await usersApi.list();
      setUsers(resp.data);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const canManage = (target: UserRecord) => {
    if (currentUser?.role === "SUPER_ADMIN") return target.id !== currentUser.id;
    if (currentUser?.role === "ADMIN") return target.role === "STAFF";
    return false;
  };

  const openAddDialog = () => {
    setEditingUser(null);
    setForm({ email: "", full_name: "", role: "STAFF", password: "", permissions: {} });
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
      permissions: { ...user.permissions },
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleRoleChange = (role: string) => {
    const permissions = role === "ADMIN" ? { ...ALL_WRITE } : {};
    setForm((f) => ({ ...f, role, permissions }));
  };

  const handleSave = async () => {
    setSaving(true);
    setDialogError("");
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          full_name: form.full_name,
          role: form.role,
          permissions: form.permissions,
        });
      } else {
        if (!form.password) {
          setDialogError("Password is required for new users");
          setSaving(false);
          return;
        }
        await usersApi.create({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
          permissions: form.permissions,
        });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update user status");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">User Management</Typography>
        <Button variant="contained" onClick={openAddDialog}>
          Add User
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
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Active</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} sx={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <TableCell>{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role.replace("_", " ")}
                      size="small"
                      color={ROLE_COLORS[u.role] || "default"}
                      variant={u.role === "SUPER_ADMIN" ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      onChange={() => handleToggleActive(u)}
                      disabled={!canManage(u)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canManage(u) && (
                      <Tooltip title="Edit">
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
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: tokens.muted }}>
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}

          <TextField
            label="Full Name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            size="small"
            fullWidth
          />

          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            size="small"
            fullWidth
            disabled={!!editingUser}
          />

          {!editingUser && (
            <TextField
              label="Temporary Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              size="small"
              fullWidth
              helperText="User should change this after first login"
            />
          )}

          <FormControl size="small" fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={form.role}
              label="Role"
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              {currentUser?.role === "SUPER_ADMIN" && (
                <MenuItem value="ADMIN">Admin</MenuItem>
              )}
              <MenuItem value="STAFF">Staff</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="h2" sx={{ mt: 1 }}>
            Module Permissions
          </Typography>
          <PermissionsGrid
            value={form.permissions}
            onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingUser ? "Update" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
