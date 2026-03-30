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
  Chip,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Divider,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { groupsApi, usersApi } from "../services/api";
import PermissionsGrid from "../components/PermissionsGrid";
import { tokens } from "../theme/theme";

interface RoleRecord {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, string>;
  member_count: number;
  created_at: string;
}

interface RoleDetail extends RoleRecord {
  members: MemberInfo[];
}

interface MemberInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  group_id: string | null;
}

export default function GroupManagement() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Role dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleRecord | null>(null);

  // Members dialog state
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const resp = await groupsApi.list();
      setRoles(resp.data);
    } catch {
      setError(t("customRoles.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openAddDialog = () => {
    setEditingRole(null);
    setForm({ name: "", description: "", permissions: {} });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleRecord) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permissions: { ...role.permissions },
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setDialogError(t("customRoles.nameRequired"));
      return;
    }

    setSaving(true);
    setDialogError("");
    try {
      if (editingRole) {
        await groupsApi.update(editingRole.id, {
          name: form.name,
          description: form.description || undefined,
          permissions: form.permissions,
        });
      } else {
        await groupsApi.create({
          name: form.name,
          description: form.description || undefined,
          permissions: form.permissions,
        });
      }
      setDialogOpen(false);
      fetchRoles();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || t("customRoles.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await groupsApi.delete(deletingRole.id);
      setDeleteDialogOpen(false);
      setDeletingRole(null);
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete role");
    }
  };

  const openMembersDialog = async (role: RoleRecord) => {
    setMembersLoading(true);
    setMembersDialogOpen(true);
    try {
      const [roleResp, usersResp] = await Promise.all([
        groupsApi.get(role.id),
        usersApi.list(),
      ]);
      setSelectedRole(roleResp.data);
      setAllUsers(usersResp.data);
      setSelectedUserIds([]);
    } catch {
      setError("Failed to load role details");
      setMembersDialogOpen(false);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedRole || selectedUserIds.length === 0) return;
    setMembersLoading(true);
    try {
      const resp = await groupsApi.addMembers(selectedRole.id, selectedUserIds);
      setSelectedRole(resp.data);
      setSelectedUserIds([]);
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add users");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedRole) return;
    setMembersLoading(true);
    try {
      const resp = await groupsApi.removeMembers(selectedRole.id, [userId]);
      setSelectedRole(resp.data);
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to remove user");
    } finally {
      setMembersLoading(false);
    }
  };

  const availableUsers = allUsers.filter(
    (u) =>
      u.is_active &&
      !selectedRole?.members.some((m) => m.id === u.id)
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("customRoles.title")}</Typography>
        <Button variant="contained" onClick={openAddDialog} startIcon={<AddIcon />}>
          {t("customRoles.addRole")}
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
      ) : roles.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <SecurityIcon sx={{ fontSize: 48, color: tokens.muted, mb: 1 }} />
          <Typography sx={{ color: tokens.muted }}>{t("customRoles.noRoles")}</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t("customRoles.roleName")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.description")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("customRoles.members")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SecurityIcon sx={{ fontSize: 16, color: tokens.primary }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{r.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: tokens.muted }}>
                      {r.description || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                      label={t("customRoles.memberCount", { count: r.member_count })}
                      size="small"
                      variant="outlined"
                      onClick={() => openMembersDialog(r)}
                      sx={{ cursor: "pointer" }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("customRoles.manageMembers")}>
                      <IconButton size="small" onClick={() => openMembersDialog(r)}>
                        <PeopleIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEditDialog(r)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDeletingRole(r);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18, color: tokens.danger }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Role Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? t("customRoles.editRole") : t("customRoles.addRole")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}

          <TextField
            label={t("customRoles.roleName")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />

          <TextField
            label={t("common.description")}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            size="small"
            fullWidth
            multiline
            rows={2}
          />

          <Typography variant="h2" sx={{ mt: 1 }}>
            {t("customRoles.permissions")}
          </Typography>
          <PermissionsGrid
            value={form.permissions}
            onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving
              ? t("common.saving")
              : editingRole
              ? t("customRoles.update")
              : t("customRoles.createRole")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("customRoles.deleteRole")}</DialogTitle>
        <DialogContent>
          <Typography>{t("customRoles.deleteConfirm")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Members Management Dialog */}
      <Dialog open={membersDialogOpen} onClose={() => setMembersDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t("customRoles.manageMembers")} — {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          {membersLoading ? (
            <Box sx={{ py: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : (
            <>
              {/* Current members */}
              <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
                {t("customRoles.currentMembers")} ({selectedRole?.members.length || 0})
              </Typography>
              {selectedRole?.members.length === 0 ? (
                <Typography sx={{ color: tokens.muted, fontSize: 13, mb: 2 }}>
                  {t("customRoles.noMembers")}
                </Typography>
              ) : (
                <List dense sx={{ mb: 2 }}>
                  {selectedRole?.members.map((m) => (
                    <ListItem key={m.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={m.full_name}
                        secondary={m.email}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title={t("customRoles.removeMembers")}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveMember(m.id)}
                            disabled={membersLoading}
                          >
                            <RemoveIcon sx={{ fontSize: 18, color: tokens.danger }} />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Available users to add */}
              <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
                {t("customRoles.availableUsers")}
              </Typography>
              {availableUsers.length === 0 ? (
                <Typography sx={{ color: tokens.muted, fontSize: 13 }}>
                  {t("customRoles.noAvailableUsers")}
                </Typography>
              ) : (
                <>
                  <List dense>
                    {availableUsers.map((u) => (
                      <ListItem
                        key={u.id}
                        sx={{ px: 0, cursor: "pointer" }}
                        onClick={() =>
                          setSelectedUserIds((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((id) => id !== u.id)
                              : [...prev, u.id]
                          )
                        }
                      >
                        <Checkbox
                          checked={selectedUserIds.includes(u.id)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={u.full_name}
                          secondary={`${u.email} • ${u.role}`}
                          primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 11 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={selectedUserIds.length === 0 || membersLoading}
                    onClick={handleAddMembers}
                    sx={{ mt: 1 }}
                  >
                    {t("customRoles.addMembers")} ({selectedUserIds.length})
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)} color="inherit">
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
