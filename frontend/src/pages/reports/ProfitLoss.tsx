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
  Skeleton,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { reportsApi } from "../../services/api";
import { referenceApi } from "../../services/api";
import ReportHeader from "../../components/reports/ReportHeader";
import type { PnlSummary } from "../../types/reports";

function fmt(v: number) {
  return `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type ViewMode = "annual" | "monthly";

export default function ProfitLoss() {
  const { year, location } = useAppStore();
  const [data, setData] = useState<PnlSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("annual");
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    referenceApi.getLocations().then((r) => setLocationOptions(r.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .pnlSummary(year, location?.id)
      .then((r) => {
        const d = r.data;
        setData({
          ...d,
          total_revenue: Number(d.total_revenue),
          total_expenses: Number(d.total_expenses),
          net_profit: Number(d.net_profit),
          profit_margin: Number(d.profit_margin),
          revenue_lines: d.revenue_lines.map((l: PnlSummary["revenue_lines"][0]) => ({
            ...l,
            total: Number(l.total),
            monthly: l.monthly.map(Number),
          })),
          expense_lines: d.expense_lines.map((l: PnlSummary["expense_lines"][0]) => ({
            ...l,
            total: Number(l.total),
            monthly: l.monthly.map(Number),
          })),
        });
      })
      .catch(() => setError("Failed to load P&L data"))
      .finally(() => setLoading(false));
  }, [year, location]);

  const monthNames = data?.month_names ?? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const isProfit = (data?.net_profit ?? 0) >= 0;

  return (
    <Box>
      <ReportHeader
        title="Profit & Loss Statement"
        subtitle={`FY ${year}${location ? ` · ${location.name}` : " · All Locations"}`}
        locationOptions={locationOptions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <CardContent sx={{ p: 0 }}>
          {/* View toggle */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2, pb: 0 }}>
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
            >
              <ToggleButton value="annual" sx={{ fontSize: 11, px: 2 }}>Annual</ToggleButton>
              <ToggleButton value="monthly" sx={{ fontSize: 11, px: 2 }}>Monthly</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.navy }}>
                  <TableCell sx={{ color: "#fff", fontWeight: 700, width: 60 }}>Code</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Account</TableCell>
                  {viewMode === "monthly"
                    ? monthNames.map((m) => (
                        <TableCell key={m} align="right" sx={{ color: "#fff", fontWeight: 700, minWidth: 80 }}>
                          {m}
                        </TableCell>
                      ))
                    : null}
                  <TableCell align="right" sx={{ color: "#fff", fontWeight: 700, minWidth: 120 }}>
                    {viewMode === "monthly" ? "Total" : `FY ${year}`}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={viewMode === "monthly" ? 15 : 3}>
                        <Skeleton />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {/* ── INCOME section ── */}
                    <TableRow>
                      <TableCell
                        colSpan={viewMode === "monthly" ? 14 : 3}
                        sx={{
                          bgcolor: tokens.primary,
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 11,
                          letterSpacing: 1,
                          py: 0.75,
                        }}
                      >
                        INCOME
                      </TableCell>
                    </TableRow>

                    {data?.revenue_lines.map((line) => (
                      <TableRow
                        key={line.code}
                        hover
                        sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}
                      >
                        <TableCell sx={{ fontSize: 12, color: tokens.muted }}>{line.code}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{line.name}</TableCell>
                        {viewMode === "monthly" &&
                          line.monthly.map((v, i) => (
                            <TableCell key={i} align="right" sx={{ fontSize: 12 }}>
                              {v > 0 ? fmt(v) : "—"}
                            </TableCell>
                          ))}
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13 }}>
                          {fmt(line.total)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Income total */}
                    <TableRow sx={{ bgcolor: "rgba(23,193,232,0.08)" }}>
                      <TableCell
                        colSpan={viewMode === "monthly" ? 13 : 2}
                        sx={{ fontWeight: 700, fontSize: 13 }}
                      >
                        TOTAL INCOME
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: 14, color: tokens.primary }}>
                        {fmt(data?.total_revenue ?? 0)}
                      </TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={viewMode === "monthly" ? 14 : 3} sx={{ py: 0 }} /></TableRow>

                    {/* ── EXPENSES section ── */}
                    <TableRow>
                      <TableCell
                        colSpan={viewMode === "monthly" ? 14 : 3}
                        sx={{
                          bgcolor: tokens.danger,
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 11,
                          letterSpacing: 1,
                          py: 0.75,
                        }}
                      >
                        EXPENSES
                      </TableCell>
                    </TableRow>

                    {data?.expense_lines.map((line) => (
                      <TableRow
                        key={line.code}
                        hover
                        sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}
                      >
                        <TableCell sx={{ fontSize: 12, color: tokens.muted }}>{line.code}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{line.name}</TableCell>
                        {viewMode === "monthly" &&
                          line.monthly.map((v, i) => (
                            <TableCell key={i} align="right" sx={{ fontSize: 12 }}>
                              {v > 0 ? fmt(v) : "—"}
                            </TableCell>
                          ))}
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13 }}>
                          {fmt(line.total)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Expenses total */}
                    <TableRow sx={{ bgcolor: "rgba(234,6,6,0.06)" }}>
                      <TableCell
                        colSpan={viewMode === "monthly" ? 13 : 2}
                        sx={{ fontWeight: 700, fontSize: 13 }}
                      >
                        TOTAL EXPENSES
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: 14, color: tokens.danger }}>
                        {fmt(data?.total_expenses ?? 0)}
                      </TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={viewMode === "monthly" ? 14 : 3} sx={{ py: 0.5 }} /></TableRow>
                    <TableRow>
                      <TableCell colSpan={viewMode === "monthly" ? 14 : 3} sx={{ p: 0 }}>
                        <Divider />
                      </TableCell>
                    </TableRow>

                    {/* ── NET PROFIT / LOSS ── */}
                    <TableRow
                      sx={{
                        bgcolor: isProfit
                          ? "rgba(130,214,22,0.08)"
                          : "rgba(234,6,6,0.08)",
                      }}
                    >
                      <TableCell
                        colSpan={viewMode === "monthly" ? 13 : 2}
                        sx={{ fontWeight: 800, fontSize: 14 }}
                      >
                        {isProfit ? "NET PROFIT" : "NET LOSS"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 900,
                          fontSize: 16,
                          color: isProfit ? tokens.badgePaid.color : tokens.danger,
                        }}
                      >
                        {fmt(Math.abs(data?.net_profit ?? 0))}
                      </TableCell>
                    </TableRow>

                    {/* Profit margin */}
                    {data && data.total_revenue > 0 && (
                      <TableRow>
                        <TableCell colSpan={viewMode === "monthly" ? 13 : 2} sx={{ color: tokens.muted, fontSize: 12 }}>
                          Profit Margin
                        </TableCell>
                        <TableCell align="right" sx={{ color: tokens.muted, fontSize: 12 }}>
                          {Number(data.profit_margin).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
