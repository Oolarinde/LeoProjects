import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  AccountBalance as BankIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  Person as PersonIcon,
} from "@mui/icons-material";
import { payrollApi, settingsApi, getErrorMessage } from "../../services/api";
import { formatNairaDecimal } from "../../utils/format";
import { tokens } from "../../theme/theme";

interface Employee {
  id: string;
  employee_ref: string;
  name: string;
  designation: string | null;
  status: string;
  monthly_salary: string | null;
}

interface PayrollProfile {
  id: string;
  employee_id: string;
  basic_salary: string;
  pay_grade: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_sort_code: string | null;
  tax_id: string | null;
  pension_id: string | null;
  effective_date: string;
  is_active: boolean;
}

interface AllowanceType {
  id: string;
  code: string;
  name: string;
}

interface DeductionType {
  id: string;
  code: string;
  name: string;
}

interface EmployeeAllowance {
  id: string;
  allowance_type_id: string;
  amount: string;
  is_active: boolean;
}

interface EmployeeDeduction {
  id: string;
  deduction_type_id: string;
  override_value: string | null;
  is_active: boolean;
}

const emptyProfile = {
  basic_salary: "",
  pay_grade: "",
  bank_name: "",
  bank_account_no: "",
  bank_sort_code: "",
  tax_id: "",
  pension_id: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
};

