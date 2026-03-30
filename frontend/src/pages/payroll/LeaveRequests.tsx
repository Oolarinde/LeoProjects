import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { payrollApi, settingsApi, getErrorMessage } from "../../services/api";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";

interface Employee {
  id: string;
  employee_ref: string;
  name: string;
}

interface LeavePolicy {
  id: string;
  leave_type: string;
  days_per_year: number;
  is_paid: boolean;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_policy_id: string;
  start_date: string;
  end_date: string;
  days_requested: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

const emptyForm = {
  employee_id: "",
  leave_policy_id: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  days_requested: "",
  reason: "",
};

export default function LeaveRequests() {
  const { t } = useTranslation();
  const year = useAppStore((s) => s.year);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Approve / Reject
  const [actionTarget, setActionTarget] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { year };
      if (statusFilter) params.status_filter = statusFilter;
      if (employeeFilter) params.employee_id = employeeFilter;
      const [reqResp, empResp, polResp] = await Promise.all([
        payrollApi.listLeaveRequests(params),
        settingsApi.listEmployees(),
        payrollApi.listLeavePolicies(),
      ]);
      setRequests(reqResp.data);
      setEmployees(empResp.data);
      setPolicies(polResp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [year, statusFilter, employeeFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const empName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.employee_ref} — ${emp.name}` : "—";
  };
  const policyName = (id: string) =>
    policies.find((p) => p.id === id)?.leave_type ?? "—";

  const openCreate = () => {
    setForm({ ...emptyForm });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.employee_id || !form.leave_policy_id || !form.start_date || !form.end_date || !form.days_requested) {
      setDialogError(t("payroll.leave.requiredFields"));
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      await payrollApi.createLeaveRequest({
        employee_id: form.employee_id,
        leave_policy_id: form.leave_policy_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: parseFloat(form.days_requested),
        reason: form.reason || null,
      });
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      setDialogError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionSaving(true);
    try {
      if (actionType === "approve") {
        await payrollApi.updateLeaveRequestStatus(actionTarget.id, { status: "APPROVED" });
      } else {
        await payrollApi.updateLeaveRequestStatus(actionTarget.id, {
          status: "REJECTED",
          rejection_reason: rejectionReason || null,
        });
      }
      setActionTarget(null);
      setActionType(null);
      fetchAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionSaving(false);
    }
  };

  const handleCancel = async (req: LeaveRequest) => {
    try {
      await payrollApi.cancelLeaveRequest(req.id);
      fetchAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("payroll.leave.title")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t("payroll.leave.addRequest")}
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("common.status")}</InputLabel>
          <Select
            value={statusFilter}
            label={t("common.status")}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t("settings.employees")}</InputLabel>
          <Select
            value={employeeFilter}
            label={t("settings.employees")}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            {employees.map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.employee_ref} — {e.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box>{[1,2,3,4,5].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.employees")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("payroll.leave.leaveType")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("payroll.leave.period")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("payroll.leave.days")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("common.status")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("payroll.leave.reason")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{empName(req.employee_id)}</TableCell>
                  <TableCell>{policyName(req.leave_policy_id)}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {req.start_date} → {req.end_date}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{req.days_requested}</TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      size="small"
                      color={STATUS_COLORS[req.status] ?? "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ color: tokens.muted, maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={req.reason ?? ""}>
                      {req.reason || "—"}
                    </Typography>
                    {req.rejection_reason && (
                      <Typography variant="caption" sx={{ color: "error.main", display: "block" }}>
                        {req.rejection_reason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {req.status === "PENDING" && (
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => { setActionTarget(req); setActionType("approve"); }}
                        >
                          {t("payroll.leave.approve")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => { setActionTarget(req); setActionType("reject"); setRejectionReason(""); }}
                        >
                          {t("payroll.leave.reject")}
                        </Button>
                      </Box>
                    )}
                    {(req.status === "PENDING" || req.status === "APPROVED") && (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => handleCancel(req)}
                        sx={{ ml: 0.5 }}
                      >
                        {t("payroll.leave.cancel")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("payroll.leave.noRequests")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Request Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("payroll.leave.addRequest")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("settings.employees")}</InputLabel>
            <Select
              value={form.employee_id}
              label={t("settings.employees")}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            >
              {employees.map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.employee_ref} — {e.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("payroll.leave.leaveType")}</InputLabel>
            <Select
              value={form.leave_policy_id}
              label={t("payroll.leave.leaveType")}
              onChange={(e) => setForm((f) => ({ ...f, leave_policy_id: e.target.value }))}
            >
              {policies.filter((p) => p.is_paid !== undefined).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.leave_type} ({p.days_per_year} days/yr)</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("payroll.leave.startDate")}
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              size="small"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("payroll.leave.endDate")}
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              size="small"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            label={t("payroll.leave.daysRequested")}
            type="number"
            value={form.days_requested}
            onChange={(e) => setForm((f) => ({ ...f, days_requested: e.target.value }))}
            size="small"
            fullWidth
            required
            inputProps={{ min: 0.5, step: 0.5 }}
          />
          <TextField
            label={t("payroll.leave.reason")}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve / Reject dialog */}
      <Dialog open={!!actionTarget} onClose={() => setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {actionType === "approve" ? t("payroll.leave.confirmApprove") : t("payroll.leave.confirmReject")}
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          {actionType === "reject" && (
            <TextField
              label={t("payroll.leave.rejectionReason")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActionTarget(null)} color="inherit">{t("common.cancel")}</Button>
          <Button
            variant="contained"
            color={actionType === "approve" ? "success" : "error"}
            onClick={handleAction}
            disabled={actionSaving}
          >
            {actionSaving ? t("common.saving") : t("common.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
