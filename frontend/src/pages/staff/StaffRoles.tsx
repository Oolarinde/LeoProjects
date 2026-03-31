import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Skeleton,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Remove as RemoveIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { groupsApi, usersApi, getErrorMessage } from "../../services/api";
import PermissionsGrid from "../../components/PermissionsGrid";
import { useAppStore } from "../../utils/store";
import { tokens } from "../../theme/theme";

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
  avatar_url?: string | null;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  is_active: boolean;
  group_id: string;
  created_at: string;
  avatar_url?: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: tokens.danger,
  ADMIN: tokens.primary,
  STAFF: tokens.secondary,
};

export default function StaffRoles() {
  const currentUser = useAppStore((s) => s.user);
  const [tabIndex, setTabIndex] = useState(0);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Role detail (permissions view)
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleRecord | null>(null);

  // Members dialog
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // User dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    role: "STAFF",
    password: "",
    group_id: "",
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesResp, usersResp] = await Promise.all([
        groupsApi.list(),
        usersApi.list(),
      ]);
      setRoles(rolesResp.data);
      setUsers(usersResp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Role CRUD ──────────────────────────────────────────────────────────────

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: {} });
    setDialogError("");
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: RoleRecord) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: { ...role.permissions },
    });
    setDialogError("");
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      setDialogError("Role name is required");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      if (editingRole) {
        await groupsApi.update(editingRole.id, {
          name: roleForm.name,
          description: roleForm.description || undefined,
          permissions: roleForm.permissions,
        });
      } else {
        await groupsApi.create({
          name: roleForm.name,
          description: roleForm.description || undefined,
          permissions: roleForm.permissions,
        });
      }
      setRoleDialogOpen(false);
      fetchData();
    } catch (err) {
      setDialogError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      await groupsApi.delete(deletingRole.id);
      setDeleteDialog(false);
      setDeletingRole(null);
      if (selectedRole?.id === deletingRole.id) setSelectedRole(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ── Role Detail (click a role to see permissions) ─────────────────────────

  const viewRoleDetail = async (role: RoleRecord) => {
    setDetailLoading(true);
    try {
      const resp = await groupsApi.get(role.id);
      setSelectedRole(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Members ────────────────────────────────────────────────────────────────

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
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
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
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMembersLoading(false);
    }
  };

  const availableUsers = allUsers.filter(
    (u) => u.is_active && !selectedRole?.members.some((m) => m.id === u.id)
  );

  // ── User CRUD ──────────────────────────────────────────────────────────────

  const canManage = (target: UserRecord) => {
    if (currentUser?.role === "SUPER_ADMIN") return target.id !== currentUser.id;
    if (currentUser?.role === "ADMIN") return target.role === "STAFF";
    return false;
  };

  const getRoleName = (groupId: string) =>
    roles.find((r) => r.id === groupId)?.name ?? "—";

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ email: "", full_name: "", role: "STAFF", password: "", group_id: roles[0]?.id ?? "" });
    setDialogError("");
    setUserDialogOpen(true);
  };

  const openEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: "",
      group_id: user.group_id,
    });
    setDialogError("");
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.full_name.trim()) { setDialogError("Name is required"); return; }
    if (!editingUser && !userForm.email.trim()) { setDialogError("Email is required"); return; }
    if (!editingUser && userForm.password.length < 8) { setDialogError("Password must be at least 8 characters"); return; }
    if (!userForm.group_id) { setDialogError("Role is required"); return; }

    setSaving(true);
    setDialogError("");
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          full_name: userForm.full_name,
          role: userForm.role,
          group_id: userForm.group_id,
        });
      } else {
        await usersApi.create({
          email: userForm.email,
          full_name: userForm.full_name,
          role: userForm.role,
          password: userForm.password,
          group_id: userForm.group_id,
        });
      }
      setUserDialogOpen(false);
      fetchData();
    } catch (err) {
      setDialogError(getErrorMessage(err));
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h1">Roles & Users</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {tabIndex === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAddRole}
              sx={{ background: tokens.gradPrimary, "&:hover": { background: tokens.gradPrimary, opacity: 0.9 } }}>
              Add Role
            </Button>
          )}
          {tabIndex === 1 && (
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openAddUser}
              sx={{ background: tokens.gradPrimary, "&:hover": { background: tokens.gradPrimary, opacity: 0.9 } }}>
              Add User
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => { setTabIndex(v); setSelectedRole(null); }}
          sx={{
            px: 2,
            "& .MuiTab-root": { fontSize: 12, fontWeight: 600, textTransform: "none", minHeight: 44 },
            "& .Mui-selected": { color: tokens.primary },
            "& .MuiTabs-indicator": { backgroundColor: tokens.primary },
          }}
        >
          <Tab icon={<SecurityIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Site Roles" />
          <Tab icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Users" />
        </Tabs>
      </Card>

      {loading ? (
        <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>
      ) : (
        <>
          {/* ─── Tab 0: Roles ──────────────────────────────────────────────── */}
          {tabIndex === 0 && (
            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
              {/* Roles list */}
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40 }}>#</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Members</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {roles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: tokens.muted }}>
                              No roles created yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          roles.map((r, idx) => (
                            <TableRow
                              key={r.id}
                              hover
                              onClick={() => viewRoleDetail(r)}
                              sx={{
                                cursor: "pointer",
                                bgcolor: selectedRole?.id === r.id ? tokens.sidebarActiveBg : undefined,
                                "&:hover": { bgcolor: "rgba(23,193,232,0.04)" },
                              }}
                            >
                              <TableCell>
                                <Typography sx={{ fontSize: 12, color: tokens.muted }}>{idx + 1}</Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                  <SecurityIcon sx={{ fontSize: 16, color: tokens.primary }} />
                                  <Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{r.name}</Typography>
                                    {r.description && (
                                      <Typography sx={{ fontSize: 11, color: tokens.muted }}>{r.description}</Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                                  label={r.member_count}
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => { e.stopPropagation(); openMembersDialog(r); }}
                                  sx={{ cursor: "pointer", borderColor: tokens.primary, color: tokens.primary }}
                                />
                              </TableCell>
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="Update Role">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => openEditRole(r)}
                                    sx={{ fontSize: 11, textTransform: "none", mr: 0.5 }}
                                  >
                                    Update Role
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => { setDeletingRole(r); setDeleteDialog(true); }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 16, color: tokens.danger }} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Role detail / permissions panel */}
              {selectedRole && (
                <Card sx={{ flex: 1, maxWidth: { md: 420 } }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="h2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <SecurityIcon sx={{ fontSize: 18, color: tokens.primary }} />
                        {selectedRole.name} Permissions
                      </Typography>
                    </Box>

                    {detailLoading ? (
                      <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={36} sx={{ mb: 1 }} />)}</Box>
                    ) : (
                      <>
                        {/* Members avatars */}
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, mb: 0.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Members ({selectedRole.members.length})
                          </Typography>
                          <AvatarGroup
                            max={6}
                            sx={{
                              justifyContent: "flex-start",
                              "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 10, fontWeight: 700, border: "2px solid #fff" },
                            }}
                          >
                            {selectedRole.members.map((m) => (
                              <Tooltip key={m.id} title={m.full_name}>
                                <Avatar sx={{ bgcolor: tokens.primary }}>{m.full_name?.slice(0, 2).toUpperCase()}</Avatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Permissions grid */}
                        <PermissionsGrid
                          value={selectedRole.permissions}
                          onChange={() => {}}
                          disabled
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* ─── Tab 1: Users ──────────────────────────────────────────────── */}
          {tabIndex === 1 && (
            <Card>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>System Role</TableCell>
                        <TableCell>Custom Role</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} sx={{ opacity: u.is_active ? 1 : 0.5 }}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar
                                src={u.avatar_url || undefined}
                                sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: tokens.primary }}
                              >
                                {u.full_name?.slice(0, 2).toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 12, color: tokens.muted }}>{u.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.role.replace(/_/g, " ")}
                              size="small"
                              sx={{
                                bgcolor: `${ROLE_COLORS[u.role] || tokens.secondary}15`,
                                color: ROLE_COLORS[u.role] || tokens.secondary,
                                fontWeight: 700,
                                fontSize: 10,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getRoleName(u.group_id)}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: tokens.primary, color: tokens.primary, fontSize: 10 }}
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
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEditUser(u)}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── Role Add/Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label="Role Name"
            value={roleForm.name}
            onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="Description"
            value={roleForm.description}
            onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
          <Typography variant="h2" sx={{ mt: 1 }}>Permissions</Typography>
          <PermissionsGrid
            value={roleForm.permissions}
            onChange={(permissions) => setRoleForm((f) => ({ ...f, permissions }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoleDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole} disabled={saving}>
            {saving ? "Saving..." : editingRole ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Role Dialog ────────────────────────────────────────────── */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deletingRole?.name}</strong>? Members will lose their permissions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteRole}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Members Dialog ────────────────────────────────────────────────── */}
      <Dialog open={membersDialogOpen} onClose={() => setMembersDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Manage Members — {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          {membersLoading ? (
            <Box sx={{ py: 2 }}>{[1, 2, 3].map((i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)}</Box>
          ) : (
            <>
              <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>
                Current Members ({selectedRole?.members.length || 0})
              </Typography>
              {selectedRole?.members.length === 0 ? (
                <Typography sx={{ color: tokens.muted, fontSize: 13, mb: 2 }}>No members yet</Typography>
              ) : (
                <List dense sx={{ mb: 2 }}>
                  {selectedRole?.members.map((m) => (
                    <ListItem key={m.id} sx={{ px: 0 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 10, mr: 1.5, bgcolor: tokens.primary }}>
                        {m.full_name?.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <ListItemText
                        primary={m.full_name}
                        secondary={m.email}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => handleRemoveMember(m.id)} disabled={membersLoading}>
                            <RemoveIcon sx={{ fontSize: 18, color: tokens.danger }} />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>Available Users</Typography>
              {availableUsers.length === 0 ? (
                <Typography sx={{ color: tokens.muted, fontSize: 13 }}>No available users</Typography>
              ) : (
                <>
                  <List dense>
                    {availableUsers.map((u) => (
                      <ListItem
                        key={u.id}
                        sx={{ px: 0, cursor: "pointer" }}
                        onClick={() =>
                          setSelectedUserIds((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                      >
                        <Checkbox checked={selectedUserIds.includes(u.id)} size="small" sx={{ mr: 1 }} />
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
                    Add Members ({selectedUserIds.length})
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── User Add/Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label="Full Name"
            value={userForm.full_name}
            onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
            size="small"
            fullWidth
            disabled={!!editingUser}
          />
          {!editingUser && (
            <TextField
              label="Temporary Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
              size="small"
              fullWidth
              helperText="User will change this after first login"
            />
          )}
          <FormControl size="small" fullWidth>
            <InputLabel>System Role</InputLabel>
            <Select
              value={userForm.role}
              label="System Role"
              onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
              disabled={editingUser?.role === "SUPER_ADMIN"}
            >
              {editingUser?.role === "SUPER_ADMIN" && <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>}
              {currentUser?.role === "SUPER_ADMIN" && <MenuItem value="ADMIN">Admin</MenuItem>}
              <MenuItem value="STAFF">Staff</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Custom Role</InputLabel>
            <Select
              value={userForm.group_id}
              label="Custom Role"
              onChange={(e) => setUserForm((f) => ({ ...f, group_id: e.target.value }))}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.name}</Typography>
                    {r.description && <Typography sx={{ fontSize: 11, color: tokens.muted }}>{r.description}</Typography>}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUserDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser} disabled={saving}>
            {saving ? "Saving..." : editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
