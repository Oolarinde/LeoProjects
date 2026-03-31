import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Person as PersonIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CorporateFare as CompanyIcon,
} from "@mui/icons-material";
import { staffApi, settingsApi, groupApi, getErrorMessage } from "../../services/api";
import { useAppStore, isGroupAdmin } from "../../utils/store";
import { tokens } from "../../theme/theme";

interface DepartmentOption {
  id: string;
  label: string;
}

interface CostAllocation {
  company_id: string;
  company_name: string;
  percentage: number;
}

export default function StaffOnboarding() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const companies = useAppStore((s) => s.companies);
  const isGroupAdminUser = isGroupAdmin(user);

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Reference data
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Step 0: Personal info
  const [personalForm, setPersonalForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    gender: "",
    date_of_birth: "",
    address: "",
  });

  // Step 1: Employment + Company
  const [employmentForm, setEmploymentForm] = useState({
    designation: "",
    department: "",
    hire_date: new Date().toISOString().slice(0, 10),
    monthly_salary: "",
    target_company_id: "", // For GROUP_ADMIN subsidiary selection
  });

  // Step 2: Cost Allocation (GROUP_ADMIN only, otherwise skip)
  const [allocations, setAllocations] = useState<CostAllocation[]>([]);

  // Step 3: Account Setup
  const [accountForm, setAccountForm] = useState({
    create_login: true,
    login_email: "",
    role: "STAFF",
    password: "",
    confirm_password: "",
  });

  const STEPS = isGroupAdminUser && companies.length > 1
    ? ["Staff Info", "Employment & Company", "Cost Allocation", "Account Setup"]
    : ["Staff Info", "Employment Details", "Account Setup"];

  useEffect(() => {
    settingsApi.listReferenceData("department")
      .then((resp) => setDepartments(resp.data ?? []))
      .catch(() => {});
  }, []);

  // When target company changes, init allocation with 100% to that company
  useEffect(() => {
    if (employmentForm.target_company_id && isGroupAdminUser) {
      const comp = companies.find((c) => c.id === employmentForm.target_company_id);
      if (comp) {
        setAllocations([{
          company_id: comp.id,
          company_name: comp.entity_prefix || comp.name,
          percentage: 100,
        }]);
      }
    }
  }, [employmentForm.target_company_id]);

  const getAccountSetupStep = () => isGroupAdminUser && companies.length > 1 ? 3 : 2;
  const getCostAllocStep = () => isGroupAdminUser && companies.length > 1 ? 2 : -1;

  const validateStep = (): string | null => {
    if (activeStep === 0) {
      if (!personalForm.first_name.trim()) return "First name is required";
      if (!personalForm.last_name.trim()) return "Last name is required";
      if (!personalForm.email.trim()) return "Email is required";
    }
    if (activeStep === 1 && isGroupAdminUser && companies.length > 1) {
      if (!employmentForm.target_company_id) return "Please select a subsidiary company";
    }
    if (activeStep === getCostAllocStep()) {
      const total = allocations.reduce((s, a) => s + a.percentage, 0);
      if (allocations.length > 0 && Math.abs(total - 100) > 0.01) {
        return `Cost allocations must sum to 100%. Currently: ${total}%`;
      }
    }
    if (activeStep === getAccountSetupStep() && accountForm.create_login) {
      if (!accountForm.password) return "Password is required";
      if (accountForm.password.length < 8) return "Password must be at least 8 characters";
      if (accountForm.password !== accountForm.confirm_password) return "Passwords do not match";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
      // Pre-fill login email from personal email
      if (activeStep === 0 && !accountForm.login_email) {
        setAccountForm((f) => ({ ...f, login_email: personalForm.email }));
      }
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }

    setSaving(true);
    setError("");
    try {
      const fullName = `${personalForm.first_name} ${personalForm.last_name}`.trim();

      // Use staffApi.createStaff — handles company_id, login creation, date conversion natively
      const createData: Record<string, unknown> = {
        employee_ref: "", // Auto-generated by backend
        name: fullName,
        designation: employmentForm.designation || undefined,
        department: employmentForm.department || undefined,
        gender: personalForm.gender || undefined,
        phone: personalForm.phone || undefined,
        email: personalForm.email || undefined,
        hire_date: employmentForm.hire_date || undefined,
        monthly_salary: employmentForm.monthly_salary ? Number(employmentForm.monthly_salary) : undefined,
        status: "Active",
        // Login creation
        create_login: accountForm.create_login && !!accountForm.password,
        login_role: accountForm.role || "STAFF",
      };

      // GROUP_ADMIN subsidiary selection
      if (employmentForm.target_company_id && isGroupAdminUser) {
        createData.company_id = employmentForm.target_company_id;
      }

      const resp = await staffApi.createStaff(createData);
      const employeeId = resp.data?.id;

      // Set cost allocations if configured (GROUP_ADMIN with multiple allocations)
      if (employeeId && allocations.length > 0 && isGroupAdminUser) {
        try {
          await groupApi.setEmployeeAllocations(
            employeeId,
            allocations.map((a) => ({ company_id: a.company_id, percentage: a.percentage }))
          );
        } catch {
          // Employee created, allocation failed — still OK
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Cost Allocation Helpers ────────────────────────────────────────────────

  const addAllocation = () => {
    // Find a company not already allocated
    const used = new Set(allocations.map((a) => a.company_id));
    const available = companies.filter((c) => !used.has(c.id));
    if (available.length === 0) return;
    const comp = available[0];
    setAllocations([...allocations, {
      company_id: comp.id,
      company_name: comp.entity_prefix || comp.name,
      percentage: 0,
    }]);
  };

  const removeAllocation = (idx: number) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const updateAllocationCompany = (idx: number, companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    const updated = [...allocations];
    updated[idx] = { ...updated[idx], company_id: companyId, company_name: comp.entity_prefix || comp.name };
    setAllocations(updated);
  };

  const updateAllocationPercentage = (idx: number, pct: number) => {
    // Clamp value to 0–100
    const clampedPct = Math.min(100, Math.max(0, Math.round(pct)));
    const remaining = 100 - clampedPct;
    const others = allocations.filter((_, i) => i !== idx);

    if (others.length === 0) {
      // Only one subsidiary — just set it
      const updated = [...allocations];
      updated[idx] = { ...updated[idx], percentage: clampedPct };
      setAllocations(updated);
      return;
    }

    // Distribute remaining proportionally among other subsidiaries
    const othersTotal = others.reduce((s, a) => s + a.percentage, 0);
    const updated = [...allocations];
    updated[idx] = { ...updated[idx], percentage: clampedPct };

    if (othersTotal === 0) {
      // All others are 0 — distribute equally
      const equalShare = Math.floor(remaining / others.length);
      let leftover = remaining - equalShare * others.length;
      for (let i = 0; i < allocations.length; i++) {
        if (i === idx) continue;
        updated[i] = { ...updated[i], percentage: equalShare + (leftover > 0 ? 1 : 0) };
        if (leftover > 0) leftover--;
      }
    } else {
      // Proportional distribution — round to integers that sum correctly
      let distributed = 0;
      const otherIndices = allocations.map((_, i) => i).filter((i) => i !== idx);
      for (let j = 0; j < otherIndices.length; j++) {
        const i = otherIndices[j];
        if (j === otherIndices.length - 1) {
          // Last one gets the remainder to guarantee exact 100%
          updated[i] = { ...updated[i], percentage: remaining - distributed };
        } else {
          const share = Math.round((allocations[i].percentage / othersTotal) * remaining);
          updated[i] = { ...updated[i], percentage: share };
          distributed += share;
        }
      }
    }

    setAllocations(updated);
  };

  const allocationTotal = allocations.reduce((s, a) => s + a.percentage, 0);

  // ── Reset for "Add Another" ────────────────────────────────────────────────

  const resetForm = () => {
    setSuccess(false);
    setActiveStep(0);
    setPersonalForm({ first_name: "", last_name: "", phone: "", email: "", gender: "", date_of_birth: "", address: "" });
    setEmploymentForm({ designation: "", department: "", hire_date: new Date().toISOString().slice(0, 10), monthly_salary: "", target_company_id: "" });
    setAllocations([]);
    setAccountForm({ create_login: true, login_email: "", role: "STAFF", password: "", confirm_password: "" });
  };

  // ── Success Screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Card sx={{ maxWidth: 480, textAlign: "center" }}>
          <CardContent sx={{ py: 5, px: 4 }}>
            <Box
              sx={{
                width: 64, height: 64, borderRadius: "50%", background: tokens.gradSuccess,
                display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2,
              }}
            >
              <CheckIcon sx={{ fontSize: 32, color: "#fff" }} />
            </Box>
            <Typography variant="h1" sx={{ mb: 1 }}>Staff Created Successfully</Typography>
            <Typography sx={{ color: tokens.muted, mb: 3 }}>
              {personalForm.first_name} {personalForm.last_name} has been onboarded
              {employmentForm.target_company_id && isGroupAdminUser
                ? ` to ${companies.find((c) => c.id === employmentForm.target_company_id)?.name || "subsidiary"}`
                : ""}.
            </Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
              <Button variant="outlined" onClick={resetForm}>Add Another</Button>
              <Button variant="contained" onClick={() => navigate("/staff/directory")}>View Directory</Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>Create Staff</Typography>

      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 4,
          "& .MuiStepIcon-root.Mui-active": { color: tokens.primary },
          "& .MuiStepIcon-root.Mui-completed": { color: tokens.success },
          "& .MuiStepLabel-label": { fontSize: 12, fontWeight: 600 },
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ maxWidth: 680, mx: "auto" }}>
        <CardContent sx={{ py: 3, px: 4 }}>

          {/* ── Step 0: Personal Info ────────────────────────────────────── */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5 }}>Informations</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.muted, mb: 3 }}>
                Enter the staff member's personal details
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Avatar
                  sx={{ width: 80, height: 80, background: tokens.gradPrimary, fontSize: 24, fontWeight: 700 }}
                >
                  {personalForm.first_name ? personalForm.first_name[0].toUpperCase() : <PersonIcon sx={{ fontSize: 36 }} />}
                </Avatar>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="First Name" value={personalForm.first_name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, first_name: e.target.value }))}
                    size="small" fullWidth required />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Last Name" value={personalForm.last_name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, last_name: e.target.value }))}
                    size="small" fullWidth required />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Phone Number" value={personalForm.phone}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, phone: e.target.value }))}
                    size="small" fullWidth placeholder="+234" />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Email Address" type="email" value={personalForm.email}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, email: e.target.value }))}
                    size="small" fullWidth required />
                </Grid>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select value={personalForm.gender} label="Gender"
                      onChange={(e) => setPersonalForm((f) => ({ ...f, gender: e.target.value }))}>
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Date of Birth" type="date" value={personalForm.date_of_birth}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    size="small" fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Address" value={personalForm.address}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, address: e.target.value }))}
                    size="small" fullWidth multiline rows={2} />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Step 1: Employment + Company ─────────────────────────────── */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5 }}>
                {isGroupAdminUser && companies.length > 1 ? "Employment & Company" : "Employment Details"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: tokens.muted, mb: 3 }}>
                Set the staff member's position, compensation{isGroupAdminUser && companies.length > 1 ? ", and subsidiary" : ""}
              </Typography>

              <Grid container spacing={2}>
                {/* Subsidiary picker — GROUP_ADMIN only */}
                {isGroupAdminUser && companies.length > 1 && (
                  <Grid item xs={12}>
                    <FormControl size="small" fullWidth required>
                      <InputLabel>Subsidiary Company</InputLabel>
                      <Select
                        value={employmentForm.target_company_id}
                        label="Subsidiary Company"
                        onChange={(e) => setEmploymentForm((f) => ({ ...f, target_company_id: e.target.value }))}
                      >
                        {companies.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <CompanyIcon sx={{ fontSize: 16, color: tokens.primary }} />
                              <Typography sx={{ fontSize: 13 }}>
                                {c.entity_prefix ? `${c.entity_prefix} — ${c.name}` : c.name}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField label="Designation / Position" value={employmentForm.designation}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, designation: e.target.value }))}
                    size="small" fullWidth placeholder="e.g. Facility Manager" />
                </Grid>
                <Grid item xs={6}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select value={employmentForm.department} label="Department"
                      onChange={(e) => setEmploymentForm((f) => ({ ...f, department: e.target.value }))}>
                      <MenuItem value="">— None —</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.label}>{d.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Hire Date" type="date" value={employmentForm.hire_date}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, hire_date: e.target.value }))}
                    size="small" fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Monthly Salary (₦)" type="number" value={employmentForm.monthly_salary}
                    onChange={(e) => setEmploymentForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                    size="small" fullWidth placeholder="0.00" />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Step 2: Cost Allocation (GROUP_ADMIN only) ───────────────── */}
          {activeStep === getCostAllocStep() && (
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5 }}>Cost Allocation</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.muted, mb: 3 }}>
                Distribute this employee's salary cost across subsidiaries. Must total 100%.
              </Typography>

              {allocations.map((alloc, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex", alignItems: "center", gap: 2, mb: 2,
                    p: 2, borderRadius: 2, bgcolor: tokens.portalGray100, border: `1px solid ${tokens.border}`,
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Company</InputLabel>
                    <Select
                      value={alloc.company_id}
                      label="Company"
                      onChange={(e) => updateAllocationCompany(idx, e.target.value)}
                    >
                      {companies.map((c) => (
                        <MenuItem key={c.id} value={c.id} disabled={allocations.some((a, i) => i !== idx && a.company_id === c.id)}>
                          {c.entity_prefix ? `${c.entity_prefix} — ${c.name}` : c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ flex: 1, px: 1 }}>
                    <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 0.5 }}>
                      {alloc.percentage}%
                    </Typography>
                    <Slider
                      value={alloc.percentage}
                      onChange={(_, v) => updateAllocationPercentage(idx, v as number)}
                      min={0}
                      max={100}
                      step={1}
                      sx={{ color: tokens.primary }}
                    />
                  </Box>

                  <TextField
                    value={alloc.percentage}
                    onChange={(e) => updateAllocationPercentage(idx, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    type="number"
                    size="small"
                    sx={{ width: 70 }}
                    inputProps={{ min: 0, max: 100 }}
                  />
                  <Typography sx={{ fontSize: 12, color: tokens.muted }}>%</Typography>

                  {allocations.length > 1 && (
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => removeAllocation(idx)}>
                        <DeleteIcon sx={{ fontSize: 16, color: tokens.danger }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}

              {/* Add allocation button */}
              {allocations.length < companies.length && (
                <Button size="small" startIcon={<AddIcon />} onClick={addAllocation}
                  sx={{ mt: 1, mb: 2, textTransform: "none" }}>
                  Add Subsidiary
                </Button>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Total indicator */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Total Allocation</Typography>
                <Chip
                  label={`${allocationTotal}%`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: Math.abs(allocationTotal - 100) < 0.01 ? tokens.badgePaid.bg : tokens.badgeOverdue.bg,
                    color: Math.abs(allocationTotal - 100) < 0.01 ? tokens.badgePaid.color : tokens.badgeOverdue.color,
                  }}
                />
              </Box>
              {Math.abs(allocationTotal - 100) > 0.01 && (
                <Typography sx={{ fontSize: 11, color: tokens.danger, mt: 0.5 }}>
                  Allocations must sum to 100% (currently {allocationTotal}%)
                </Typography>
              )}
            </Box>
          )}

          {/* ── Account Setup Step ───────────────────────────────────────── */}
          {activeStep === getAccountSetupStep() && (
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5 }}>Account Setup</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.muted, mb: 3 }}>
                Create login credentials for the staff member
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField label="Login Email" type="email" value={accountForm.login_email}
                    onChange={(e) => setAccountForm((f) => ({ ...f, login_email: e.target.value }))}
                    size="small" fullWidth placeholder="admin@talentsapartments.com" />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Password" type="password" value={accountForm.password}
                    onChange={(e) => setAccountForm((f) => ({ ...f, password: e.target.value }))}
                    size="small" fullWidth />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Repeat Password" type="password" value={accountForm.confirm_password}
                    onChange={(e) => setAccountForm((f) => ({ ...f, confirm_password: e.target.value }))}
                    size="small" fullWidth />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Nav Buttons ──────────────────────────────────────────────── */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button onClick={() => setActiveStep((s) => s - 1)} disabled={activeStep === 0}
              startIcon={<BackIcon />} color="inherit">
              Back
            </Button>
            <Button variant="contained" onClick={handleNext} disabled={saving}
              endIcon={activeStep < STEPS.length - 1 ? <NextIcon /> : <CheckIcon />}
              sx={{ background: tokens.gradPrimary, "&:hover": { background: tokens.gradPrimary, opacity: 0.9 }, px: 3 }}>
              {saving ? "Creating..." : activeStep < STEPS.length - 1 ? "Next" : "Create Staff"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
