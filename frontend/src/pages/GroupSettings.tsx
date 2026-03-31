import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
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
  IconButton,
  Chip,
  Alert,
  Skeleton,
  Collapse,
  Switch,
  FormControlLabel,
  Checkbox,
  Radio,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  ExpandLess,
  Business,
  Star,
  StarBorder,
  Security,
} from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { groupApi } from "../services/api";
import { getErrorMessage } from "../services/api";

interface GroupCompany {
  id: string;
  name: string;
  entity_prefix: string | null;
  rc_number: string | null;
  role: string;
}

interface CoaTemplateAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  is_intercompany: boolean;
}

interface AllocationRule {
  id: string;
  name: string;
  allocation_type: string;
  is_active: boolean;
  lines: { id: string; company_id: string; company_name: string; percentage: number }[];
}

export default function GroupSettings() {
  const groupName = useAppStore((s) => s.companyGroupName) || "Group";
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading, mb: 0.25 }}>
        Group Settings — {groupName}
      </Typography>
      <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 2 }}>
        Manage companies, users, chart of accounts template, and allocation rules
      </Typography>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: `1px solid ${tokens.border}`,
            "& .MuiTab-root": { fontSize: 12, fontWeight: 600, textTransform: "none", minHeight: 40 },
            "& .Mui-selected": { color: tokens.primary },
            "& .MuiTabs-indicator": { backgroundColor: tokens.primary },
          }}
        >
          <Tab label="Companies" />
          <Tab label="Users" />
          <Tab label="CoA Template" />
          <Tab label="Allocation Rules" />
        </Tabs>
        <CardContent>
          {tab === 0 && <CompaniesTab />}
          {tab === 1 && <UsersTab />}
          {tab === 2 && <CoaTemplateTab />}
          {tab === 3 && <AllocationRulesTab />}
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Companies Tab ──────────────────────────────────────────────────────────

