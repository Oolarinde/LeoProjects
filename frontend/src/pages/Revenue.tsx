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
import { revenueApi, referenceApi, getErrorMessage } from "../services/api";
import { useAppStore } from "../utils/store";
import { tokens } from "../theme/theme";

interface Location {
  id: string;
  name: string;
}
interface Unit {
  id: string;
  name: string;
  location_id: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface RevenueRow {
  id: string;
  location_id: string;
  unit_id: string | null;
  account_id: string;
  date: string;
  fiscal_year: number;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  description: string | null;
  tenant_name: string | null;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Mobile Transfer", "Cheque"];

const emptyForm = {
  location_id: "",
  unit_id: "",
  account_id: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  payment_method: "",
  reference_no: "",
  description: "",
  tenant_name: "",
};

function formatNaira(value: number): string {
  return "\u20A6" + Number(value).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Revenue() {
  const { t } = useTranslation();
  const year = useAppStore((s) => s.year);
  const globalLocation = useAppStore((s) => s.location);

  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search
  const [search, setSearch] = useState("");

  // Dropdowns
  const [locations, setLocations] = useState<Location[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<RevenueRow | null>(null);
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
      const [locResp, unitResp, accResp] = await Promise.all([
        referenceApi.getLocations(),
        referenceApi.getUnits(),
        referenceApi.getAccounts(),
      ]);
      setLocations(locResp.data);
      setAllUnits(unitResp.data);
      setAccounts(accResp.data.filter((a: Account) => a.type === "Revenue"));
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
      const resp = await revenueApi.list(params);
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
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";
  const unitName = (id: string | null) => (id ? allUnits.find((u) => u.id === id)?.name ?? "—" : "—");
  const acctName = (id: string) => {
    const a = accounts.find((a) => a.id === id);
    return a ? a.name : "—";
  };

  const filteredUnits = allUnits.filter((u) => u.location_id === form.location_id);

  // Filtered by search
  const displayed = search.trim()
    ? rows.filter((r) => (r.tenant_name ?? "").toLowerCase().includes(search.toLowerCase()))
    : rows;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, location_id: filterLocationId });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (row: RevenueRow) => {
    setEditing(row);
    setForm({
      location_id: row.location_id,
      unit_id: row.unit_id ?? "",
      account_id: row.account_id,
      date: row.date,
      amount: String(row.amount),
      payment_method: row.payment_method ?? "",
      reference_no: row.reference_no ?? "",
      description: row.description ?? "",
      tenant_name: row.tenant_name ?? "",
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.location_id || !form.account_id || !form.date || !form.amount) {
      setDialogError(t("revenue.requiredFields"));
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      const payload: Record<string, unknown> = {
        location_id: form.location_id,
        account_id: form.account_id,
        date: form.date,
        amount: parseFloat(form.amount),
      };
      if (form.unit_id) payload.unit_id = form.unit_id;
      if (form.payment_method) payload.payment_method = form.payment_method;
      if (form.reference_no) payload.reference_no = form.reference_no;
      if (form.description) payload.description = form.description;
      if (form.tenant_name) payload.tenant_name = form.tenant_name;

      if (editing) {
        await revenueApi.update(editing.id, payload);
      } else {
        await revenueApi.create(payload);
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
      await revenueApi.delete(deleteTarget.id);
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
        <Typography variant="h1">{t("revenue.title")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t("revenue.addTransaction")}
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
          placeholder={t("revenue.searchTenant")}
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
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.tenant")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.location")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.unit")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.account")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t("revenue.amount")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.method")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("revenue.refNo")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.tenant_name || "—"}</TableCell>
                    <TableCell>{locName(row.location_id)}</TableCell>
                    <TableCell>{unitName(row.unit_id)}</TableCell>
                    <TableCell>{acctName(row.account_id)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontFamily: "monospace", color: "#4caf50" }}>
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
                      {t("revenue.noData")}
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
        <DialogTitle>{editing ? t("revenue.editTransaction") : t("revenue.addTransaction")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("revenue.date")}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t("revenue.tenant")}
            value={form.tenant_name}
            onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("revenue.location")}</InputLabel>
            <Select
              value={form.location_id}
              label={t("revenue.location")}
              onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value, unit_id: "" }))}
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t("revenue.unit")}</InputLabel>
            <Select
              value={form.unit_id}
              label={t("revenue.unit")}
              onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
              disabled={!form.location_id}
            >
              <MenuItem value="">{t("common.all")}</MenuItem>
              {filteredUnits.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth required>
            <InputLabel>{t("revenue.account")}</InputLabel>
            <Select
              value={form.account_id}
              label={t("revenue.account")}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("revenue.amount")}
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
            <InputLabel>{t("revenue.method")}</InputLabel>
            <Select
              value={form.payment_method}
              label={t("revenue.method")}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              <MenuItem value="">—</MenuItem>
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("revenue.refNo")}
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
