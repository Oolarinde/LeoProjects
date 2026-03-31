import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as DepartmentIcon,
} from "@mui/icons-material";
import { settingsApi, usersApi, getErrorMessage } from "../../services/api";
import { tokens } from "../../theme/theme";

interface Department {
  id: string;
  value: string;
  label: string;
  description?: string;
  sort_order: number;
}

interface UserRecord {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department?: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ label: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Delete
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptResp, usersResp] = await Promise.all([
        settingsApi.listReferenceData("department"),
        usersApi.list(),
      ]);
      setDepartments(deptResp.data ?? []);
      setUsers(usersResp.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDeptMembers = (deptName: string) =>
    users.filter((u: any) => u.department === deptName || u.group_name === deptName);

  const openAdd = () => {
    setEditing(null);
    setForm({ label: "", description: "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({ label: dept.label, description: dept.description || "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      setDialogError("Department name is required");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      if (editing) {
        await settingsApi.updateReferenceData(editing.id, {
          label: form.label,
          description: form.description || undefined,
        });
      } else {
        await settingsApi.createReferenceData({
          category: "department",
          value: form.label.toLowerCase().replace(/\s+/g, "_"),
          label: form.label,
          description: form.description || undefined,
        });
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setDialogError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await settingsApi.deleteReferenceData(deleting.id);
      setDeleteDialog(false);
      setDeleting(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">Departments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          sx={{
            background: tokens.gradPrimary,
            "&:hover": { background: tokens.gradPrimary, opacity: 0.9 },
          }}
        >
          Create New Department
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Department Table */}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={56} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : departments.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <DepartmentIcon sx={{ fontSize: 48, color: tokens.muted, mb: 1 }} />
              <Typography sx={{ color: tokens.muted }}>No departments created yet</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Members</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept, idx) => {
                    const members = getDeptMembers(dept.label);
                    return (
                      <TableRow
                        key={dept.id}
                        sx={{
                          "&:hover": { bgcolor: "rgba(23,193,232,0.03)" },
                          borderLeft: `3px solid ${tokens.primary}`,
                        }}
                      >
                        <TableCell>
                          <Typography sx={{ fontSize: 12, color: tokens.muted }}>{idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: tokens.primary,
                                flexShrink: 0,
                              }}
                            />
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: tokens.heading }}>
                              {dept.label}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, color: tokens.muted }}>
                            {dept.description || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {members.length > 0 ? (
                            <AvatarGroup
                              max={4}
                              sx={{
                                justifyContent: "flex-start",
                                "& .MuiAvatar-root": {
                                  width: 28,
                                  height: 28,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  border: "2px solid #fff",
                                },
                              }}
                            >
                              {members.map((m) => (
                                <Tooltip key={m.id} title={m.full_name}>
                                  <Avatar src={m.avatar_url || undefined} sx={{ bgcolor: tokens.primary }}>
                                    {m.full_name?.slice(0, 2).toUpperCase()}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </AvatarGroup>
                          ) : (
                            <Typography sx={{ fontSize: 11, color: tokens.muted, fontStyle: "italic" }}>
                              No staff assigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(dept)}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setDeleting(dept);
                                setDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 16, color: tokens.danger }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit Department" : "Create Department"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label="Department Name"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            size="small"
            fullWidth
            autoFocus
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="What does this department handle?"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleting?.label}</strong>? Staff assigned to this department will need to be reassigned.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