function CompaniesTab() {
  const [companies, setCompanies] = useState<GroupCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GroupCompany | null>(null);
  const [form, setForm] = useState({ name: "", entity_prefix: "", rc_number: "" });

  const load = () => {
    setLoading(true);
    groupApi
      .listCompanies()
      .then((r) => setCompanies(r.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", entity_prefix: "", rc_number: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: GroupCompany) => {
    setEditTarget(c);
    setForm({ name: c.name, entity_prefix: c.entity_prefix || "", rc_number: c.rc_number || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editTarget) {
        await groupApi.updateCompany(editTarget.id, form);
      } else {
        await groupApi.createSubsidiary(form);
      }
      setDialogOpen(false);
      setForm({ name: "", entity_prefix: "", rc_number: "" });
      setEditTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the group? This cannot be undone.`)) return;
    try {
      await groupApi.removeCompany(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSetParent = async (id: string, name: string) => {
    if (!window.confirm(`Set "${name}" as the holding/parent company of the group?`)) return;
    try {
      await groupApi.setParentCompany(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={200} />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={openAdd}
          sx={{ fontSize: 11, background: tokens.gradPrimary }}
        >
          Add Company
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Entity Prefix</TableCell>
            <TableCell>RC Number</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {companies.map((c) => (
            <TableRow key={c.id} hover>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Business sx={{ fontSize: 14, color: tokens.primary }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{c.name}</Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ fontSize: 12 }}>{c.entity_prefix || "—"}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{c.rc_number || "—"}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={c.role}
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: c.role === "PARENT" ? tokens.badgeActive.bg : tokens.badgePaid.bg,
                    color: c.role === "PARENT" ? tokens.badgeActive.color : tokens.badgePaid.color,
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleSetParent(c.id, c.name)}
                  title={c.role === "PARENT" ? "Current holding company" : "Set as holding company"}
                  disabled={c.role === "PARENT"}
                >
                  {c.role === "PARENT"
                    ? <Star sx={{ fontSize: 15, color: tokens.warning }} />
                    : <StarBorder sx={{ fontSize: 15, color: tokens.muted }} />
                  }
                </IconButton>
                <IconButton size="small" onClick={() => openEdit(c)} title="Edit company">
                  <Edit sx={{ fontSize: 14, color: tokens.muted }} />
                </IconButton>
                <IconButton size="small" onClick={() => handleRemove(c.id, c.name)} disabled={c.role === "PARENT"}>
                  <Delete sx={{ fontSize: 15, color: c.role === "PARENT" ? tokens.border : tokens.danger }} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {companies.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: tokens.muted, py: 3 }}>No companies in group</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>
          {editTarget ? "Edit Company" : "Add Company to Group"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Company Name"
            size="small"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <TextField
            label="Entity Prefix"
            size="small"
            value={form.entity_prefix}
            onChange={(e) => setForm({ ...form, entity_prefix: e.target.value })}
            placeholder="e.g. TAL-AG"
          />
          <TextField
            label="RC Number"
            size="small"
            value={form.rc_number}
            onChange={(e) => setForm({ ...form, rc_number: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name.trim()}
            sx={{ fontSize: 11, background: tokens.gradPrimary }}
          >
            {editTarget ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────────────────

interface GroupUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  memberships: {
    membership_id: string;
    company_id: string;
    company_name: string;
    entity_prefix: string | null;
    role: string;
    is_default: boolean;
  }[];
}

interface AccessFormEntry {
  company_id: string;
  company_name: string;
  entity_prefix: string | null;
  enabled: boolean;
  role: string;
  is_default: boolean;
}

const ROLE_OPTIONS = [
  { value: "GROUP_ADMIN", label: "Group Admin" },
  { value: "COMPANY_ADMIN", label: "Company Admin" },
  { value: "VIEWER", label: "Viewer" },
];

function UsersTab() {
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [companies, setCompanies] = useState<GroupCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<GroupUser | null>(null);
  const [accessForm, setAccessForm] = useState<AccessFormEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([groupApi.listGroupUsers(), groupApi.listCompanies()])
      .then(([usersResp, compResp]) => {
        setUsers(usersResp.data);
        setCompanies(compResp.data);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEditAccess = (user: GroupUser) => {
    setEditUser(user);
    // Build form from all group companies, marking which ones the user already has
    const form: AccessFormEntry[] = companies.map((c) => {
      const existing = user.memberships.find((m) => m.company_id === c.id);
      return {
        company_id: c.id,
        company_name: c.name,
        entity_prefix: c.entity_prefix,
        enabled: !!existing,
        role: existing?.role || "COMPANY_ADMIN",
        is_default: existing?.is_default || false,
      };
    });
    // Ensure at least one default is set
    if (!form.some((f) => f.is_default && f.enabled)) {
      const firstEnabled = form.find((f) => f.enabled);
      if (firstEnabled) firstEnabled.is_default = true;
    }
    setAccessForm(form);
    setDialogOpen(true);
  };

  const toggleCompany = (idx: number, checked: boolean) => {
    const updated = [...accessForm];
    updated[idx] = { ...updated[idx], enabled: checked };
    // If unchecking the default, clear its default flag
    if (!checked && updated[idx].is_default) {
      updated[idx].is_default = false;
      // Set the first remaining enabled one as default
      const firstEnabled = updated.find((f) => f.enabled);
      if (firstEnabled) firstEnabled.is_default = true;
    }
    // If this is the only enabled one, make it default
    const enabledCount = updated.filter((f) => f.enabled).length;
    if (checked && enabledCount === 1) {
      updated[idx].is_default = true;
    }
    setAccessForm(updated);
  };

  const setRole = (idx: number, role: string) => {
    const updated = [...accessForm];
    updated[idx] = { ...updated[idx], role };
    setAccessForm(updated);
  };

  const setDefault = (idx: number) => {
    const updated = accessForm.map((f, i) => ({
      ...f,
      is_default: i === idx,
    }));
    setAccessForm(updated);
  };

  const handleSave = async () => {
    if (!editUser) return;
    const enabled = accessForm.filter((f) => f.enabled);
    if (enabled.length === 0) {
      setError("User must have access to at least one company");
      return;
    }
    if (!enabled.some((f) => f.is_default)) {
      setError("Exactly one company must be marked as default");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const memberships = enabled.map((f) => ({
        company_id: f.company_id,
        role: f.role,
        is_default: f.is_default,
      }));
      const resp = await groupApi.updateUserAccess(editUser.id, memberships);
      setUsers(resp.data);
      setDialogOpen(false);
      setEditUser(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={200} />;

  const enabledCount = accessForm.filter((f) => f.enabled).length;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {users.length === 0 ? (
        <Alert severity="info" sx={{ fontSize: 12 }}>
          No users found across the group companies. Add users from the User Management page first, then manage their subsidiary access here.
        </Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>System Role</TableCell>
              <TableCell>Subsidiary Access</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{user.full_name}</Typography>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: tokens.muted }}>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={user.role}
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: user.role === "SUPER_ADMIN" ? tokens.badgeActive.bg : tokens.badgePaid.bg,
                      color: user.role === "SUPER_ADMIN" ? tokens.badgeActive.color : tokens.badgePaid.color,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {user.memberships.map((m) => (
                      <Tooltip
                        key={m.membership_id}
                        title={`${m.company_name} — ${m.role}${m.is_default ? " (Default)" : ""}`}
                        arrow
                      >
                        <Chip
                          size="small"
                          label={
                            (m.entity_prefix || m.company_name.slice(0, 3).toUpperCase()) +
                            (m.is_default ? " \u2605" : "")
                          }
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            bgcolor: m.is_default ? tokens.badgeActive.bg : tokens.bg,
                            color: m.is_default ? tokens.badgeActive.color : tokens.text,
                            border: m.is_default ? "none" : `1px solid ${tokens.border}`,
                          }}
                        />
                      </Tooltip>
                    ))}
                    {user.memberships.length === 0 && (
                      <Typography sx={{ fontSize: 11, color: tokens.muted, fontStyle: "italic" }}>No access</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={user.is_active ? "Active" : "Inactive"}
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: user.is_active ? tokens.badgePaid.bg : tokens.badgePending.bg,
                      color: user.is_active ? tokens.badgePaid.color : tokens.badgePending.color,
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit subsidiary access" arrow>
                    <IconButton size="small" onClick={() => openEditAccess(user)}>
                      <Security sx={{ fontSize: 15, color: tokens.primary }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Access Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 0.5 }}>
          Edit Subsidiary Access
        </DialogTitle>
        {editUser && (
          <Typography sx={{ fontSize: 12, color: tokens.muted, px: 3, pb: 1 }}>
            {editUser.full_name} ({editUser.email})
          </Typography>
        )}
        <DialogContent sx={{ pt: "8px !important" }}>
          {error && <Alert severity="error" sx={{ mb: 2, fontSize: 11 }}>{error}</Alert>}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.heading, mb: 1.5 }}>
            Select companies and assign roles:
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40, px: 0.5 }}>Access</TableCell>
                <TableCell>Company</TableCell>
                <TableCell sx={{ width: 160 }}>Role</TableCell>
                <TableCell sx={{ width: 70, textAlign: "center" }}>Default</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accessForm.map((entry, idx) => (
                <TableRow key={entry.company_id} hover>
                  <TableCell sx={{ px: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={entry.enabled}
                      onChange={(e) => toggleCompany(idx, e.target.checked)}
                      sx={{ p: 0.25 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Business sx={{ fontSize: 13, color: entry.enabled ? tokens.primary : tokens.border }} />
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: entry.enabled ? 600 : 400,
                          color: entry.enabled ? tokens.text : tokens.muted,
                        }}
                      >
                        {entry.company_name}
                      </Typography>
                      {entry.entity_prefix && (
                        <Chip
                          size="small"
                          label={entry.entity_prefix}
                          sx={{ fontSize: 9, fontWeight: 600, ml: 0.5, height: 18 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth disabled={!entry.enabled}>
                      <Select
                        value={entry.role}
                        onChange={(e) => setRole(idx, e.target.value)}
                        sx={{ fontSize: 11, "& .MuiSelect-select": { py: 0.5 } }}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 11 }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Radio
                      size="small"
                      checked={entry.is_default}
                      onChange={() => setDefault(idx)}
                      disabled={!entry.enabled}
                      sx={{ p: 0.25 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {enabledCount === 0 && (
            <Alert severity="warning" sx={{ mt: 1.5, fontSize: 11 }}>
              At least one company must be selected.
            </Alert>
          )}
          <Typography sx={{ fontSize: 10, color: tokens.muted, mt: 1.5 }}>
            The default company ({"\u2605"}) is where the user lands after login. Each user must have exactly one default.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setError(""); }} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || enabledCount === 0}
            sx={{ fontSize: 11, background: tokens.gradPrimary }}
          >
            {saving ? "Saving..." : "Save Access"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── CoA Template Tab ───────────────────────────────────────────────────────

function CoaTemplateTab() {
  const [accounts, setAccounts] = useState<CoaTemplateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Asset",
    normal_balance: "Dr",
    is_intercompany: false,
  });

  const load = () => {
    setLoading(true);
    groupApi
      .getCoaTemplate()
      .then((r) => setAccounts(r.data.accounts ?? r.data ?? []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ code: "", name: "", type: "Asset", normal_balance: "Dr", is_intercompany: false });
    setDialogOpen(true);
  };

  const openEdit = (acct: CoaTemplateAccount) => {
    setEditId(acct.id);
    setForm({
      code: acct.code,
      name: acct.name,
      type: acct.type,
      normal_balance: acct.normal_balance,
      is_intercompany: acct.is_intercompany,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await groupApi.updateCoaTemplateEntry(editId, form);
      } else {
        await groupApi.createCoaTemplate(form);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={200} />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={openAdd}
          sx={{ fontSize: 11, background: tokens.gradPrimary }}
        >
          Add Account
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Normal Balance</TableCell>
            <TableCell>IC</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id} hover>
              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{a.code}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{a.name}</TableCell>
              <TableCell>
                <Chip size="small" label={a.type} sx={{ fontSize: 10, fontWeight: 600 }} />
              </TableCell>
              <TableCell sx={{ fontSize: 12 }}>{a.normal_balance}</TableCell>
              <TableCell>
                {a.is_intercompany && (
                  <Chip size="small" label="IC" sx={{ fontSize: 9, fontWeight: 700, bgcolor: tokens.badgeActive.bg, color: tokens.badgeActive.color }} />
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => openEdit(a)}>
                  <Edit sx={{ fontSize: 14, color: tokens.muted }} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ color: tokens.muted, py: 3 }}>No template accounts defined</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>
          {editId ? "Edit Template Account" : "Add Template Account"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField label="Code" size="small" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormControl size="small">
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="Asset">Asset</MenuItem>
              <MenuItem value="Liability">Liability</MenuItem>
              <MenuItem value="Equity">Equity</MenuItem>
              <MenuItem value="Revenue">Revenue</MenuItem>
              <MenuItem value="Expense">Expense</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Normal Balance</InputLabel>
            <Select label="Normal Balance" value={form.normal_balance} onChange={(e) => setForm({ ...form, normal_balance: e.target.value })}>
              <MenuItem value="Dr">Debit (Dr)</MenuItem>
              <MenuItem value="Cr">Credit (Cr)</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_intercompany}
                onChange={(e) => setForm({ ...form, is_intercompany: e.target.checked })}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 12 }}>Inter-company account</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.code || !form.name} sx={{ fontSize: 11, background: tokens.gradPrimary }}>
            {editId ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Allocation Rules Tab ───────────────────────────────────────────────────

function AllocationRulesTab() {
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", allocation_type: "PERCENTAGE" });
  const [lines, setLines] = useState<{ company_id: string; company_name: string; percentage: number }[]>([]);
  const [companies, setCompanies] = useState<GroupCompany[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([groupApi.listAllocationRules(), groupApi.listCompanies()])
      .then(([rulesResp, compResp]) => {
        setRules(rulesResp.data);
        setCompanies(compResp.data);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", allocation_type: "PERCENTAGE" });
    setLines([]);
    setDialogOpen(true);
  };

  const openEdit = (rule: AllocationRule) => {
    setEditId(rule.id);
    setForm({ name: rule.name, allocation_type: rule.allocation_type });
    setLines(rule.lines || []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, lines };
      if (editId) {
        await groupApi.updateAllocationRule(editId, payload);
      } else {
        await groupApi.createAllocationRule(payload);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete allocation rule "${name}"?`)) return;
    try {
      await groupApi.deleteAllocationRule(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const addLine = () => {
    if (companies.length === 0) return;
    setLines([...lines, { company_id: companies[0].id, company_name: companies[0].name, percentage: 0 }]);
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    if (field === "company_id") {
      const comp = companies.find((c) => c.id === value);
      updated[idx] = { ...updated[idx], company_id: value, company_name: comp?.name || "" };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  if (loading) return <Skeleton variant="rectangular" height={200} />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={openAdd}
          sx={{ fontSize: 11, background: tokens.gradPrimary }}
        >
          Add Rule
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => (
            <Box key={rule.id} component="tbody">
              <TableRow hover>
                <TableCell sx={{ width: 30 }}>
                  <IconButton size="small" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                    {expandedId === rule.id ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                  </IconButton>
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{rule.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={rule.allocation_type} sx={{ fontSize: 10, fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={rule.is_active ? "ACTIVE" : "INACTIVE"}
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: rule.is_active ? tokens.badgePaid.bg : tokens.badgePending.bg,
                      color: rule.is_active ? tokens.badgePaid.color : tokens.badgePending.color,
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(rule)}>
                    <Edit sx={{ fontSize: 14, color: tokens.muted }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(rule.id, rule.name)}>
                    <Delete sx={{ fontSize: 14, color: tokens.danger }} />
                  </IconButton>
                </TableCell>
              </TableRow>
              {expandedId === rule.id && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 0, bgcolor: tokens.bg }}>
                    <Collapse in={expandedId === rule.id}>
                      <Box sx={{ p: 1.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.heading, mb: 1 }}>
                          Allocation Lines
                        </Typography>
                        {(rule.lines || []).map((line, i) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography sx={{ fontSize: 11, color: tokens.text, flex: 1 }}>{line.company_name}</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.primary }}>{line.percentage}%</Typography>
                          </Box>
                        ))}
                        {(!rule.lines || rule.lines.length === 0) && (
                          <Typography sx={{ fontSize: 11, color: tokens.muted }}>No allocation lines defined</Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              )}
            </Box>
          ))}
          {rules.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: tokens.muted, py: 3 }}>No allocation rules defined</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>
          {editId ? "Edit Allocation Rule" : "Add Allocation Rule"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField label="Rule Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormControl size="small">
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.allocation_type} onChange={(e) => setForm({ ...form, allocation_type: e.target.value })}>
              <MenuItem value="PERCENTAGE">Percentage</MenuItem>
              <MenuItem value="FIXED">Fixed</MenuItem>
              <MenuItem value="REVENUE_BASED">Revenue Based</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.heading }}>Lines</Typography>
              <Button size="small" startIcon={<Add sx={{ fontSize: 12 }} />} onClick={addLine} sx={{ fontSize: 11 }}>
                Add Line
              </Button>
            </Box>
            {lines.map((line, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select
                    value={line.company_id}
                    onChange={(e) => updateLine(idx, "company_id", e.target.value)}
                    sx={{ fontSize: 11 }}
                  >
                    {companies.map((c) => (
                      <MenuItem key={c.id} value={c.id} sx={{ fontSize: 11 }}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  value={line.percentage}
                  onChange={(e) => updateLine(idx, "percentage", Number(e.target.value))}
                  sx={{ width: 80 }}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  placeholder="%"
                />
                <IconButton size="small" onClick={() => removeLine(idx)}>
                  <Delete sx={{ fontSize: 14, color: tokens.danger }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name} sx={{ fontSize: 11, background: tokens.gradPrimary }}>
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
