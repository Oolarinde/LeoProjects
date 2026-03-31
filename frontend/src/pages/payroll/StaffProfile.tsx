import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  Save as SaveIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import { staffApi, settingsApi, getErrorMessage } from "../../services/api";
import { formatNairaDecimal } from "../../utils/format";
import { tokens } from "../../theme/theme";

// ── Types ───────────────────────────────────────────────────────────────────

interface StaffProfileData {
  id: string;
  employee_ref: string;
  name: string;
  photo_url: string | null;
  designation: string | null;
  department: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  hire_date: string | null;
  monthly_salary: number | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  next_of_kin: { name: string | null; phone: string | null; relationship: string | null };
  bank: { name: string | null; account_no: string | null };
  supervisor: { id: string; name: string; employee_ref: string } | null;
  company: { id: string; name: string; entity_prefix: string | null } | null;
  cost_allocations: { company_id: string; company_name: string; entity_prefix: string | null; percentage: number }[];
  linked_user: { id: string; email: string; role: string; is_active: boolean; avatar_url: string | null } | null;
}

interface PayrollHistoryItem {
  id: string;
  year: number;
  month: number;
  status: string;
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  paye_tax: number;
  pension_employee: number;
  pension_employer: number;
  nhf: number;
  nsitf: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  run_date: string | null;
}

interface LeaveBalance {
  id: string;
  leave_type: string;
  entitled_days: number;
  carried_over_days: number;
  used_days: number;
  remaining_days: number;
  is_paid: boolean;
}

