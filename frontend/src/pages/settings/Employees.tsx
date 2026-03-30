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
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { settingsApi, getErrorMessage } from "../../services/api";
import { tokens } from "../../theme/theme";

interface Employee {
  id: string;
  ref_code: string;
  full_name: string;
  designation: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  monthly_salary: number;
  status: string;
}

const GENDERS = ["Male", "Female"];
const STATUSES = ["Active", "Non Active"];

const emptyForm = {
  ref_code: "",
  full_name: "",
  designation: "",
  gender: "",
  phone: "",
  email: "",
  monthly_salary: "",
  status: "Active",
};

const formatNaira = (amount: number) =>
  "\u20A6" + amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await settingsApi.listEmployees();
      setEmployees(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      ref_code: emp.ref_code,
      full_name: emp.full_name,
      designation: emp.designation || "",
      gender: emp.gender || "",
      phone: emp.phone || "",
      email: emp.email || "",
      monthly_salary: String(emp.monthly_salary),
      status: emp.status,
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.ref_code.trim() || !form.full_name.trim()) {
      setDialogError(t("settings.employeeRef") + " / " + t("settings.employeeName") + " required");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      const payload = {
        ...form,
        monthly_salary: parseFloat(form.monthly_salary) || 0,
      };
      if (editing) {
        await settingsApi.updateEmployee(editing.id, payload);
      } else {
        await settingsApi.createEmployee(payload);
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
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await settingsApi.deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("settings.employees")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t("settings.addEmployee")}
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
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.employeeRef")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.employeeName")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.designation")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.gender")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.phone")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.email")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("settings.salary")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.status")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} sx={{ opacity: emp.status === "Active" ? 1 : 0.6 }}>
                  <TableCell sx={{ fontWeight: 600, fontFamily: "monospace" }}>{emp.ref_code}</TableCell>
                  <TableCell>{emp.full_name}</TableCell>
                  <TableCell sx={{ color: tokens.muted }}>{emp.designation || "—"}</TableCell>
                  <TableCell>{emp.gender || "—"}</TableCell>
                  <TableCell sx={{ color: tokens.muted }}>{emp.phone || "—"}</TableCell>
                  <TableCell sx={{ color: tokens.muted }}>{emp.email || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatNaira(emp.monthly_salary)}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status}
                      size="small"
                      sx={{
                        backgroundColor: emp.status === "Active" ? tokens.badgeActive.bg : tokens.inputBg,
                        color: emp.status === "Active" ? tokens.badgeActive.color : tokens.muted,
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(emp)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(emp)}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("settings.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t("settings.editEmployee") : t("settings.addEmployee")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("settings.employeeRef")}
            value={form.ref_code}
            onChange={(e) => setForm((f) => ({ ...f, ref_code: e.target.value }))}
            size="small"
            fullWidth
            placeholder="E001"
          />
          <TextField
            label={t("settings.employeeName")}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("settings.designation")}
            value={form.designation}
            onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.gender")}</InputLabel>
            <Select
              value={form.gender}
              label={t("settings.gender")}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <MenuItem value="">—</MenuItem>
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("settings.phone")}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("settings.email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("settings.salary")}
            type="number"
            value={form.monthly_salary}
            onChange={(e) => setForm((f) => ({ ...f, monthly_salary: e.target.value }))}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: tokens.muted }}>{"\u20A6"}</Typography> }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.status")}</InputLabel>
            <Select
              value={form.status}
              label={t("settings.status")}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("settings.confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography>{t("settings.deleteWarning")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