export default function PayrollEmployees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PayrollProfile>>({});
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Expanded employee row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [empAllowances, setEmpAllowances] = useState<Record<string, EmployeeAllowance[]>>({});
  const [empDeductions, setEmpDeductions] = useState<Record<string, EmployeeDeduction[]>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  // Profile dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Allowance dialog
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [allowanceEmployeeId, setAllowanceEmployeeId] = useState("");
  const [allowanceForm, setAllowanceForm] = useState({ allowance_type_id: "", amount: "" });
  const [allowanceSaving, setAllowanceSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [empResp, profResp, atResp, dtResp] = await Promise.all([
        settingsApi.listEmployees(),
        payrollApi.listProfiles(),
        payrollApi.listAllowanceTypes(),
        payrollApi.listDeductionTypes(),
      ]);
      setEmployees(empResp.data);
      const profMap: Record<string, PayrollProfile> = {};
      for (const p of profResp.data) profMap[p.employee_id] = p;
      setProfiles(profMap);
      setAllowanceTypes(atResp.data);
      setDeductionTypes(dtResp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleExpand = async (emp: Employee) => {
    if (expandedId === emp.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(emp.id);
    if (!empAllowances[emp.id]) {
      setDetailLoading(true);
      try {
        const [aResp, dResp] = await Promise.all([
          payrollApi.listEmployeeAllowances(emp.id),
          payrollApi.listEmployeeDeductions(emp.id),
        ]);
        setEmpAllowances((prev) => ({ ...prev, [emp.id]: aResp.data }));
        setEmpDeductions((prev) => ({ ...prev, [emp.id]: dResp.data }));
      } catch {
        // non-critical
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const openProfileDialog = (emp: Employee) => {
    setProfileEmployee(emp);
    const existing = profiles[emp.id];
    setProfileForm(existing ? {
      basic_salary: String(existing.basic_salary),
      pay_grade: existing.pay_grade ?? "",
      bank_name: existing.bank_name ?? "",
      bank_account_no: existing.bank_account_no ?? "",
      bank_sort_code: existing.bank_sort_code ?? "",
      tax_id: existing.tax_id ?? "",
      pension_id: existing.pension_id ?? "",
      effective_date: existing.effective_date,
      is_active: existing.is_active,
    } : { ...emptyProfile });
    setProfileError("");
    setProfileDialogOpen(true);
  };

  const saveProfile = async () => {
    if (!profileForm.basic_salary || !profileForm.effective_date) {
      setProfileError("Basic salary and effective date are required");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    try {
      await payrollApi.upsertProfile({
        employee_id: profileEmployee!.id,
        basic_salary: parseFloat(profileForm.basic_salary),
        pay_grade: profileForm.pay_grade || null,
        bank_name: profileForm.bank_name || null,
        bank_account_no: profileForm.bank_account_no || null,
        bank_sort_code: profileForm.bank_sort_code || null,
        tax_id: profileForm.tax_id || null,
        pension_id: profileForm.pension_id || null,
        effective_date: profileForm.effective_date,
        is_active: profileForm.is_active,
      });
      setProfileDialogOpen(false);
      fetchAll();
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const openAllowanceDialog = (employeeId: string) => {
    setAllowanceEmployeeId(employeeId);
    setAllowanceForm({ allowance_type_id: "", amount: "" });
    setAllowanceDialogOpen(true);
  };

  const saveAllowance = async () => {
    if (!allowanceForm.allowance_type_id || !allowanceForm.amount) return;
    setAllowanceSaving(true);
    try {
      await payrollApi.upsertEmployeeAllowance(allowanceEmployeeId, {
        allowance_type_id: allowanceForm.allowance_type_id,
        amount: parseFloat(allowanceForm.amount),
      });
      setAllowanceDialogOpen(false);
      // Refresh detail for this employee
      const [aResp, dResp] = await Promise.all([
        payrollApi.listEmployeeAllowances(allowanceEmployeeId),
        payrollApi.listEmployeeDeductions(allowanceEmployeeId),
      ]);
      setEmpAllowances((prev) => ({ ...prev, [allowanceEmployeeId]: aResp.data }));
      setEmpDeductions((prev) => ({ ...prev, [allowanceEmployeeId]: dResp.data }));
    } catch {
      // show nothing, non-critical
    } finally {
      setAllowanceSaving(false);
    }
  };

  const deleteAllowance = async (employeeId: string, itemId: string) => {
    try {
      await payrollApi.deleteEmployeeAllowance(employeeId, itemId);
      const aResp = await payrollApi.listEmployeeAllowances(employeeId);
      setEmpAllowances((prev) => ({ ...prev, [employeeId]: aResp.data }));
    } catch { /* non-critical */ }
  };

  const allowanceName = (typeId: string) =>
    allowanceTypes.find((a) => a.id === typeId)?.name ?? typeId;
  const deductionName = (typeId: string) =>
    deductionTypes.find((d) => d.id === typeId)?.name ?? typeId;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("payroll.employees.title")}</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box>{[1,2,3,4,5].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 40 }} />
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.employeeRef")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.employeeName")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.designation")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.status")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("payroll.employees.basicSalary")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("payroll.employees.payGrade")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => {
                const profile = profiles[emp.id];
                const isExpanded = expandedId === emp.id;
                return (
                  <>
                    <TableRow key={emp.id} sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(emp)}>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.navy }}>{emp.employee_ref}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell sx={{ color: tokens.muted }}>{emp.designation ?? "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={emp.status}
                          size="small"
                          color={emp.status === "Active" ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {profile ? formatNairaDecimal(profile.basic_salary) : <span style={{ color: tokens.muted }}>—</span>}
                      </TableCell>
                      <TableCell sx={{ color: tokens.muted }}>{profile?.pay_grade ?? "—"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={profile ? t("payroll.employees.editProfile") : t("payroll.employees.addProfile")}>
                          <IconButton size="small" onClick={() => openProfileDialog(emp)}>
                            {profile ? <EditIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row — allowances & deductions */}
                    {isExpanded && (
                      <TableRow key={`${emp.id}-detail`}>
                        <TableCell colSpan={8} sx={{ bgcolor: "#f8fafc", py: 0 }}>
                          <Box sx={{ px: 4, py: 2 }}>
                            {detailLoading && !empAllowances[emp.id] ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {/* Allowances */}
                                <Box sx={{ minWidth: 280 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                      {t("payroll.employees.allowances")}
                                    </Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => openAllowanceDialog(emp.id)}>
                                      {t("common.add")}
                                    </Button>
                                  </Box>
                                  {(empAllowances[emp.id] ?? []).length === 0 ? (
                                    <Typography variant="body2" sx={{ color: tokens.muted }}>{t("common.noData")}</Typography>
                                  ) : (
                                    (empAllowances[emp.id] ?? []).map((a) => (
                                      <Box key={a.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                                        <Typography variant="body2">{allowanceName(a.allowance_type_id)}</Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                            {formatNairaDecimal(a.amount)}
                                          </Typography>
                                          <IconButton size="small" color="error" onClick={() => deleteAllowance(emp.id, a.id)}>
                                            <span style={{ fontSize: 14 }}>×</span>
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    ))
                                  )}
                                </Box>

                                <Divider orientation="vertical" flexItem />

                                {/* Deductions */}
                                <Box sx={{ minWidth: 280 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                    {t("payroll.employees.deductions")}
                                  </Typography>
                                  {(empDeductions[emp.id] ?? []).length === 0 ? (
                                    <Typography variant="body2" sx={{ color: tokens.muted }}>{t("common.noData")}</Typography>
                                  ) : (
                                    (empDeductions[emp.id] ?? []).map((d) => (
                                      <Box key={d.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                                        <Typography variant="body2">{deductionName(d.deduction_type_id)}</Typography>
                                        <Typography variant="body2" sx={{ color: tokens.muted }}>
                                          {d.override_value ? formatNairaDecimal(d.override_value) : t("payroll.employees.default")}
                                        </Typography>
                                      </Box>
                                    ))
                                  )}
                                </Box>

                                {/* Bank details */}
                                {profile?.bank_name && (
                                  <>
                                    <Divider orientation="vertical" flexItem />
                                    <Box sx={{ minWidth: 200 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                        <BankIcon sx={{ fontSize: 16, color: tokens.muted }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                          {t("payroll.employees.bankDetails")}
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2">{profile.bank_name}</Typography>
                                      <Typography variant="body2" sx={{ color: tokens.muted, fontFamily: "monospace" }}>
                                        {profile.bank_account_no}
                                      </Typography>
                                      {profile.tax_id && (
                                        <Typography variant="body2" sx={{ color: tokens.muted }}>
                                          TIN: {profile.tax_id}
                                        </Typography>
                                      )}
                                    </Box>
                                  </>
                                )}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("settings.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Payroll Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {profiles[profileEmployee?.id ?? ""]
            ? t("payroll.employees.editProfile")
            : t("payroll.employees.addProfile")} — {profileEmployee?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {profileError && <Alert severity="error">{profileError}</Alert>}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("payroll.employees.basicSalary")}
              type="number"
              value={profileForm.basic_salary}
              onChange={(e) => setProfileForm((f) => ({ ...f, basic_salary: e.target.value }))}
              size="small"
              fullWidth
              required
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label={t("payroll.employees.payGrade")}
              value={profileForm.pay_grade}
              onChange={(e) => setProfileForm((f) => ({ ...f, pay_grade: e.target.value }))}
              size="small"
              fullWidth
              placeholder="e.g. Grade 5"
            />
          </Box>
          <TextField
            label={t("payroll.employees.effectiveDate")}
            type="date"
            value={profileForm.effective_date}
            onChange={(e) => setProfileForm((f) => ({ ...f, effective_date: e.target.value }))}
            size="small"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <Divider><Typography variant="caption" sx={{ color: tokens.muted }}>{t("payroll.employees.bankDetails")}</Typography></Divider>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("payroll.employees.bankName")}
              value={profileForm.bank_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, bank_name: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label={t("payroll.employees.bankAccountNo")}
              value={profileForm.bank_account_no}
              onChange={(e) => setProfileForm((f) => ({ ...f, bank_account_no: e.target.value }))}
              size="small"
              fullWidth
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="TIN"
              value={profileForm.tax_id}
              onChange={(e) => setProfileForm((f) => ({ ...f, tax_id: e.target.value }))}
              size="small"
              fullWidth
              placeholder="Tax Identification Number"
            />
            <TextField
              label={t("payroll.employees.pensionId")}
              value={profileForm.pension_id}
              onChange={(e) => setProfileForm((f) => ({ ...f, pension_id: e.target.value }))}
              size="small"
              fullWidth
              placeholder="PFA Member ID"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProfileDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Allowance Dialog */}
      <Dialog open={allowanceDialogOpen} onClose={() => setAllowanceDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("payroll.employees.addAllowance")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("payroll.setup.allowanceTypes")}</InputLabel>
            <Select
              value={allowanceForm.allowance_type_id}
              label={t("payroll.setup.allowanceTypes")}
              onChange={(e) => setAllowanceForm((f) => ({ ...f, allowance_type_id: e.target.value }))}
            >
              {allowanceTypes.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("payroll.employees.amount")}
            type="number"
            value={allowanceForm.amount}
            onChange={(e) => setAllowanceForm((f) => ({ ...f, amount: e.target.value }))}
            size="small"
            fullWidth
            required
            inputProps={{ min: 0, step: "0.01" }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAllowanceDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={saveAllowance} disabled={allowanceSaving}>
            {allowanceSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