interface LeaveRequestItem {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  reason: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

interface LoginSessionItem {
  id: string;
  ip_address: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

interface EmployeeListItem {
  id: string;
  employee_ref: string;
  name: string;
  designation: string | null;
}

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEPARTMENTS = [
  "Admin", "Maintenance", "Project", "Inventory", "IT", "Accounts",
];

const GENDERS = ["Male", "Female"];

const ROLES = ["STAFF", "ADMIN", "COMPANY_ADMIN"];

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function StaffProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabIndex, setTabIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState("");

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [personalForm, setPersonalForm] = useState<Record<string, string>>({});
  const [employmentForm, setEmploymentForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Payroll history
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryItem[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [expandedPayrollId, setExpandedPayrollId] = useState<string | null>(null);

  // Leave
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear());

  // Login history
  const [loginSessions, setLoginSessions] = useState<LoginSessionItem[]>([]);
  const [, setHasLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Create login dialog
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", role: "STAFF" });
  const [loginCreating, setLoginCreating] = useState(false);
  const [loginResult, setLoginResult] = useState<{ email: string; temp_password: string } | null>(null);

  // Employee list for supervisor dropdown
  const [allEmployees, setAllEmployees] = useState<EmployeeListItem[]>([]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setError("");
      const resp = await staffApi.getProfile(employeeId);
      setProfile(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const fetchPayrollHistory = useCallback(async () => {
    if (!employeeId) return;
    setPayrollLoading(true);
    try {
      const resp = await staffApi.getPayrollHistory(employeeId);
      setPayrollHistory(resp.data);
    } catch { /* non-critical */ } finally {
      setPayrollLoading(false);
    }
  }, [employeeId]);

  const fetchLeave = useCallback(async () => {
    if (!employeeId) return;
    setLeaveLoading(true);
    try {
      const resp = await staffApi.getLeave(employeeId, leaveYear);
      setLeaveBalances(resp.data.balances);
      setLeaveRequests(resp.data.requests);
    } catch { /* non-critical */ } finally {
      setLeaveLoading(false);
    }
  }, [employeeId, leaveYear]);

  const fetchLoginHistory = useCallback(async () => {
    if (!employeeId) return;
    setLoginLoading(true);
    try {
      const resp = await staffApi.getLoginHistory(employeeId);
      setHasLogin(resp.data.has_login);
      setLoginSessions(resp.data.sessions);
    } catch { /* non-critical */ } finally {
      setLoginLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Load employees for supervisor dropdown
  useEffect(() => {
    settingsApi.listEmployees().then((resp) => {
      setAllEmployees(resp.data.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        employee_ref: e.employee_ref as string,
        name: e.name as string,
        designation: e.designation as string | null,
      })));
    }).catch(() => {});
  }, []);

  // Lazy-load tab data
  useEffect(() => {
    if (tabIndex === 3) fetchLeave();
    if (tabIndex === 4) fetchLoginHistory();
    if (tabIndex === 6) fetchPayrollHistory();
  }, [tabIndex, fetchLeave, fetchLoginHistory, fetchPayrollHistory]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const initPersonalForm = (p: StaffProfileData) => ({
    name: p.name || "",
    email: p.email || "",
    phone: p.phone || "",
    gender: p.gender || "",
    date_of_birth: p.date_of_birth || "",
    address: p.address || "",
    next_of_kin_name: p.next_of_kin?.name || "",
    next_of_kin_phone: p.next_of_kin?.phone || "",
    next_of_kin_relationship: p.next_of_kin?.relationship || "",
    bank_name: p.bank?.name || "",
    bank_account_no: p.bank?.account_no || "",
  });

  const initEmploymentForm = (p: StaffProfileData) => ({
    designation: p.designation || "",
    department: p.department || "",
    hire_date: p.hire_date || "",
    supervisor_id: p.supervisor?.id || "",
    status: p.status || "Active",
    monthly_salary: p.monthly_salary?.toString() || "",
  });

  useEffect(() => {
    if (profile) {
      setPersonalForm(initPersonalForm(profile));
      setEmploymentForm(initEmploymentForm(profile));
    }
  }, [profile]);

  const handleSavePersonal = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const resp = await staffApi.updateProfile(employeeId!, personalForm);
      setProfile(resp.data);
      setEditMode(false);
      setSaveSuccess("Personal information updated successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployment = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const payload: Record<string, unknown> = {
        designation: employmentForm.designation || null,
        department: employmentForm.department || null,
        hire_date: employmentForm.hire_date || null,
        supervisor_id: employmentForm.supervisor_id || null,
        status: employmentForm.status,
        monthly_salary: employmentForm.monthly_salary ? parseFloat(employmentForm.monthly_salary) : null,
      };
      const resp = await staffApi.updateProfile(employeeId!, payload);
      setProfile(resp.data);
      setSaveSuccess("Employment details updated successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;
    try {
      const resp = await staffApi.uploadPhoto(employeeId, file);
      setProfile((prev) => prev ? { ...prev, photo_url: resp.data.photo_url } : prev);
      setSaveSuccess("Photo updated");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const handleCreateLogin = async () => {
    if (!loginForm.email) return;
    setLoginCreating(true);
    try {
      const resp = await staffApi.createLogin(employeeId!, loginForm);
      setLoginResult({ email: resp.data.email, temp_password: resp.data.temp_password });
      fetchProfile(); // Refresh to show linked user
      fetchLoginHistory();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setLoginCreating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={200} sx={{ mb: 2 }} />
        <Skeleton height={400} />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || "Employee not found"}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/payroll/employees")}
        sx={{ mb: 2, color: tokens.muted, textTransform: "none" }}
      >
        Back to Staff Directory
      </Button>

      {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccess}</Alert>}
      {saveError && <Alert severity="error" onClose={() => setSaveError("")} sx={{ mb: 2 }}>{saveError}</Alert>}

      {/* ── Header Card ──────────────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        {/* Photo */}
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={profile.photo_url || undefined}
            sx={{
              width: 96,
              height: 96,
              bgcolor: tokens.primary,
              fontSize: 36,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </Avatar>
          <Tooltip title="Upload photo">
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                bgcolor: "white",
                border: `1px solid ${tokens.border}`,
                "&:hover": { bgcolor: tokens.bg },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
          />
        </Box>

        {/* Name & info */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.navy }}>
              {profile.name}
            </Typography>
            <Chip
              label={profile.status}
              size="small"
              color={profile.status === "Active" ? "success" : "default"}
              variant="outlined"
            />
          </Box>
          <Typography variant="body1" sx={{ color: tokens.muted, mb: 0.5 }}>
            {profile.designation || "No designation"} {profile.department ? `/ ${profile.department}` : ""}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Chip
              label={profile.employee_ref}
              size="small"
              sx={{ fontWeight: 600, bgcolor: tokens.bg, color: tokens.navy }}
            />
            {profile.company && (
              <Chip
                label={profile.company.entity_prefix ? `${profile.company.entity_prefix} - ${profile.company.name}` : profile.company.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            )}
            {profile.monthly_salary && (
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: tokens.navy }}>
                {formatNairaDecimal(profile.monthly_salary)}/mo
              </Typography>
            )}
          </Box>
        </Box>

        {/* Quick actions */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {!profile.linked_user && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<KeyIcon />}
              onClick={() => {
                setLoginForm({ email: profile.email || "", role: "STAFF" });
                setLoginResult(null);
                setLoginDialogOpen(true);
              }}
            >
              Create Login
            </Button>
          )}
        </Box>
      </Paper>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper variant="outlined">
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${tokens.border}`,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label="Personal Info" />
          <Tab label="Employment" />
          <Tab label="Payroll" />
          <Tab label="Leave" />
          <Tab label="Login & Access" />
          <Tab label="Documents" />
          <Tab label="Payroll History" />
        </Tabs>

        <Box sx={{ px: 3 }}>

          {/* ── Tab 0: Personal Info ─────────────────────────────────────── */}
          <TabPanel value={tabIndex} index={0}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              {!editMode ? (
                <Button size="small" startIcon={<EditIcon />} onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              ) : (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" color="inherit" onClick={() => { setEditMode(false); setPersonalForm(initPersonalForm(profile)); }}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSavePersonal} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={3}>
              {/* Basic info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Full Name"
                    value={personalForm.name || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, name: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <TextField
                    label="Email"
                    value={personalForm.email || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, email: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <TextField
                    label="Phone"
                    value={personalForm.phone || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, phone: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <FormControl size="small" fullWidth disabled={!editMode}>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={personalForm.gender || ""}
                      label="Gender"
                      onChange={(e) => setPersonalForm((f) => ({ ...f, gender: e.target.value }))}
                    >
                      <MenuItem value="">--</MenuItem>
                      {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={personalForm.date_of_birth || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Address"
                    value={personalForm.address || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, address: e.target.value }))}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    disabled={!editMode}
                  />
                </Box>
              </Grid>

              {/* Next of kin + bank */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Next of Kin
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
                  <TextField
                    label="Name"
                    value={personalForm.next_of_kin_name || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, next_of_kin_name: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <TextField
                    label="Phone"
                    value={personalForm.next_of_kin_phone || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, next_of_kin_phone: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <TextField
                    label="Relationship"
                    value={personalForm.next_of_kin_relationship || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, next_of_kin_relationship: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Bank Details
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Bank Name"
                    value={personalForm.bank_name || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, bank_name: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                  <TextField
                    label="Account Number"
                    value={personalForm.bank_account_no || ""}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, bank_account_no: e.target.value }))}
                    size="small"
                    fullWidth
                    disabled={!editMode}
                  />
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 1: Employment ────────────────────────────────────────── */}
          <TabPanel value={tabIndex} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Employee Ref"
                    value={profile.employee_ref}
                    size="small"
                    fullWidth
                    disabled
                    sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: tokens.navy, fontWeight: 600 } }}
                  />
                  <TextField
                    label="Company"
                    value={profile.company?.name || ""}
                    size="small"
                    fullWidth
                    disabled
                  />
                  <TextField
                    label="Designation"
                    value={employmentForm.designation || ""}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, designation: e.target.value }))}
                    size="small"
                    fullWidth
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={employmentForm.department || ""}
                      label="Department"
                      onChange={(e) => setEmploymentForm((f) => ({ ...f, department: e.target.value }))}
                    >
                      <MenuItem value="">--</MenuItem>
                      {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Hire Date"
                    type="date"
                    value={employmentForm.hire_date || ""}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, hire_date: e.target.value }))}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Supervisor</InputLabel>
                    <Select
                      value={employmentForm.supervisor_id || ""}
                      label="Supervisor"
                      onChange={(e) => setEmploymentForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                    >
                      <MenuItem value="">None</MenuItem>
                      {allEmployees
                        .filter((e) => e.id !== profile.id)
                        .map((e) => (
                          <MenuItem key={e.id} value={e.id}>
                            {e.employee_ref} - {e.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Monthly Salary"
                    type="number"
                    value={employmentForm.monthly_salary || ""}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                    size="small"
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={employmentForm.status || "Active"}
                      label="Status"
                      onChange={(e) => setEmploymentForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Non Active">Non Active</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Cost allocations - read only */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Cost Allocation
                </Typography>
                {profile.cost_allocations.length === 0 ? (
                  <Typography variant="body2" sx={{ color: tokens.muted }}>No cost allocations set</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profile.cost_allocations.map((a) => (
                          <TableRow key={a.company_id}>
                            <TableCell>
                              {a.entity_prefix ? `${a.entity_prefix} - ` : ""}{a.company_name}
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                              {a.percentage}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveEmployment} disabled={saving}>
                {saving ? "Saving..." : "Save Employment Details"}
              </Button>
            </Box>
          </TabPanel>

          {/* ── Tab 2: Payroll (summary) ─────────────────────────────────── */}
          <TabPanel value={tabIndex} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Compensation
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: tokens.muted }}>Monthly Salary</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {profile.monthly_salary ? formatNairaDecimal(profile.monthly_salary) : "--"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: tokens.muted }}>Annual Salary</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {profile.monthly_salary ? formatNairaDecimal(profile.monthly_salary * 12) : "--"}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Cost Allocation
                </Typography>
                {profile.cost_allocations.length === 0 ? (
                  <Typography variant="body2" sx={{ color: tokens.muted }}>No cost allocations set</Typography>
                ) : (
                  profile.cost_allocations.map((a) => (
                    <Box key={a.company_id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                      <Typography variant="body2">
                        {a.entity_prefix ? `${a.entity_prefix} - ` : ""}{a.company_name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {a.percentage}%
                        {profile.monthly_salary ? ` (${formatNairaDecimal(profile.monthly_salary * a.percentage / 100)})` : ""}
                      </Typography>
                    </Box>
                  ))
                )}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ color: tokens.muted }}>
                  For detailed payroll profile (allowances, deductions, tax ID, pension ID), go to the Staff Directory and click the payroll profile icon.
                </Typography>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 3: Leave ─────────────────────────────────────────────── */}
          <TabPanel value={tabIndex} index={3}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.navy }}>
                Leave Balances
              </Typography>
              <TextField
                type="number"
                size="small"
                label="Year"
                value={leaveYear}
                onChange={(e) => setLeaveYear(parseInt(e.target.value) || new Date().getFullYear())}
                sx={{ width: 100 }}
              />
            </Box>

            {leaveLoading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                {leaveBalances.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>No leave balances found for {leaveYear}</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Leave Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Entitled</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Carried Over</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Used</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Remaining</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaveBalances.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell sx={{ fontWeight: 600 }}>{b.leave_type}</TableCell>
                            <TableCell align="right">{b.entitled_days}</TableCell>
                            <TableCell align="right">{b.carried_over_days}</TableCell>
                            <TableCell align="right">{b.used_days}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: b.remaining_days > 0 ? "success.main" : "error.main" }}>
                              {b.remaining_days}
                            </TableCell>
                            <TableCell>
                              <Chip label={b.is_paid ? "Yes" : "No"} size="small" color={b.is_paid ? "success" : "default"} variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.navy, mb: 2 }}>
                  Leave Requests
                </Typography>
                {leaveRequests.length === 0 ? (
                  <Alert severity="info">No leave requests found</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>From</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>To</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Days</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaveRequests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell sx={{ fontWeight: 600 }}>{r.leave_type}</TableCell>
                            <TableCell>{r.start_date}</TableCell>
                            <TableCell>{r.end_date}</TableCell>
                            <TableCell align="right">{r.days_requested}</TableCell>
                            <TableCell>
                              <Chip
                                label={r.status}
                                size="small"
                                color={
                                  r.status === "APPROVED" ? "success" :
                                  r.status === "PENDING" ? "warning" :
                                  r.status === "REJECTED" ? "error" : "default"
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ color: tokens.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.reason || "--"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </TabPanel>

          {/* ── Tab 4: Login & Access ────────────────────────────────────── */}
          <TabPanel value={tabIndex} index={4}>
            {loginLoading ? (
              <CircularProgress size={24} />
            ) : !profile.linked_user ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <LockIcon sx={{ fontSize: 48, color: tokens.border, mb: 2 }} />
                <Typography variant="h6" sx={{ color: tokens.muted, mb: 1 }}>
                  No Login Account
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.muted, mb: 3 }}>
                  This employee does not have a system login. Create one to give them access.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<KeyIcon />}
                  onClick={() => {
                    setLoginForm({ email: profile.email || "", role: "STAFF" });
                    setLoginResult(null);
                    setLoginDialogOpen(true);
                  }}
                >
                  Create Login Account
                </Button>
              </Box>
            ) : (
              <>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                      Account Details
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: tokens.muted }}>Email</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.linked_user.email}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: tokens.muted }}>Role</Typography>
                        <Chip label={profile.linked_user.role} size="small" variant="outlined" />
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: tokens.muted }}>Status</Typography>
                        <Chip
                          label={profile.linked_user.is_active ? "Active" : "Inactive"}
                          size="small"
                          color={profile.linked_user.is_active ? "success" : "error"}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.navy }}>
                  Login History
                </Typography>
                {loginSessions.length === 0 ? (
                  <Alert severity="info">No login sessions recorded</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Browser</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>OS</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Device</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loginSessions.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{s.ip_address}</TableCell>
                            <TableCell>{s.browser || "--"}</TableCell>
                            <TableCell>{s.os || "--"}</TableCell>
                            <TableCell>{s.device_type || "--"}</TableCell>
                            <TableCell>{[s.city, s.country].filter(Boolean).join(", ") || "--"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </TabPanel>

          {/* ── Tab 5: Documents ─────────────────────────────────────────── */}
          <TabPanel value={tabIndex} index={5}>
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6" sx={{ color: tokens.muted, mb: 1 }}>
                Documents
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.muted }}>
                Document upload and management coming soon.
              </Typography>
            </Box>
          </TabPanel>

          {/* ── Tab 6: Payroll History ───────────────────────────────────── */}
          <TabPanel value={tabIndex} index={6}>
            {payrollLoading ? (
              <CircularProgress size={24} />
            ) : payrollHistory.length === 0 ? (
              <Alert severity="info">No payroll records found for this employee</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 40 }} />
                      <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Gross Pay</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Deductions</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Net Pay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrollHistory.map((item) => {
                      const isExpanded = expandedPayrollId === item.id;
                      return (
                        <>
                          <TableRow
                            key={item.id}
                            hover
                            sx={{ cursor: "pointer" }}
                            onClick={() => setExpandedPayrollId(isExpanded ? null : item.id)}
                          >
                            <TableCell>
                              <ExpandMoreIcon
                                sx={{
                                  fontSize: 18,
                                  transition: "transform 0.2s",
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {MONTHS[item.month]} {item.year}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.status}
                                size="small"
                                color={
                                  item.status === "APPROVED" || item.status === "PAID" ? "success" :
                                  item.status === "CALCULATED" ? "info" :
                                  item.status === "CANCELLED" ? "error" : "default"
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                              {formatNairaDecimal(item.gross_pay)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace", color: "error.main" }}>
                              {formatNairaDecimal(item.total_deductions)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                              {formatNairaDecimal(item.net_pay)}
                            </TableCell>
                          </TableRow>

                          {/* Expanded detail */}
                          <TableRow key={`${item.id}-detail`}>
                            <TableCell colSpan={6} sx={{ py: 0, border: isExpanded ? undefined : "none" }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 2, px: 4 }}>
                                  <Grid container spacing={4}>
                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.navy, display: "block", mb: 1 }}>
                                        Earnings
                                      </Typography>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">Basic Salary</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.basic_salary)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">Allowances</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.total_allowances)}
                                        </Typography>
                                      </Box>
                                      <Divider sx={{ my: 1 }} />
                                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Gross Pay</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                                          {formatNairaDecimal(item.gross_pay)}
                                        </Typography>
                                      </Box>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.navy, display: "block", mb: 1 }}>
                                        Deductions
                                      </Typography>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">PAYE Tax</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.paye_tax)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">Pension (Employee)</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.pension_employee)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">Pension (Employer)</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.pension_employer)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">NHF</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.nhf)}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                        <Typography variant="body2">NSITF</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                          {formatNairaDecimal(item.nsitf)}
                                        </Typography>
                                      </Box>
                                      {item.other_deductions > 0 && (
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                          <Typography variant="body2">Other</Typography>
                                          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                            {formatNairaDecimal(item.other_deductions)}
                                          </Typography>
                                        </Box>
                                      )}
                                      <Divider sx={{ my: 1 }} />
                                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Deductions</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "error.main" }}>
                                          {formatNairaDecimal(item.total_deductions)}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* ── Create Login Dialog ──────────────────────────────────────────── */}
      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Login Account</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {loginResult ? (
            <Alert severity="success">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Login account created successfully. Share these credentials with the employee:
              </Typography>
              <Box sx={{ bgcolor: tokens.bg, p: 2, borderRadius: 1, fontFamily: "monospace" }}>
                <Typography variant="body2">Email: <strong>{loginResult.email}</strong></Typography>
                <Typography variant="body2">Temporary Password: <strong>{loginResult.temp_password}</strong></Typography>
              </Box>
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: tokens.muted }}>
                The employee should change this password after first login.
              </Typography>
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: tokens.muted }}>
                Create a system login account for {profile.name}. A temporary password will be generated.
              </Typography>
              <TextField
                label="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                size="small"
                fullWidth
                required
                type="email"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={loginForm.role}
                  label="Role"
                  onChange={(e) => setLoginForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLoginDialogOpen(false)} color="inherit">
            {loginResult ? "Close" : "Cancel"}
          </Button>
          {!loginResult && (
            <Button
              variant="contained"
              onClick={handleCreateLogin}
              disabled={loginCreating || !loginForm.email}
              startIcon={<KeyIcon />}
            >
              {loginCreating ? "Creating..." : "Create Account"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
