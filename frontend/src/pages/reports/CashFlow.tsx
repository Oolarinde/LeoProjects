import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  Alert,
  Divider,
  TextField,
  Button,
  InputAdornment,
} from "@mui/material";
import { SaveOutlined } from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { reportsApi, referenceApi } from "../../services/api";
import ReportHeader from "../../components/reports/ReportHeader";
import type { CashFlowSummary } from "../../types/reports";

function fmt(v: number) {
  return Number(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSigned(v: number) {
  const abs = fmt(Math.abs(v));
  return v < 0 ? `(${abs})` : abs;
}

export default function CashFlow() {
  const { year, location } = useAppStore();
  const [data, setData] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingInput, setOpeningInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    referenceApi.getLocations().then((r) => setLocationOptions(r.data ?? []));
  }, []);

  const fetchData = () => {
    setLoading(true);
    setError("");
    reportsApi
      .cashFlowSummary(year, location?.id)
      .then((r) => {
        const d = r.data;
        const coerce = (v: unknown) => Number(v);
        const summary: CashFlowSummary = {
          opening_balance: coerce(d.opening_balance),
          total_cash_in: coerce(d.total_cash_in),
          total_cash_out: coerce(d.total_cash_out),
          net_cash_flow: coerce(d.net_cash_flow),
          closing_balance: coerce(d.closing_balance),
          monthly_breakdown: d.monthly_breakdown.map((m: CashFlowSummary["monthly_breakdown"][0]) => ({
            ...m,
            cash_in: coerce(m.cash_in),
            cash_out: coerce(m.cash_out),
            net: coerce(m.net),
            running_balance: coerce(m.running_balance),
          })),
        };
        setData(summary);
        setOpeningInput(String(summary.opening_balance));
      })
      .catch(() => setError("Failed to load cash flow data"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [year, location]);

  const saveOpeningBalance = async () => {
    const amount = parseFloat(openingInput);
    if (isNaN(amount)) return;
    setSaving(true);
    try {
      await reportsApi.setOpeningBalance(year, amount);
      fetchData();
    } catch {
      setError("Failed to save opening balance");
    } finally {
      setSaving(false);
    }
  };

  const isPositive = (v: number) => v >= 0;

  return (
    <Box>
      <ReportHeader
        title="Cash Flow Statement"
        subtitle={`FY ${year}${location ? ` · ${location.name}` : " · All Locations"}`}
        locationOptions={locationOptions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Opening balance editor */}
      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard, mb: 2 }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: "12px !important" }}>
          <Typography variant="body2" fontWeight={600} color={tokens.muted} sx={{ minWidth: 160 }}>
            Opening Cash Balance (FY {year})
          </Typography>
          <TextField
            size="small"
            value={openingInput}
            onChange={(e) => setOpeningInput(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
            sx={{ width: 180 }}
            type="number"
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveOutlined />}
            onClick={saveOpeningBalance}
            disabled={saving}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Typography variant="caption" color={tokens.muted}>
            Set this once per year to anchor your cash flow calculations.
          </Typography>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {!loading && data && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 2, mb: 3 }}>
          {[
            { label: "Opening Balance", value: data.opening_balance, color: tokens.muted },
            { label: "Total Cash In", value: data.total_cash_in, color: tokens.badgePaid.color },
            { label: "Total Cash Out", value: data.total_cash_out, color: tokens.danger },
            { label: "Net Cash Flow", value: data.net_cash_flow, color: isPositive(data.net_cash_flow) ? tokens.badgePaid.color : tokens.danger },
            { label: "Closing Balance", value: data.closing_balance, color: tokens.navy },
          ].map(({ label, value, color }) => (
            <Card key={label} sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
              <CardContent sx={{ py: "12px !important" }}>
                <Typography variant="caption" color={tokens.muted} fontWeight={600}>
                  {label}
                </Typography>
                <Typography variant="h6" fontWeight={800} color={color} sx={{ mt: 0.5 }}>
                  ₦{fmt(value)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Monthly breakdown table */}
      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} color={tokens.navy}>
              Monthly Breakdown
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.navy }}>
                  {["Month", "Cash In (₦)", "Cash Out (₦)", "Net (₦)", "Running Balance (₦)"].map((h) => (
                    <TableCell
                      key={h}
                      align={h === "Month" ? "left" : "right"}
                      sx={{ color: "#fff", fontWeight: 700 }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 12 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  : data?.monthly_breakdown.map((row) => (
                      <TableRow
                        key={row.month}
                        hover
                        sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{row.month}</TableCell>
                        <TableCell align="right" sx={{ color: tokens.badgePaid.color }}>
                          {row.cash_in > 0 ? fmt(row.cash_in) : "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: tokens.danger }}>
                          {row.cash_out > 0 ? fmt(row.cash_out) : "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            color: isPositive(row.net) ? tokens.badgePaid.color : tokens.danger,
                          }}
                        >
                          {fmtSigned(row.net)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: tokens.navy }}>
                          {fmt(row.running_balance)}
                        </TableCell>
                      </TableRow>
                    ))}

                {/* Totals row */}
                {!loading && data && (
                  <TableRow sx={{ bgcolor: "rgba(27,42,74,0.06)" }}>
                    <TableCell sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: tokens.badgePaid.color }}>
                      {fmt(data.total_cash_in)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: tokens.danger }}>
                      {fmt(data.total_cash_out)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        color: isPositive(data.net_cash_flow) ? tokens.badgePaid.color : tokens.danger,
                      }}
                    >
                      {fmtSigned(data.net_cash_flow)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: tokens.navy }}>
                      {fmt(data.closing_balance)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
