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
  Tabs,
  Tab,
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
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { settingsApi, getErrorMessage } from "../../services/api";
import { tokens } from "../../theme/theme";

interface ReferenceItem {
  id: string;
  category: string;
  value: string;
}

const CATEGORIES = ["payment_method", "expense_category", "department", "revenue_account"];

const CATEGORY_COLORS: Record<string, string> = {
  payment_method: tokens.primary,
  expense_category: "#e91e63",
  department: "#9c27b0",
  revenue_account: "#4caf50",
};

const emptyForm = { category: "payment_method", value: "" };

export default function ReferenceData() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabIndex, setTabIndex] = useState(0); // 0 = All

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReferenceItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ReferenceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeCategory = tabIndex === 0 ? undefined : CATEGORIES[tabIndex - 1];

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await settingsApi.listReferenceData(activeCategory);
      setItems(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tabIndex]);

  const openAdd = () => {
    setEditing(null);
    setForm({ category: activeCategory || "payment_method", value: "" });
    setDialogError("");
    setDialogOpen(true);
  };

  const openEdit = (item: ReferenceItem) => {
    setEditing(item);
    setForm({ category: item.category, value: item.value });
    setDialogError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.value.trim()) {
      setDialogError(t("settings.value") + " required");
      return;
    }
    setSaving(true);
    setDialogError("");
    try {
      if (editing) {
        await settingsApi.updateReferenceData(editing.id, form);
      } else {
        await settingsApi.createReferenceData(form);
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
      await settingsApi.deleteReferenceData(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatCategory = (cat: string) => cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("settings.referenceData")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t("settings.addItem")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={t("common.all")} />
        {CATEGORIES.map((cat) => (
          <Tab key={cat} label={formatCategory(cat)} />
        ))}
      </Tabs>

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
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.category")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.value")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Chip
                      label={formatCategory(item.category)}
                      size="small"
                      sx={{
                        backgroundColor: `${CATEGORY_COLORS[item.category] || tokens.secondary}20`,
                        color: CATEGORY_COLORS[item.category] || tokens.secondary,
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: tokens.muted }}>
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
        <DialogTitle>{editing ? t("settings.editItem") : t("settings.addItem")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.category")}</InputLabel>
            <Select
              value={form.category}
              label={t("settings.category")}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{formatCategory(cat)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("settings.value")}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            size="small"
            fullWidth
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
