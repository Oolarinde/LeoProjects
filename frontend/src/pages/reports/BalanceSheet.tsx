import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Skeleton,
  Alert,
  Divider,
} from "@mui/material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { reportsApi, referenceApi } from "../../services/api";
import ReportHeader from "../../components/reports/ReportHeader";
import type { BalanceSheetSummary } from "../../types/reports";

function fmt(v: number) {
  return `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={2}
        sx={{
          bgcolor: color,
          color: "#fff",
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 1,
          py: 0.75,
        }}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function LineRow({
  label,
  value,
  indent = false,
  bold = false,
  color,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <TableRow hover sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}>
      <TableCell sx={{ pl: indent ? 4 : 2, fontWeight: bold ? 700 : 400, fontSize: 13 }}>
        {label}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontWeight: bold ? 800 : 500, fontSize: bold ? 14 : 13, color: color ?? "inherit" }}
      >
        {fmt(value)}
      </TableCell>
    </TableRow>
  );
}

function TotalRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <TableRow sx={{ bgcolor: "rgba(27,42,74,0.05)" }}>
      <TableCell sx={{ fontWeight: 800, fontSize: 14, borderTop: `2px solid ${color}` }}>
        {label}
      </TableCell>
      <TableCell
        align="right"
        sx={{ fontWeight: 900, fontSize: 15, color, borderTop: `2px solid ${color}` }}
      >
        {fmt(value)}
      </TableCell>
    </TableRow>
  );
}

export default function BalanceSheet() {
  const { year, location } = useAppStore();
  const [data, setData] = useState<BalanceSheetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    referenceApi.getLocations().then((r) => setLocationOptions(r.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .balanceSheetSummary(year, location?.id)
      .then((r) => {
        const d = r.data;
        const c = (v: unknown) => Number(v);
        setData({
          cash_and_bank: c(d.cash_and_bank),
          accounts_receivable: c(d.accounts_receivable),
          total_assets: c(d.total_assets),
          caution_deposits_payable: c(d.caution_deposits_payable),
          total_liabilities: c(d.total_liabilities),
          retained_earnings_prior: c(d.retained_earnings_prior),
          current_year_profit: c(d.current_year_profit),
          total_equity: c(d.total_equity),
          is_balanced: d.is_balanced,
          imbalance_amount: c(d.imbalance_amount),
        });
      })
      .catch(() => setError("Failed to load balance sheet"))
      .finally(() => setLoading(false));
  }, [year, location]);

  return (
    <Box>
      <ReportHeader
        title="Balance Sheet"
        subtitle={`As at end of FY ${year}${location ? ` · ${location.name}` : " · All Locations"} · Option A (cumulative cash-basis)`}
        locationOptions={locationOptions}
        balanceBadge={
          data
            ? { balanced: data.is_balanced, amount: Math.abs(data.imbalance_amount) }
            : undefined
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && data && !data.is_balanced && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Balance sheet does not balance by ₦{Math.abs(data.imbalance_amount).toLocaleString()}.
          This is expected in a cash-basis system until full double-entry is implemented in Phase 5.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        {/* LEFT: Assets */}
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={2}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      <SectionHeader label="ASSETS" color={tokens.navy} />
                      <LineRow label="Cash & Bank" value={data!.cash_and_bank} indent />
                      <LineRow label="Accounts Receivable" value={data!.accounts_receivable} indent />
                      <TotalRow label="TOTAL ASSETS" value={data!.total_assets} color={tokens.navy} />
                    </>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        {/* RIGHT: Liabilities + Equity */}
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableBody>
                  {loading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={2}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      <SectionHeader label="LIABILITIES" color={tokens.danger} />
                      <LineRow label="Caution Deposits Payable" value={data!.caution_deposits_payable} indent />
                      <TotalRow label="TOTAL LIABILITIES" value={data!.total_liabilities} color={tokens.danger} />

                      <TableRow>
                        <TableCell colSpan={2} sx={{ py: 1 }}><Divider /></TableCell>
                      </TableRow>

                      <SectionHeader label="EQUITY" color="#5e35b1" />
                      <LineRow
                        label={`Retained Earnings (prior to FY ${year})`}
                        value={data!.retained_earnings_prior}
                        indent
                        color={data!.retained_earnings_prior >= 0 ? tokens.badgePaid.color : tokens.danger}
                      />
                      <LineRow
                        label={`Net Profit / (Loss) FY ${year}`}
                        value={data!.current_year_profit}
                        indent
                        color={data!.current_year_profit >= 0 ? tokens.badgePaid.color : tokens.danger}
                      />
                      <TotalRow label="TOTAL EQUITY" value={data!.total_equity} color="#5e35b1" />

                      <TableRow>
                        <TableCell colSpan={2} sx={{ py: 1 }}><Divider /></TableCell>
                      </TableRow>

                      <TableRow sx={{ bgcolor: "rgba(27,42,74,0.08)" }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: 14 }}>
                          TOTAL LIABILITIES + EQUITY
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, fontSize: 15, color: tokens.navy }}>
                          {fmt(data!.total_liabilities + data!.total_equity)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Note */}
      <Typography variant="caption" color={tokens.muted} sx={{ mt: 2, display: "block" }}>
        Note: This balance sheet uses Option A (cumulative cash-basis) — Cash & Bank reflects all revenue
        minus all expenses from company inception. Full double-entry bookkeeping is planned for Phase 5.
      </Typography>
    </Box>
  );
}
