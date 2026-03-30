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

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  description: string | null;
}

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const BALANCE_TYPES = ["Dr", "Cr"];

const TYPE_COLORS: Record<string, string> = {
  Asset: "#2196f3",
  Liability: "#f44336",
  Equity: "#9c27b0",
  Revenue: "#4caf50",
  Expense: "#e91e63",
};

const emptyForm = {
  code: "",
  name: "",
  account_type: "Asset",
  normal_balance: "Dr",
  description: "",
};

export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await settingsApi.listAccounts();
      setAccounts(resp.data);
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

  const openEdit = (acct: Account) => {
    setEditing(acct);
    setForm({
      code: acct.code,
      name: acct.name,
      account_type: acct.account_type,
      normal_balance: acct.normal_balance,
      description: acct.description || "",
    });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setDialogError(t("settings.code") + " / " + t("settings.accountName") + " required");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      if (editing) {
        await settingsApi.updateAccount(editing.id, form);
      } else {
        await settingsApi.createAccount(form);
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
      await settingsApi.deleteAccount(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("settings.chartOfAccounts")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t("settings.addAccount")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={56} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.code")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.accountName")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.accountType")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.normalBalance")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.description")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((acct) => (
                <TableRow key={acct.id}>
                  <TableCell sx={{ fontWeight: 600, fontFamily: "monospace" }}>{acct.code}</TableCell>
                  <TableCell>{acct.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={acct.account_type}
                      size="small"
                      sx={{
                        backgroundColor: `${TYPE_COLORS[acct.account_type] || tokens.secondary}20`,
                        color: TYPE_COLORS[acct.account_type] || tokens.secondary,
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell>{acct.normal_balance}</TableCell>
                  <TableCell sx={{ color: tokens.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {acct.description || "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(acct)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" onClick={() => setDeleteTarget(acct)} color="error">
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>
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
        <DialogTitle>{editing ? t("settings.editAccount") : t("settings.addAccount")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label={t("settings.code")}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("settings.accountName")}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.accountType")}</InputLabel>
            <Select
              value={form.account_type}
              label={t("settings.accountType")}
              onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
            >
              {ACCOUNT_TYPES.map((typ) => (
                <MenuItem key={typ} value={typ}>{typ}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.normalBalance")}</InputLabel>
            <Select
              value={form.normal_balance}
              label={t("settings.normalBalance")}
              onChange={(e) => setForm((f) => ({ ...f, normal_balance: e.target.value }))}
            >
              {BALANCE_TYPES.map((b) => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("settings.description")}
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
