import { useEffect, useState, useCallback } from "react";
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
  TablePagination,
  IconButton,
  Tooltip,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { expensesApi, referenceApi, getErrorMessage } from "../services/api";
import { useAppStore } from "../utils/store";
import { tokens } from "../theme/theme";

interface Location {
  id: string;
  name: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface ExpenseRow {
  id: string;
  location_id: string | null;
  account_id: string;
  category: string;
  date: string;
  fiscal_year: number;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  description: string | null;
  vendor_name: string | null;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Mobile Transfer", "Cheque"];
const EXPENSE_CATEGORIES = [
  "Salaries", "Construction", "Maintenance", "Utilities", "Inventory",
  "Administrative", "Loans & Advances", "Transportation",
  "IT & Communications", "Other",
];

const emptyForm = {
  location_id: "",
  account_id: "",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  payment_method: "",
  reference_no: "",
  description: "",
  vendor_name: "",
};

function formatNaira(value: number): string {
  return "\u20A6" + Number(value).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Expenses() {
  const { t } = useTranslation();
  const year = useAppStore((s) => s.year);
  const globalLocation = useAppStore((s) => s.location);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search
  const [search, setSearch] = useState("");

  // Dropdowns
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Location filter
  const [filterLocationId, setFilterLocationId] = useState<string>("");

  // Sync global location filter
  useEffect(() => {
    setFilterLocationId(globalLocation?.id ?? "");
    setPage(0);
  }, [globalLocation]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [locResp, accResp] = await Promise.all([
        referenceApi.getLocations(),
        referenceApi.getAccounts(),
      ]);
      setLocations(locResp.data);
      setAccounts(accResp.data.filter((a: Account) => a.type === "Expense"));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        year,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };
      if (filterLocationId) params.location_id = filterLocationId;
      const resp = await expensesApi.list(params);
      setRows(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [year, filterLocationId, page, rowsPerPage]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helpers
  const locName = (id: string | null) => (id ? locations.find((l) => l.id === id)?.name ?? "—" : "—");
  const acctName = (id: string) => {
    const a = accounts.find((a) => a.id === id);
    return a ? a.name : "—";
  };

  // Filtered by search
  const displayed = search.trim()
    ? rows.filter((r) => (r.vendor_name ?? "").toLowerCase().includes(search.toLowerCase()))
    : rows;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, location_id: filterLocationId });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setForm({
      location_id: row.location_id ?? "",
      account_id: row.account_id,
      category: row.category,
      date: row.date,
      amount: String(row.amount),
      payment_method: row.payment_method ?? "",
      reference_no: row.reference_no ?? "",
      description: row.description ?? "",
      vendor_name: row.vendor_name ?? "",
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_id || !form.category || !form.date || !form.amount) {
      setDialogError(t("expenses.requiredFields"));
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      const payload: Record<string, unknown> = {
        account_id: form.account_id,
        category: form.category,
        date: form.date,
        amount: parseFloat(form.amount),
      };
      if (form.location_id) payload.location_id = form.location_id;
      if (form.payment_method) payload.payment_method = form.payment_method;
      if (form.reference_no) payload.reference_no = form.reference_no;
      if (form.description) payload.description = form.description;
      if (form.vendor_name) payload.vendor_name = form.vendor_name;

      if (editing) {
        await expensesApi.update(editing.id, payload);
      } else {
        await expensesApi.create(payload);
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
      await expensesApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    Salaries: "#9c27b0",
    Construction: "#ff9800",
    Maintenance: "#2196f3",
    Utilities: "#4caf50",
    Inventory: "#795548",
    Administrative: "#607d8b",
    "Loans & Advances": "#f44336",
    Transportation: "#00bcd4",
    "IT & Communications": "#3f51b5",
    Other: "#9e9e9e",
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("expenses.title")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t("expenses.addTransaction")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Chip
          label={t("common.all")}
          variant={filterLocationId === "" ? "filled" : "outlined"}
          color={filterLocationId === "" ? "primary" : "default"}
          onClick={() => { setFilterLocationId(""); setPage(0); }}
        />
        {locations.map((loc) => (
          <Chip
            key={loc.id}
            label={loc.name}
            variant={filterLocationId === loc.id ? "filled" : "outlined"}
            color={filterLocationId === loc.id ? "primary" : "default"}
            onClick={() => { setFilterLocationId(loc.id); setPage(0); }}
          />
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          size="small"
          placeholder={t("expenses.searchVendor")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: tokens.muted }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 240 }}
        />
      </Box>

      {loading ? (
        <Box>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={56} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.vendor")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.category")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.location")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.account")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t("expenses.amount")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.method")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("expenses.refNo")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.vendor_name || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.category}
                        size="small"
                        sx={{
                          backgroundColor: `${CATEGORY_COLORS[row.category] || "#9e9e9e"}20`,
                          color: CATEGORY_COLORS[row.category] || "#9e9e9e",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{locName(row.location_id)}</TableCell>
                    <TableCell>{acctName(row.account_id)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: "monospace", color: "#e91e63" }}>
                      {formatNaira(row.amount)}
                    </TableCell>
                    <TableCell>{row.payment_method || "—"}</TableCell>
                    <TableCell sx={{ color: tokens.muted }}>{row.reference_no || "—"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {displayed.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: tokens.muted }}>
                      {t("expenses.noData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={-1}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
            labelDisplayedRows={({ from, to }) => `${from}–${to}`}
            slotProps={{ actions: { nextButton: { disabled: rows.length < rowsPerPage } } }}
          />
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t("expenses.editTransaction") : t("expenses.addTransaction")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("expenses.date")}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t("expenses.vendor")}
            value={form.vendor_name}
            onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("expenses.category")}</InputLabel>
            <Select
              value={form.category}
              label={t("expenses.category")}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t("expenses.location")}</InputLabel>
            <Select
              value={form.location_id}
              label={t("expenses.location")}
              onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
            >
              <MenuItem value="">—</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("expenses.account")}</InputLabel>
            <Select
              value={form.account_id}
              label={t("expenses.account")}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("expenses.amount")}
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            size="small"
            fullWidth
            required
            InputProps={{ startAdornment: <InputAdornment position="start">{"\u20A6"}</InputAdornment> }}
            inputProps={{ min: 0, step: "0.01" }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("expenses.method")}</InputLabel>
            <Select
              value={form.payment_method}
              label={t("expenses.method")}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              <MenuItem value="">—</MenuItem>
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("expenses.refNo")}
            value={form.reference_no}
            onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
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
