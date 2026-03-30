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
  Switch,
  FormControlLabel,
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

interface Location {
  id: string;
  name: string;
  address: string | null;
  unit_count?: number;
}

interface Unit {
  id: string;
  name: string;
  location_id: string;
  unit_type: string | null;
  is_active: boolean;
}

const emptyLocationForm = { name: "", address: "" };
const emptyUnitForm = { name: "", location_id: "", unit_type: "", is_active: true };

export default function LocationsAndUnits() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Location dialog
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [locForm, setLocForm] = useState(emptyLocationForm);
  const [locSaving, setLocSaving] = useState(false);
  const [locDialogError, setLocDialogError] = useState("");

  // Unit dialog
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitDialogError, setUnitDialogError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: "location" | "unit"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const resp = await settingsApi.listLocations();
      setLocations(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async (locationId: string) => {
    try {
      const resp = await settingsApi.listUnits(locationId);
      setUnits(resp.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchUnits(selectedLocation);
    } else {
      setUnits([]);
    }
  }, [selectedLocation]);

  // Location handlers
  const openAddLocation = () => {
    setEditingLoc(null);
    setLocForm(emptyLocationForm);
    setLocDialogError("");
    setLocDialogOpen(true);
  };

  const openEditLocation = (loc: Location) => {
    setEditingLoc(loc);
    setLocForm({ name: loc.name, address: loc.address || "" });
    setLocDialogError("");
    setLocDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!locForm.name.trim()) {
      setLocDialogError(t("settings.locationName") + " required");
      return;
    }
    setLocSaving(true);
    setLocDialogError("");
    try {
      if (editingLoc) {
        await settingsApi.updateLocation(editingLoc.id, locForm);
      } else {
        await settingsApi.createLocation(locForm);
      }
      setLocDialogOpen(false);
      fetchLocations();
    } catch (err) {
      setLocDialogError(getErrorMessage(err));
    } finally {
      setLocSaving(false);
    }
  };

  // Unit handlers
  const openAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({ ...emptyUnitForm, location_id: selectedLocation || "" });
    setUnitDialogError("");
    setUnitDialogOpen(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      location_id: unit.location_id,
      unit_type: unit.unit_type || "",
      is_active: unit.is_active,
    });
    setUnitDialogError("");
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim() || !unitForm.location_id) {
      setUnitDialogError(t("settings.unitName") + " / " + t("settings.locations") + " required");
      return;
    }
    setUnitSaving(true);
    setUnitDialogError("");
    try {
      if (editingUnit) {
        await settingsApi.updateUnit(editingUnit.id, unitForm);
      } else {
        await settingsApi.createUnit(unitForm);
      }
      setUnitDialogOpen(false);
      if (selectedLocation) fetchUnits(selectedLocation);
    } catch (err) {
      setUnitDialogError(getErrorMessage(err));
    } finally {
      setUnitSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "location") {
        await settingsApi.deleteLocation(deleteTarget.id);
        if (selectedLocation === deleteTarget.id) {
          setSelectedLocation(null);
        }
        fetchLocations();
      } else {
        await settingsApi.deleteUnit(deleteTarget.id);
        if (selectedLocation) fetchUnits(selectedLocation);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h1">{t("settings.locations")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAddLocation}>
          {t("settings.addLocation")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Locations Table */}
      {loading ? (
        <Box>
          {[1, 2].map((i) => (
            <Skeleton key={i} height={56} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.locationName")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.address")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t("settings.unitCount")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.map((loc) => (
                <TableRow
                  key={loc.id}
                  hover
                  selected={selectedLocation === loc.id}
                  onClick={() => setSelectedLocation(loc.id === selectedLocation ? null : loc.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{loc.name}</TableCell>
                  <TableCell sx={{ color: tokens.muted }}>{loc.address || "—"}</TableCell>
                  <TableCell>{loc.unit_count ?? "—"}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t("common.edit")}>
                      <IconButton size="small" onClick={() => openEditLocation(loc)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("common.delete")}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget({ type: "location", id: loc.id })}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("settings.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Units Section */}
      {selectedLocation && (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h2">
              {t("settings.units")} — {locations.find((l) => l.id === selectedLocation)?.name}
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddUnit}>
              {t("settings.addUnit")}
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t("settings.unitName")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("settings.unitType")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("settings.active")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t("common.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{unit.name}</TableCell>
                    <TableCell sx={{ color: tokens.muted }}>{unit.unit_type || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={unit.is_active ? t("common.active") : "Inactive"}
                        size="small"
                        sx={{
                          backgroundColor: unit.is_active ? tokens.badgeActive.bg : tokens.inputBg,
                          color: unit.is_active ? tokens.badgeActive.color : tokens.muted,
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("common.edit")}>
                        <IconButton size="small" onClick={() => openEditUnit(unit)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget({ type: "unit", id: unit.id })}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: tokens.muted }}>
                      {t("settings.noData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Location Dialog */}
      <Dialog open={locDialogOpen} onClose={() => setLocDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLoc ? t("settings.editLocation") : t("settings.addLocation")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {locDialogError && <Alert severity="error">{locDialogError}</Alert>}
          <TextField
            label={t("settings.locationName")}
            value={locForm.name}
            onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <TextField
            label={t("settings.address")}
            value={locForm.address}
            onChange={(e) => setLocForm((f) => ({ ...f, address: e.target.value }))}
            size="small"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLocDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveLocation} disabled={locSaving}>
            {locSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onClose={() => setUnitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUnit ? t("settings.editUnit") : t("settings.addUnit")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {unitDialogError && <Alert severity="error">{unitDialogError}</Alert>}
          <TextField
            label={t("settings.unitName")}
            value={unitForm.name}
            onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t("settings.locations")}</InputLabel>
            <Select
              value={unitForm.location_id}
              label={t("settings.locations")}
              onChange={(e) => setUnitForm((f) => ({ ...f, location_id: e.target.value }))}
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("settings.unitType")}
            value={unitForm.unit_type}
            onChange={(e) => setUnitForm((f) => ({ ...f, unit_type: e.target.value }))}
            size="small"
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={unitForm.is_active}
                onChange={(e) => setUnitForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            }
            label={t("settings.active")}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUnitDialogOpen(false)} color="inherit">{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSaveUnit} disabled={unitSaving}>
            {unitSaving ? t("common.saving") : t("common.save")}
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
