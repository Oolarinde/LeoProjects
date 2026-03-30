import { useEffect, useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  Alert, Skeleton, Chip, Tabs, Tab, IconButton, FormControl, InputLabel,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { tenantApi, referenceApi } from "../services/api";

function fmt(v: number | string) {
  return `₦${Number(v).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "rgba(130,214,22,0.12)", color: "#4d8a0c" },
  EXPIRED: { bg: "rgba(251,207,51,0.15)", color: "#9a7a08" },
  TERMINATED: { bg: "rgba(234,6,6,0.08)", color: "#c20505" },
  RENEWED: { bg: "rgba(23,193,232,0.12)", color: "#0b8eaa" },
};

export default function TenantOps() {
  const [tab, setTab] = useState(0);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"tenant" | "lease" | "payment">("tenant");
  const [form, setForm] = useState<any>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, l, p, s, locs] = await Promise.all([
        tenantApi.list(), tenantApi.listLeases(), tenantApi.listPayments(),
        tenantApi.summary(), referenceApi.getLocations(),
      ]);
      setTenants(t.data);
      setLeases(l.data.map((ls: any) => ({ ...ls, monthly_rent: Number(ls.monthly_rent), caution_deposit: Number(ls.caution_deposit), total_paid: Number(ls.total_paid) })));
      setPayments(p.data.map((py: any) => ({ ...py, amount: Number(py.amount) })));
      setSummary({ ...s.data, total_monthly_rent: Number(s.data.total_monthly_rent), total_ar: Number(s.data.total_ar) });
      setLocations(locs.data);
    } catch { setError("Failed to load data"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDialog = (type: "tenant" | "lease" | "payment", data?: any) => {
    setDialogType(type);
    setEditId(data?.id ?? null);
    setForm(data ?? {});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (dialogType === "tenant") {
        if (editId) await tenantApi.update(editId, form);
        else await tenantApi.create(form);
      } else if (dialogType === "lease") {
        await tenantApi.createLease(form);
      } else {
        await tenantApi.createPayment(form);
      }
      setDialogOpen(false);
      fetchAll();
    } catch { setError("Failed to save"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tenant and all their leases?")) return;
    try { await tenantApi.delete(id); fetchAll(); }
    catch { setError("Failed to delete"); }
  };

  const loadUnits = async (locationId: string) => {
    try {
      const r = await referenceApi.getUnits(locationId);
      setUnits(r.data);
    } catch { setUnits([]); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color={tokens.navy} sx={{ fontFamily: "Mulish, sans-serif", mb: 0.5 }}>
        Tenant Operations
      </Typography>
      <Typography variant="body2" color={tokens.muted} sx={{ mb: 2 }}>
        Manage tenants, leases, and rent payments
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Summary KPIs */}
      {summary && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1.5, mb: 2 }}>
          {[
            { label: "Active Tenants", value: summary.total_tenants, color: tokens.navy },
            { label: "Active Leases", value: summary.active_leases, color: tokens.primary },
            { label: "Monthly Rent", value: fmt(summary.total_monthly_rent), color: tokens.badgePaid.color },
            { label: "Accounts Receivable", value: fmt(summary.total_ar), color: summary.total_ar > 0 ? tokens.danger : tokens.muted },
          ].map(({ label, value, color }) => (
            <Card key={label} sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
              <CardContent sx={{ py: "10px !important" }}>
                <Typography sx={{ fontSize: 11, color: tokens.muted, fontWeight: 600 }}>{label}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color, mt: 0.25 }}>{value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { fontSize: 11, textTransform: "none" } }}>
          <Tab label={`Tenants (${tenants.length})`} />
          <Tab label={`Leases (${leases.length})`} />
          <Tab label={`Rent Payments (${payments.length})`} />
        </Tabs>
      </Box>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 0.5 }} />)
      ) : (
        <>
          {/* Tenants Tab */}
          {tab === 0 && (
            <>
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => openDialog("tenant")}
                sx={{ mb: 1.5, background: tokens.gradPrimary, textTransform: "none", borderRadius: 2 }}>
                Add Tenant
              </Button>
              <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
                <Table size="small">
                  <TableHead><TableRow>
                    {["Name", "Phone", "Email", "ID Type", "Active Leases", "Status", "Actions"].map(h =>
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{t.full_name}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.phone || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.email || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.id_type || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{t.active_lease_count}</TableCell>
                        <TableCell><Chip label={t.is_active ? "Active" : "Inactive"} size="small" sx={{ fontSize: 11, bgcolor: t.is_active ? tokens.badgePaid.bg : tokens.badgeOverdue.bg, color: t.is_active ? tokens.badgePaid.color : tokens.badgeOverdue.color }} /></TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => openDialog("tenant", t)}><Edit sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><Delete sx={{ fontSize: 14 }} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tenants.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: tokens.muted }}>No tenants yet. Add one to get started.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}

          {/* Leases Tab */}
          {tab === 1 && (
            <>
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => openDialog("lease")}
                sx={{ mb: 1.5, background: tokens.gradPrimary, textTransform: "none", borderRadius: 2 }}>
                New Lease
              </Button>
              <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
                <Table size="small">
                  <TableHead><TableRow>
                    {["Tenant", "Location", "Unit", "Period", "Rent/mo", "Caution", "Paid", "Status"].map(h =>
                      <TableCell key={h} align={["Rent/mo","Caution","Paid"].includes(h) ? "right" : "left"} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {leases.map((ls) => (
                      <TableRow key={ls.id} hover>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{ls.tenant_name}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{ls.location_name}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{ls.unit_name || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{ls.start_date} → {ls.end_date}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(ls.monthly_rent)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(ls.caution_deposit)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(ls.total_paid)}</TableCell>
                        <TableCell><Chip label={ls.status} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[ls.status]?.bg, color: STATUS_COLORS[ls.status]?.color }} /></TableCell>
                      </TableRow>
                    ))}
                    {leases.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: tokens.muted }}>No leases yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}

          {/* Rent Payments Tab */}
          {tab === 2 && (
            <>
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => openDialog("payment")}
                sx={{ mb: 1.5, background: tokens.gradPrimary, textTransform: "none", borderRadius: 2 }}>
                Record Payment
              </Button>
              <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
                <Table size="small">
                  <TableHead><TableRow>
                    {["Date", "Amount", "Period", "Method", "Ref #", "Notes"].map(h =>
                      <TableCell key={h} align={h === "Amount" ? "right" : "left"} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontSize: 11 }}>{p.payment_date}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(p.amount)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{p.period_month}/{p.period_year}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{p.payment_method || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{p.reference_no || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{p.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>No payments recorded yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 700 }}>
          {dialogType === "tenant" ? (editId ? "Edit Tenant" : "Add Tenant") :
           dialogType === "lease" ? "New Lease" : "Record Payment"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
          {dialogType === "tenant" && (
            <>
              <TextField size="small" label="Full Name" required value={form.full_name || ""} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField size="small" label="Phone" value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" label="Email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} sx={{ flex: 1 }} />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>ID Type</InputLabel>
                  <Select label="ID Type" value={form.id_type || ""} onChange={e => setForm({ ...form, id_type: e.target.value })}>
                    {["NIN","Passport","Driver License","Student ID","Voter Card"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="ID Number" value={form.id_number || ""} onChange={e => setForm({ ...form, id_number: e.target.value })} sx={{ flex: 1 }} />
              </Box>
              <TextField size="small" label="Emergency Contact" value={form.emergency_contact || ""} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
              <TextField size="small" label="Emergency Phone" value={form.emergency_phone || ""} onChange={e => setForm({ ...form, emergency_phone: e.target.value })} />
              <TextField size="small" label="Notes" multiline rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </>
          )}
          {dialogType === "lease" && (
            <>
              <FormControl size="small" required>
                <InputLabel>Tenant</InputLabel>
                <Select label="Tenant" value={form.tenant_id || ""} onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
                  {tenants.map(t => <MenuItem key={t.id} value={t.id}>{t.full_name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" required>
                <InputLabel>Location</InputLabel>
                <Select label="Location" value={form.location_id || ""} onChange={e => { setForm({ ...form, location_id: e.target.value, unit_id: "" }); loadUnits(e.target.value); }}>
                  {locations.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </Select>
              </FormControl>
              {units.length > 0 && (
                <FormControl size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={form.unit_id || ""} onChange={e => setForm({ ...form, unit_id: e.target.value })}>
                    <MenuItem value="">— None —</MenuItem>
                    {units.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField size="small" type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" type="date" label="End Date" InputLabelProps={{ shrink: true }} value={form.end_date || ""} onChange={e => setForm({ ...form, end_date: e.target.value })} sx={{ flex: 1 }} />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField size="small" type="number" label="Monthly Rent (₦)" value={form.monthly_rent || ""} onChange={e => setForm({ ...form, monthly_rent: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Caution Deposit (₦)" value={form.caution_deposit || ""} onChange={e => setForm({ ...form, caution_deposit: e.target.value })} sx={{ flex: 1 }} />
              </Box>
            </>
          )}
          {dialogType === "payment" && (
            <>
              <FormControl size="small" required>
                <InputLabel>Lease</InputLabel>
                <Select label="Lease" value={form.lease_id || ""} onChange={e => setForm({ ...form, lease_id: e.target.value })}>
                  {leases.filter(l => l.status === "ACTIVE").map(l => <MenuItem key={l.id} value={l.id}>{l.tenant_name} — {l.location_name} ({fmt(l.monthly_rent)}/mo)</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" type="number" label="Amount (₦)" required value={form.amount || ""} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <TextField size="small" type="date" label="Payment Date" InputLabelProps={{ shrink: true }} value={form.payment_date || ""} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField size="small" type="number" label="Period Month" value={form.period_month || ""} onChange={e => setForm({ ...form, period_month: parseInt(e.target.value) })} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Period Year" value={form.period_year || ""} onChange={e => setForm({ ...form, period_year: parseInt(e.target.value) })} sx={{ flex: 1 }} />
              </Box>
              <FormControl size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select label="Payment Method" value={form.payment_method || ""} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {["Cash","Bank Transfer","POS","Mobile Transfer","Cheque"].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Reference #" value={form.reference_no || ""} onChange={e => setForm({ ...form, reference_no: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ background: tokens.gradPrimary }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
