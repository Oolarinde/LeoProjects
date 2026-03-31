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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { payrollApi } from "../../services/api";
import { tokens } from "../../theme/theme";
import type {
  PayrollSettings,
  AllowanceType,
  DeductionType,
  TaxBracket,
  TaxBracketInput,
  LeavePolicy,
} from "../../types/payroll";

// ── Tab Panel ───────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null;
}

// ── Main Component ──────────────────────────────────────────────

export default function PayrollSetup({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <Box>
      {!embedded && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <SettingsIcon sx={{ fontSize: 28, color: tokens.primary }} />
            <Typography variant="h1">{t("payroll.setup.title")}</Typography>
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tab label={t("payroll.setup.tabs.general")} />
          <Tab label={t("payroll.setup.tabs.allowances")} />
          <Tab label={t("payroll.setup.tabs.deductions")} />
          <Tab label={t("payroll.setup.tabs.taxBrackets")} />
          <Tab label={t("payroll.setup.tabs.leavePolicies")} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <GeneralSettingsTab onError={setError} onSuccess={setSuccess} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <AllowanceTypesTab onError={setError} onSuccess={setSuccess} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <DeductionTypesTab onError={setError} onSuccess={setSuccess} />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <TaxBracketsTab onError={setError} onSuccess={setSuccess} />
          </TabPanel>
          <TabPanel value={tab} index={4}>
            <LeavePoliciesTab onError={setError} onSuccess={setSuccess} />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}

// ── Tab 1: General Settings ─────────────────────────────────────

function GeneralSettingsTab({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PayrollSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await payrollApi.getSettings();
        setForm(resp.data);
      } catch {
        onError(t("payroll.setup.failedLoad"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const resp = await payrollApi.updateSettings({
        pension_employee_pct: form.pension_employee_pct,
        pension_employer_pct: form.pension_employer_pct,
        nhf_pct: form.nhf_pct,
        nsitf_employee_pct: form.nsitf_employee_pct,
        tax_method: form.tax_method,
        enable_13th_month: form.enable_13th_month,
        fiscal_year_start_month: form.fiscal_year_start_month,
      });
      setForm(resp.data);
      onSuccess(t("payroll.setup.settingsSaved"));
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>;
  if (!form) return null;

  const updateField = (field: string, value: unknown) => setForm((f) => f ? { ...f, [field]: value } : f);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600 }}>
      <Typography variant="h3" sx={{ mb: 1 }}>{t("payroll.setup.pensionSettings")}</Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField
          label={t("payroll.setup.pensionEmployee")}
          type="number"
          size="small"
          value={form.pension_employee_pct}
          onChange={(e) => updateField("pension_employee_pct", parseFloat(e.target.value) || 0)}
          InputProps={{ endAdornment: <Typography sx={{ color: tokens.muted }}>%</Typography> }}
        />
        <TextField
          label={t("payroll.setup.pensionEmployer")}
          type="number"
          size="small"
          value={form.pension_employer_pct}
          onChange={(e) => updateField("pension_employer_pct", parseFloat(e.target.value) || 0)}
          InputProps={{ endAdornment: <Typography sx={{ color: tokens.muted }}>%</Typography> }}
        />
      </Box>

      <Typography variant="h3" sx={{ mb: 1 }}>{t("payroll.setup.statutoryDeductions")}</Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField
          label={t("payroll.setup.nhfRate")}
          type="number"
          size="small"
          value={form.nhf_pct}
          onChange={(e) => updateField("nhf_pct", parseFloat(e.target.value) || 0)}
          InputProps={{ endAdornment: <Typography sx={{ color: tokens.muted }}>%</Typography> }}
        />
        <TextField
          label={t("payroll.setup.nsitfRate")}
          type="number"
          size="small"
          value={form.nsitf_employee_pct}
          onChange={(e) => updateField("nsitf_employee_pct", parseFloat(e.target.value) || 0)}
          InputProps={{ endAdornment: <Typography sx={{ color: tokens.muted }}>%</Typography> }}
        />
      </Box>

      <Typography variant="h3" sx={{ mb: 1 }}>{t("payroll.setup.otherSettings")}</Typography>

      <FormControl size="small" sx={{ maxWidth: 300 }}>
        <InputLabel>{t("payroll.setup.taxMethod")}</InputLabel>
        <Select
          value={form.tax_method}
          label={t("payroll.setup.taxMethod")}
          onChange={(e) => updateField("tax_method", e.target.value)}
        >
          <MenuItem value="PAYE_PROGRESSIVE">PAYE Progressive (Nigeria)</MenuItem>
          <MenuItem value="FLAT_RATE">Flat Rate</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ maxWidth: 300 }}>
        <InputLabel>{t("payroll.setup.fiscalYearStart")}</InputLabel>
        <Select
          value={form.fiscal_year_start_month}
          label={t("payroll.setup.fiscalYearStart")}
          onChange={(e) => updateField("fiscal_year_start_month", e.target.value)}
        >
          {[
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
          ].map((m, i) => (
            <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={form.enable_13th_month}
            onChange={(e) => updateField("enable_13th_month", e.target.checked)}
          />
        }
        label={t("payroll.setup.enable13thMonth")}
      />

      <Box>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<SaveIcon />}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}

// ── Tab 2: Allowance Types ──────────────────────────────────────

function AllowanceTypesTab({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AllowanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AllowanceType | null>(null);
  const [form, setForm] = useState({ name: "", code: "", is_taxable: true, description: "" });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await payrollApi.listAllowanceTypes();
      setItems(resp.data);
    } catch {
      onError(t("payroll.setup.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", is_taxable: true, description: "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (item: AllowanceType) => {
    setEditing(item);
    setForm({ name: item.name, code: item.code, is_taxable: item.is_taxable, description: item.description || "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setDialogError(t("payroll.setup.nameCodeRequired"));
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      if (editing) {
        await payrollApi.updateAllowanceType(editing.id, form);
      } else {
        await payrollApi.createAllowanceType(form);
      }
      setDialogOpen(false);
      onSuccess(t("payroll.setup.saved"));
      fetchData();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await payrollApi.deleteAllowanceType(id);
      onSuccess(t("payroll.setup.deleted"));
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedDelete"));
    }
  };

  const handleToggleActive = async (item: AllowanceType) => {
    try {
      await payrollApi.updateAllowanceType(item.id, { is_active: !item.is_active });
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    }
  };

  if (loading) return <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h3">{t("payroll.setup.allowanceTypes")}</Typography>
        <Button variant="contained" size="small" onClick={openAdd} startIcon={<AddIcon />}>
          {t("common.add")}
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography sx={{ color: tokens.muted }}>{t("payroll.setup.noItems")}</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("common.name")}</TableCell>
                <TableCell>{t("payroll.setup.code")}</TableCell>
                <TableCell>{t("payroll.setup.taxable")}</TableCell>
                <TableCell>{t("common.status")}</TableCell>
                <TableCell align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{item.name}</Typography>
                    {item.description && (
                      <Typography sx={{ fontSize: 11, color: tokens.muted }}>{item.description}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={item.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.is_taxable ? t("payroll.setup.yes") : t("payroll.setup.no")}
                      size="small"
                      color={item.is_taxable ? "warning" : "success"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={item.is_active}
                      onChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" onClick={() => handleDelete(item.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t("payroll.setup.editAllowance") : t("payroll.setup.addAllowance")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("common.name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("payroll.setup.code")}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            size="small"
            fullWidth
            helperText={t("payroll.setup.codeHelp")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_taxable}
                onChange={(e) => setForm((f) => ({ ...f, is_taxable: e.target.checked }))}
              />
            }
            label={t("payroll.setup.isTaxable")}
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 3: Deduction Types ──────────────────────────────────────

const CALC_METHODS = [
  { value: "FIXED", label: "Fixed Amount" },
  { value: "PERCENTAGE_BASIC", label: "% of Basic Salary" },
  { value: "PERCENTAGE_GROSS", label: "% of Gross Salary" },
  { value: "TAX_TABLE", label: "Tax Table (PAYE)" },
  { value: "MANUAL", label: "Manual Entry" },
];

function DeductionTypesTab({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DeductionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeductionType | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    is_statutory: false,
    calculation_method: "FIXED",
    default_value: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await payrollApi.listDeductionTypes();
      setItems(resp.data);
    } catch {
      onError(t("payroll.setup.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", is_statutory: false, calculation_method: "FIXED", default_value: "", description: "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (item: DeductionType) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      is_statutory: item.is_statutory,
      calculation_method: item.calculation_method,
      default_value: item.default_value?.toString() || "",
      description: item.description || "",
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setDialogError(t("payroll.setup.nameCodeRequired"));
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      const payload = {
        name: form.name,
        code: form.code,
        is_statutory: form.is_statutory,
        calculation_method: form.calculation_method,
        default_value: form.default_value ? parseFloat(form.default_value) : undefined,
        description: form.description || undefined,
      };
      if (editing) {
        await payrollApi.updateDeductionType(editing.id, payload);
      } else {
        await payrollApi.createDeductionType(payload);
      }
      setDialogOpen(false);
      onSuccess(t("payroll.setup.saved"));
      fetchData();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await payrollApi.deleteDeductionType(id);
      onSuccess(t("payroll.setup.deleted"));
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedDelete"));
    }
  };

  const handleToggleActive = async (item: DeductionType) => {
    try {
      await payrollApi.updateDeductionType(item.id, { is_active: !item.is_active });
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    }
  };

  if (loading) return <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h3">{t("payroll.setup.deductionTypes")}</Typography>
        <Button variant="contained" size="small" onClick={openAdd} startIcon={<AddIcon />}>
          {t("common.add")}
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography sx={{ color: tokens.muted }}>{t("payroll.setup.noItems")}</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("common.name")}</TableCell>
                <TableCell>{t("payroll.setup.code")}</TableCell>
                <TableCell>{t("payroll.setup.method")}</TableCell>
                <TableCell>{t("payroll.setup.defaultValue")}</TableCell>
                <TableCell>{t("payroll.setup.statutory")}</TableCell>
                <TableCell>{t("common.status")}</TableCell>
                <TableCell align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{item.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12 }}>
                      {CALC_METHODS.find((m) => m.value === item.calculation_method)?.label || item.calculation_method}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.default_value != null ? (
                      <Typography sx={{ fontSize: 12 }}>
                        {item.calculation_method.includes("PERCENTAGE") ? `${item.default_value}%` : `₦${item.default_value.toLocaleString()}`}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: tokens.muted }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.is_statutory ? t("payroll.setup.yes") : t("payroll.setup.no")}
                      size="small"
                      color={item.is_statutory ? "error" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={item.is_active} onChange={() => handleToggleActive(item)} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" onClick={() => handleDelete(item.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t("payroll.setup.editDeduction") : t("payroll.setup.addDeduction")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("common.name")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("payroll.setup.code")}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("payroll.setup.calculationMethod")}</InputLabel>
            <Select
              value={form.calculation_method}
              label={t("payroll.setup.calculationMethod")}
              onChange={(e) => setForm((f) => ({ ...f, calculation_method: e.target.value }))}
            >
              {CALC_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {form.calculation_method !== "TAX_TABLE" && form.calculation_method !== "MANUAL" && (
            <TextField
              label={t("payroll.setup.defaultValue")}
              type="number"
              value={form.default_value}
              onChange={(e) => setForm((f) => ({ ...f, default_value: e.target.value }))}
              size="small"
              fullWidth
              helperText={
                form.calculation_method.includes("PERCENTAGE")
                  ? t("payroll.setup.percentageHelp")
                  : t("payroll.setup.fixedAmountHelp")
              }
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={form.is_statutory}
                onChange={(e) => setForm((f) => ({ ...f, is_statutory: e.target.checked }))}
              />
            }
            label={t("payroll.setup.isStatutory")}
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab 4: Tax Brackets ─────────────────────────────────────────

function TaxBracketsTab({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const { t } = useTranslation();
  const [brackets, setBrackets] = useState<TaxBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRows, setEditRows] = useState<TaxBracketInput[]>([]);
  const [editing, setEditing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await payrollApi.listTaxBrackets();
      setBrackets(resp.data);
    } catch {
      onError(t("payroll.setup.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = () => {
    setEditRows(
      brackets.map((b) => ({
        lower_bound: b.lower_bound,
        upper_bound: b.upper_bound,
        rate_pct: b.rate_pct,
        sort_order: b.sort_order,
      }))
    );
    setEditing(true);
  };

  const addRow = () => {
    const last = editRows[editRows.length - 1];
    setEditRows([...editRows, {
      lower_bound: last ? (last.upper_bound || 0) : 0,
      upper_bound: null,
      rate_pct: 0,
      sort_order: editRows.length,
    }]);
  };

  const removeRow = (idx: number) => {
    setEditRows(editRows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: string, value: string) => {
    setEditRows((rows) =>
      rows.map((r, i) =>
        i === idx ? { ...r, [field]: value === "" ? null : parseFloat(value) } : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await payrollApi.replaceTaxBrackets(
        editRows.map((r, i) => ({ ...r, sort_order: i }))
      );
      setBrackets(resp.data);
      setEditing(false);
      onSuccess(t("payroll.setup.taxBracketsSaved"));
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h3">{t("payroll.setup.payeTaxBrackets")}</Typography>
          <Typography sx={{ fontSize: 12, color: tokens.muted, mt: 0.5 }}>
            {t("payroll.setup.taxBracketsHelp")}
          </Typography>
        </Box>
        {!editing ? (
          <Button variant="contained" size="small" onClick={startEdit} startIcon={<EditIcon />}>
            {t("common.edit")}
          </Button>
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => setEditing(false)} color="inherit">
              {t("common.cancel")}
            </Button>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving} startIcon={<SaveIcon />}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </Box>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("payroll.setup.from")}</TableCell>
              <TableCell>{t("payroll.setup.to")}</TableCell>
              <TableCell>{t("payroll.setup.rate")}</TableCell>
              {editing && <TableCell width={60}></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {editing
              ? editRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.lower_bound ?? ""}
                        onChange={(e) => updateRow(idx, "lower_bound", e.target.value)}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.upper_bound ?? ""}
                        onChange={(e) => updateRow(idx, "upper_bound", e.target.value)}
                        placeholder={t("payroll.setup.noLimit")}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.rate_pct ?? ""}
                        onChange={(e) => updateRow(idx, "rate_pct", e.target.value)}
                        InputProps={{ endAdornment: <Typography sx={{ color: tokens.muted }}>%</Typography> }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeRow(idx)}>
                        <DeleteIcon sx={{ fontSize: 18, color: tokens.danger }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              : brackets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>₦{b.lower_bound.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>
                        {b.upper_bound != null ? `₦${b.upper_bound.toLocaleString()}` : t("payroll.setup.noLimit")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${b.rate_pct}%`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Button size="small" onClick={addRow} startIcon={<AddIcon />} sx={{ mt: 1 }}>
          {t("payroll.setup.addBracket")}
        </Button>
      )}
    </Box>
  );
}

// ── Tab 5: Leave Policies ───────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  UNPAID: "Unpaid Leave",
  COMPASSIONATE: "Compassionate Leave",
};

function LeavePoliciesTab({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: (msg: string) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState({
    leave_type: "ANNUAL",
    days_per_year: 15,
    is_paid: true,
    carry_over_allowed: false,
    max_carry_over_days: "",
    requires_approval: true,
  });
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await payrollApi.listLeavePolicies();
      setItems(resp.data);
    } catch {
      onError(t("payroll.setup.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const existingTypes = items.map((i) => i.leave_type);
  const availableTypes = Object.keys(LEAVE_TYPE_LABELS).filter((lt) => !existingTypes.includes(lt as typeof existingTypes[number]));

  const openAdd = () => {
    setEditing(null);
    setForm({
      leave_type: availableTypes[0] || "ANNUAL",
      days_per_year: 15,
      is_paid: true,
      carry_over_allowed: false,
      max_carry_over_days: "",
      requires_approval: true,
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (item: LeavePolicy) => {
    setEditing(item);
    setForm({
      leave_type: item.leave_type,
      days_per_year: item.days_per_year,
      is_paid: item.is_paid,
      carry_over_allowed: item.carry_over_allowed,
      max_carry_over_days: item.max_carry_over_days?.toString() || "",
      requires_approval: item.requires_approval,
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setDialogError("");
    try {
      const payload = {
        leave_type: form.leave_type,
        days_per_year: form.days_per_year,
        is_paid: form.is_paid,
        carry_over_allowed: form.carry_over_allowed,
        max_carry_over_days: form.max_carry_over_days ? parseInt(form.max_carry_over_days) : undefined,
        requires_approval: form.requires_approval,
      };
      if (editing) {
        await payrollApi.updateLeavePolicy(editing.id, payload);
      } else {
        await payrollApi.createLeavePolicy(payload);
      }
      setDialogOpen(false);
      onSuccess(t("payroll.setup.saved"));
      fetchData();
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await payrollApi.deleteLeavePolicy(id);
      onSuccess(t("payroll.setup.deleted"));
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedDelete"));
    }
  };

  const handleToggleActive = async (item: LeavePolicy) => {
    try {
      await payrollApi.updateLeavePolicy(item.id, { is_active: !item.is_active });
      fetchData();
    } catch (err: any) {
      onError(err.response?.data?.detail || t("payroll.setup.failedSave"));
    }
  };

  if (loading) return <Box>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} sx={{ mb: 1 }} />)}</Box>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h3">{t("payroll.setup.leavePoliciesTitle")}</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={openAdd}
          startIcon={<AddIcon />}
          disabled={availableTypes.length === 0}
        >
          {t("common.add")}
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography sx={{ color: tokens.muted }}>{t("payroll.setup.noItems")}</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("payroll.setup.leaveType")}</TableCell>
                <TableCell>{t("payroll.setup.daysPerYear")}</TableCell>
                <TableCell>{t("payroll.setup.paid")}</TableCell>
                <TableCell>{t("payroll.setup.carryOver")}</TableCell>
                <TableCell>{t("payroll.setup.approval")}</TableCell>
                <TableCell>{t("common.status")}</TableCell>
                <TableCell align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                      {LEAVE_TYPE_LABELS[item.leave_type] || item.leave_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13 }}>{item.days_per_year}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.is_paid ? t("payroll.setup.yes") : t("payroll.setup.no")}
                      size="small"
                      color={item.is_paid ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {item.carry_over_allowed ? (
                      <Typography sx={{ fontSize: 12 }}>
                        {t("payroll.setup.yes")} ({item.max_carry_over_days || "∞"} {t("payroll.setup.days")})
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: tokens.muted }}>{t("payroll.setup.no")}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.requires_approval ? t("payroll.setup.required") : t("payroll.setup.no")}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={item.is_active} onChange={() => handleToggleActive(item)} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" onClick={() => handleDelete(item.id)}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? t("payroll.setup.editLeavePolicy") : t("payroll.setup.addLeavePolicy")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}

          {!editing && (
            <FormControl size="small" fullWidth>
              <InputLabel>{t("payroll.setup.leaveType")}</InputLabel>
              <Select
                value={form.leave_type}
                label={t("payroll.setup.leaveType")}
                onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
              >
                {availableTypes.map((lt) => (
                  <MenuItem key={lt} value={lt}>{LEAVE_TYPE_LABELS[lt]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label={t("payroll.setup.daysPerYear")}
            type="number"
            value={form.days_per_year}
            onChange={(e) => setForm((f) => ({ ...f, days_per_year: parseInt(e.target.value) || 0 }))}
            size="small"
            fullWidth
          />

          <FormControlLabel
            control={<Switch checked={form.is_paid} onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))} />}
            label={t("payroll.setup.isPaid")}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.carry_over_allowed}
                onChange={(e) => setForm((f) => ({ ...f, carry_over_allowed: e.target.checked }))}
              />
            }
            label={t("payroll.setup.allowCarryOver")}
          />

          {form.carry_over_allowed && (
            <TextField
              label={t("payroll.setup.maxCarryOverDays")}
              type="number"
              value={form.max_carry_over_days}
              onChange={(e) => setForm((f) => ({ ...f, max_carry_over_days: e.target.value }))}
              size="small"
              fullWidth
              helperText={t("payroll.setup.leaveBlankUnlimited")}
            />
          )}

          <FormControlLabel
            control={
              <Switch
                checked={form.requires_approval}
                onChange={(e) => setForm((f) => ({ ...f, requires_approval: e.target.checked }))}
              />
            }
            label={t("payroll.setup.requiresApproval")}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
