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
  Chip,
} from "@mui/material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { reportsApi, referenceApi } from "../../services/api";
import ReportHeader from "../../components/reports/ReportHeader";
import type { TrialBalanceSummary } from "../../types/reports";

function fmt(v: number) {
  if (v === 0) return "—";
  return Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  Asset: tokens.primary,
  Liability: tokens.danger,
  Equity: "#5e35b1",
  Revenue: tokens.badgePaid.color,
  Expense: "#e65100",
};

export default function TrialBalance() {
  const { year, location } = useAppStore();
  const [data, setData] = useState<TrialBalanceSummary | null>(null);
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
      .trialBalanceSummary(year, location?.id)
      .then((r) => {
        const d = r.data;
        setData({
          ...d,
          total_debit: Number(d.total_debit),
          total_credit: Number(d.total_credit),
          difference: Number(d.difference),
          lines: d.lines.map((l: TrialBalanceSummary["lines"][0]) => ({
            ...l,
            debit: Number(l.debit),
            credit: Number(l.credit),
          })),
        });
      })
      .catch(() => setError("Failed to load trial balance"))
      .finally(() => setLoading(false));
  }, [year, location]);

  return (
    <Box>
      <ReportHeader
        title="Trial Balance"
        subtitle={`FY ${year}${location ? ` · ${location.name}` : " · All Locations"}`}
        locationOptions={locationOptions}
        balanceBadge={
          data
            ? { balanced: data.is_balanced, amount: Math.abs(data.difference) }
            : undefined
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.navy }}>
                  <TableCell sx={{ color: "#fff", fontWeight: 700, width: 70 }}>Code</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Account Name</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: 700, width: 90 }}>Type</TableCell>
                  <TableCell align="right" sx={{ color: "#fff", fontWeight: 700, minWidth: 130 }}>
                    Debit (₦)
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#fff", fontWeight: 700, minWidth: 130 }}>
                    Credit (₦)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  : data?.lines.map((line) => (
                      <TableRow
                        key={line.code}
                        hover
                        sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}
                      >
                        <TableCell sx={{ fontSize: 12, color: tokens.muted, fontFamily: "monospace" }}>
                          {line.code}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{line.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={line.account_type}
                            size="small"
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              height: 20,
                              bgcolor: `${ACCOUNT_TYPE_COLORS[line.account_type] ?? tokens.muted}20`,
                              color: ACCOUNT_TYPE_COLORS[line.account_type] ?? tokens.muted,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: 13,
                            fontFamily: "monospace",
                            color: line.debit > 0 ? tokens.navy : tokens.border,
                          }}
                        >
                          {fmt(line.debit)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: 13,
                            fontFamily: "monospace",
                            color: line.credit > 0 ? tokens.badgePaid.color : tokens.border,
                          }}
                        >
                          {fmt(line.credit)}
                        </TableCell>
                      </TableRow>
                    ))}

                {/* Totals */}
                {!loading && data && (
                  <>
                    <TableRow sx={{ bgcolor: "rgba(27,42,74,0.06)" }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: 13 }}>
                        TOTAL
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 900, fontSize: 14, color: tokens.navy, fontFamily: "monospace" }}
                      >
                        {data.total_debit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 900,
                          fontSize: 14,
                          color: tokens.badgePaid.color,
                          fontFamily: "monospace",
                        }}
                      >
                        {data.total_credit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>

                    {!data.is_balanced && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ color: tokens.danger, fontSize: 12 }}>
                          Difference
                        </TableCell>
                        <TableCell
                          align="right"
                          colSpan={2}
                          sx={{ color: tokens.danger, fontWeight: 700, fontFamily: "monospace" }}
                        >
                          {Math.abs(data.difference).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
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
