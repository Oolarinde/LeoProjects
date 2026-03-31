import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as DepartmentIcon,
  CorporateFare as CompanyIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { settingsApi, getErrorMessage } from "../../services/api";
import { useAppStore, isGroupAdmin } from "../../utils/store";
import { tokens } from "../../theme/theme";

interface Employee {
  id: string;
  company_id: string;
  employee_ref: string;
  name: string;
  designation: string | null;
  department: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  photo_url?: string | null;
  hire_date?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  monthly_salary?: string | null;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Active: tokens.badgeActive,
  Inactive: { bg: "rgba(234,6,6,0.08)", color: "#c20505" },
  "On Leave": tokens.badgePending,
};

export default function StaffDirectory() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const companies = useAppStore((s) => s.companies);
  const isGroupAdminUser = isGroupAdmin(user);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", designation: "", department: "", phone: "", email: "",
    status: "Active", gender: "", date_of_birth: "", address: "",
    monthly_salary: "", hire_date: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await settingsApi.listEmployees();
      setEmployees(resp.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Derived filters
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];
  const getCompanyName = (companyId: string) => {
    const c = companies.find((co) => co.id === companyId);
    return c?.entity_prefix || c?.name || "—";
  };

  const filtered = employees.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) &&
        !e.employee_ref.toLowerCase().includes(search.toLowerCase()) &&
        !(e.email || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && e.department !== deptFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (companyFilter !== "ALL" && e.company_id !== companyFilter) return false;
    return true;
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  const openEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEditForm({
      name: emp.name,
      designation: emp.designation || "",
      department: emp.department || "",
      phone: emp.phone || "",
      email: emp.email || "",
      status: emp.status,
      gender: emp.gender || "",
      date_of_birth: emp.date_of_birth || "",
      address: emp.address || "",
      monthly_salary: emp.monthly_salary || "",
      hire_date: emp.hire_date || "",
    });
    setEditError("");
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editingEmp) return;
    if (!editForm.name.trim()) { setEditError("Name is required"); return; }
    setEditSaving(true);
    setEditError("");
    try {
      await settingsApi.updateEmployee(editingEmp.id, {
        name: editForm.name,
        designation: editForm.designation || undefined,
        department: editForm.department || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        status: editForm.status,
        gender: editForm.gender || undefined,
        date_of_birth: editForm.date_of_birth || undefined,
        address: editForm.address || undefined,
        monthly_salary: editForm.monthly_salary ? Number(editForm.monthly_salary) : undefined,
        hire_date: editForm.hire_date || undefined,
      });
      setEditDialog(false);
      fetchEmployees();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">Staff Directory</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/staff/onboarding")}
          sx={{ background: tokens.gradPrimary, "&:hover": { background: tokens.gradPrimary, opacity: 0.9 } }}
        >
          Add Staff
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search by name, ref, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: tokens.muted, mr: 0.5 }} /> }}
            sx={{ minWidth: 240 }}
          />

          {/* Subsidiary filter — GROUP_ADMIN only */}
          {isGroupAdminUser && companies.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Subsidiary</InputLabel>
              <Select value={companyFilter} label="Subsidiary" onChange={(e) => setCompanyFilter(e.target.value)}>
                <MenuItem value="ALL">All Companies</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <CompanyIcon sx={{ fontSize: 14, color: tokens.primary }} />
                      {c.entity_prefix ? `${c.entity_prefix} — ${c.name}` : c.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select value={deptFilter} label="Department" onChange={(e) => setDeptFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12, color: tokens.muted, ml: "auto" }}>
            Showing {filtered.length} of {employees.length} staff
          </Typography>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 5, textAlign: "center" }}>
            <PersonIcon sx={{ fontSize: 48, color: tokens.muted, mb: 1 }} />
            <Typography sx={{ color: tokens.muted }}>
              {employees.length === 0 ? "No staff members yet" : "No results match your filters"}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((emp) => {
            const badge = STATUS_BADGE[emp.status] || STATUS_BADGE.Active;
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { boxShadow: tokens.shadowHover, transform: "translateY(-2px)" },
                    "&:hover .edit-overlay": { opacity: 1 },
                    position: "relative",
                  }}
                  onClick={() => navigate(`/payroll/employees/${emp.id}`)}
                >
                  {/* Edit button overlay */}
                  <Box
                    className="edit-overlay"
                    sx={{
                      position: "absolute", top: 8, right: 8, opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon sx={{ fontSize: 12 }} />}
                      onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                      sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, bgcolor: "#fff" }}
                    >
                      Edit
                    </Button>
                  </Box>

                  <CardContent>
                    {/* Top — avatar + status */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Avatar
                        src={emp.photo_url || undefined}
                        sx={{ width: 52, height: 52, background: tokens.gradPrimary, fontSize: 16, fontWeight: 700 }}
                      >
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Chip
                        label={emp.status}
                        size="small"
                        sx={{ bgcolor: badge.bg, color: badge.color, fontWeight: 700, fontSize: 10, height: 22 }}
                      />
                    </Box>

                    {/* Name + ref */}
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: tokens.heading, mb: 0.25 }}>
                      {emp.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: tokens.primary, fontWeight: 600, mb: 1 }}>
                      {emp.employee_ref}
                    </Typography>

                    {/* Subsidiary badge — GROUP_ADMIN */}
                    {isGroupAdminUser && companies.length > 1 && (
                      <Chip
                        icon={<CompanyIcon sx={{ fontSize: 12 }} />}
                        label={getCompanyName(emp.company_id)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, mb: 1, borderColor: tokens.border }}
                      />
                    )}

                    {/* Details */}
                    {emp.designation && (
                      <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 0.5 }}>{emp.designation}</Typography>
                    )}
                    {emp.department && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                        <DepartmentIcon sx={{ fontSize: 12, color: tokens.muted }} />
                        <Typography sx={{ fontSize: 11, color: tokens.muted }}>{emp.department}</Typography>
                      </Box>
                    )}
                    {emp.email && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                        <EmailIcon sx={{ fontSize: 12, color: tokens.muted }} />
                        <Typography sx={{ fontSize: 11, color: tokens.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {emp.email}
                        </Typography>
                      </Box>
                    )}
                    {emp.phone && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 12, color: tokens.muted }} />
                        <Typography sx={{ fontSize: 11, color: tokens.muted }}>{emp.phone}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Staff — {editingEmp?.employee_ref}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {editError && <Alert severity="error">{editError}</Alert>}

          <TextField label="Full Name" value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            size="small" fullWidth required />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="Designation" value={editForm.designation}
                onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                size="small" fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Department" value={editForm.department}
                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                size="small" fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Phone" value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                size="small" fullWidth />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Email" value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                size="small" fullWidth />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select value={editForm.gender} label="Gender"
                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}>
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editForm.status} label="Status"
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Date of Birth" type="date" value={editForm.date_of_birth}
                onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                size="small" fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Hire Date" type="date" value={editForm.hire_date}
                onChange={(e) => setEditForm((f) => ({ ...f, hire_date: e.target.value }))}
                size="small" fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Monthly Salary (₦)" type="number" value={editForm.monthly_salary}
                onChange={(e) => setEditForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                size="small" fullWidth placeholder="0.00" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                size="small" fullWidth multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={editSaving}>
            {editSaving ? "Saving..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
