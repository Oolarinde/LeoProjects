import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
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
} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
  SwapHoriz,
} from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { groupApi } from "../services/api";
import { getErrorMessage } from "../services/api";
import { formatNaira } from "../utils/format";

interface IcTransaction {
  id: string;
  date: string;
  type: string;
  source_company_id: string;
  source_company_name: string;
  target_company_id: string;
  target_company_name: string;
  amount: number;
  description: string;
  status: string;
  allocation_rule_id: string | null;
  void_reason: string | null;
}

interface IcBalance {
  source_company: string;
  target_company: string;
  net_balance: number;
}

interface GroupCompany {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING: tokens.badgePending,
  CONFIRMED: tokens.badgePaid,
  ELIMINATED: tokens.badgeActive,
  VOIDED: tokens.badgeOverdue,
};

export default function InterCompanyTransactions() {
  const { year } = useAppStore();
  const [transactions, setTransactions] = useState<IcTransaction[]>([]);
  const [balances, setBalances] = useState<IcBalance[]>([]);
  const [companies, setCompanies] = useState<GroupCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [form, setForm] = useState({
    source_company_id: "",
    target_company_id: "",
    type: "RECHARGE",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    description: "",
    allocation_rule_id: "",
  });

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      groupApi.listIcTransactions({ year }),
      groupApi.getIcBalances(year),
      groupApi.listCompanies(),
    ])
      .then(([txResp, balResp, compResp]) => {
        const txData = txResp.data;
        setTransactions(
          (txData.items || []).map((t: any) => ({
            ...t,
            amount: Number(t.amount),
            type: t.transaction_type,
          }))
        );
        setBalances(
          (balResp.data || []).map((b: any) => ({
            ...b,
            source_company: b.source_company_name,
            target_company: b.target_company_name,
            net_balance: Number(b.net_balance),
          }))
        );
        // Map company list to {id, name} — backend returns company_id + company_name
        setCompanies(
          (compResp.data || []).map((c: any) => ({
            id: c.company_id || c.id,
            name: c.company_name || c.name,
          }))
        );
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year]);

  const handleCreate = async () => {
    try {
      await groupApi.createIcTransaction({
        source_company_id: form.source_company_id,
        target_company_id: form.target_company_id,
        transaction_type: form.type,
        date: form.date,
        amount: Number(form.amount),
        description: form.description,
        allocation_rule_id: form.allocation_rule_id || null,
      });
      setDialogOpen(false);
      setForm({
        source_company_id: "",
        target_company_id: "",
        type: "RECHARGE",
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        description: "",
        allocation_rule_id: "",
      });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await groupApi.confirmIcTransaction(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openVoid = (id: string) => {
    setVoidTarget(id);
    setVoidReason("");
    setVoidDialogOpen(true);
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await groupApi.voidIcTransaction(voidTarget, voidReason);
      setVoidDialogOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading, mb: 0.25 }}>
        Inter-Company Transactions
      </Typography>
      <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 2 }}>
        FY {year} — Manage inter-company recharges, loans, and transfers
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* IC Balances Summary */}
      {!loading && balances.length > 0 && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
              <SwapHoriz sx={{ fontSize: 16, color: tokens.primary }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.heading }}>
                IC Balances
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell align="right">Net Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balances.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontSize: 12 }}>{b.source_company}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{b.target_company}</TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: b.net_balance >= 0 ? "#17AD37" : tokens.danger,
                        }}
                      >
                        {b.net_balance >= 0 ? "" : "("}
                        {formatNaira(Math.abs(b.net_balance))}
                        {b.net_balance < 0 ? ")" : ""}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.heading }}>
              Transactions
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add sx={{ fontSize: 14 }} />}
              onClick={() => setDialogOpen(true)}
              sx={{ fontSize: 11, background: tokens.gradPrimary }}
            >
              New IC Transaction
            </Button>
          </Box>

          {loading ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => {
                  const style = STATUS_STYLES[tx.status] || STATUS_STYLES.PENDING;
                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>{tx.date}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{tx.type}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{tx.source_company_name}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{tx.target_company_name}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>
                        {formatNaira(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={tx.status}
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: style.bg,
                            color: style.color,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {tx.status === "PENDING" && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleConfirm(tx.id)}
                              title="Confirm"
                            >
                              <CheckCircle sx={{ fontSize: 16, color: "#17AD37" }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openVoid(tx.id)}
                              title="Void"
                            >
                              <Cancel sx={{ fontSize: 16, color: tokens.danger }} />
                            </IconButton>
                          </>
                        )}
                        {tx.status === "VOIDED" && tx.void_reason && (
                          <Typography sx={{ fontSize: 10, color: tokens.muted, fontStyle: "italic" }}>
                            {tx.void_reason}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: tokens.muted, py: 3 }}>
                      No inter-company transactions for FY {year}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create IC Transaction Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>New IC Transaction</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <FormControl size="small" required>
            <InputLabel>Source Company</InputLabel>
            <Select
              label="Source Company"
              value={form.source_company_id}
              onChange={(e) => setForm({ ...form, source_company_id: e.target.value })}
            >
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: 11 }}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" required>
            <InputLabel>Target Company</InputLabel>
            <Select
              label="Target Company"
              value={form.target_company_id}
              onChange={(e) => setForm({ ...form, target_company_id: e.target.value })}
            >
              {companies
                .filter((c) => c.id !== form.source_company_id)
                .map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontSize: 11 }}>{c.name}</MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="RECHARGE">Recharge</MenuItem>
              <MenuItem value="LOAN">Loan</MenuItem>
              <MenuItem value="TRANSFER">Transfer</MenuItem>
              <MenuItem value="ALLOCATION">Allocation</MenuItem>
              <MenuItem value="DIVIDEND">Dividend</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Amount (₦)"
            type="number"
            size="small"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Description"
            size="small"
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.source_company_id || !form.target_company_id || !form.amount}
            sx={{ fontSize: 11, background: tokens.gradPrimary }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Void Reason Dialog */}
      <Dialog open={voidDialogOpen} onClose={() => setVoidDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>Void Transaction</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField
            label="Reason for voiding"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVoidDialogOpen(false)} sx={{ fontSize: 11 }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleVoid}
            disabled={!voidReason.trim()}
            sx={{ fontSize: 11 }}
          >
            Void
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
