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
  Typography,
  Button,
  Chip,
} from "@mui/material";
import { PictureAsPdf } from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { groupApi } from "../../services/api";
import { getErrorMessage } from "../../services/api";

function fmt(v: number): string {
  if (v === 0) return "—";
  if (v < 0) return `(₦${Math.abs(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
  return `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface TbLine {
  code: string;
  account: string;
  company_values: Record<string, { debit: number; credit: number }>;
  elimination_debit: number;
  elimination_credit: number;
  group_debit: number;
  group_credit: number;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface ConsolidatedTbData {
  companies: CompanyInfo[];
  lines: TbLine[];
  totals: {
    company_values: Record<string, { debit: number; credit: number }>;
    elimination_debit: number;
    elimination_credit: number;
    group_debit: number;
    group_credit: number;
  };
  balanced: boolean;
}

export default function ConsolidatedTrialBalance() {
  const { year } = useAppStore();
  const groupName = useAppStore((s) => s.companyGroupName) || "Group";
  const [data, setData] = useState<ConsolidatedTbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    groupApi
      .consolidatedTb(year)
      .then((r) => {
        const d = r.data;
        const coerceLine = (l: any): TbLine => ({
          code: l.code,
          account: l.name || "",
          company_values: Object.fromEntries(
            Object.entries(l.by_company || l.company_values || {}).map(([k, v]: [string, any]) => [
              k,
              { debit: Number(v.debit ?? 0), credit: Number(v.credit ?? 0) },
            ])
          ),
          elimination_debit: Number(l.elimination_debit ?? 0),
          elimination_credit: Number(l.elimination_credit ?? 0),
          group_debit: Number(l.group_debit ?? 0),
          group_credit: Number(l.group_credit ?? 0),
        });
        // Build totals from rows if backend doesn't provide separate totals
        const lines = (d.rows || []).map(coerceLine);
        const companyList: CompanyInfo[] = (d.companies || []).map((c: any) =>
          typeof c === "string" ? { id: c, name: c } : { id: c.id, name: c.name }
        );
        setData({
          companies: companyList,
          lines,
          totals: {
            company_values: {},
            elimination_debit: 0,
            elimination_credit: 0,
            group_debit: Number(d.total_debit ?? 0),
            group_credit: Number(d.total_credit ?? 0),
          },
          balanced: d.is_balanced ?? d.balanced ?? false,
        });
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [year]);

  const handleExportPdf = () => { window.print(); };

  const companies = data?.companies ?? [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading }}>
            Consolidated Trial Balance
          </Typography>
          <Typography sx={{ fontSize: 11, color: tokens.muted }}>
            {groupName} — FY {year}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {data && (
            <Chip
              size="small"
              label={data.balanced ? "Balanced" : "Imbalanced"}
              sx={{
                fontSize: 10,
                fontWeight: 700,
                bgcolor: data.balanced ? tokens.badgePaid.bg : tokens.badgeOverdue.bg,
                color: data.balanced ? tokens.badgePaid.color : tokens.badgeOverdue.color,
              }}
            />
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<PictureAsPdf sx={{ fontSize: 14 }} />}
            onClick={handleExportPdf}
            sx={{ fontSize: 11, background: tokens.gradDark }}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton variant="rectangular" height={400} />
          </CardContent>
        </Card>
      ) : !data ? (
        <Alert severity="info">No consolidated data available for FY {year}</Alert>
      ) : (
        <Card>
          <CardContent sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 70 }}>Code</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Account</TableCell>
                  {companies.map((c) => (
                    <TableCell key={c.id} align="center" colSpan={2} sx={{ minWidth: 160 }}>
                      {c.name}
                    </TableCell>
                  ))}
                  <TableCell align="center" colSpan={2} sx={{ minWidth: 160, color: tokens.muted }}>
                    Elimination
                  </TableCell>
                  <TableCell align="center" colSpan={2} sx={{ minWidth: 160, fontWeight: 800 }}>
                    GROUP TOTAL
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell />
                  <TableCell />
                  {companies.map((c) => [
                    <TableCell key={`${c.id}-dr`} align="right" sx={{ fontSize: 9, fontWeight: 700, color: tokens.muted }}>DR</TableCell>,
                    <TableCell key={`${c.id}-cr`} align="right" sx={{ fontSize: 9, fontWeight: 700, color: tokens.muted }}>CR</TableCell>,
                  ])}
                  <TableCell align="right" sx={{ fontSize: 9, fontWeight: 700, color: tokens.muted }}>DR</TableCell>
                  <TableCell align="right" sx={{ fontSize: 9, fontWeight: 700, color: tokens.muted }}>CR</TableCell>
                  <TableCell align="right" sx={{ fontSize: 9, fontWeight: 700 }}>DR</TableCell>
                  <TableCell align="right" sx={{ fontSize: 9, fontWeight: 700 }}>CR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.code} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{line.code}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{line.account}</TableCell>
                    {companies.map((c) => {
                      const cv = line.company_values[c.id] || { debit: 0, credit: 0 };
                      return [
                        <TableCell key={`${c.id}-dr`} align="right" sx={{ fontSize: 12 }}>
                          {fmt(cv.debit)}
                        </TableCell>,
                        <TableCell key={`${c.id}-cr`} align="right" sx={{ fontSize: 12 }}>
                          {fmt(cv.credit)}
                        </TableCell>,
                      ];
                    })}
                    <TableCell align="right" sx={{ fontSize: 12, color: tokens.muted }}>
                      {fmt(line.elimination_debit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, color: tokens.muted }}>
                      {fmt(line.elimination_credit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                      {fmt(line.group_debit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                      {fmt(line.group_credit)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals row */}
                <TableRow sx={{ bgcolor: tokens.bg, borderTop: `2px solid ${tokens.border}` }}>
                  <TableCell sx={{ fontSize: 12, fontWeight: 800 }} colSpan={2}>
                    TOTALS
                  </TableCell>
                  {companies.map((c) => {
                    const cv = data.totals.company_values[c.id] || { debit: 0, credit: 0 };
                    return [
                      <TableCell key={`${c.id}-dr`} align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                        {fmt(cv.debit)}
                      </TableCell>,
                      <TableCell key={`${c.id}-cr`} align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                        {fmt(cv.credit)}
                      </TableCell>,
                    ];
                  })}
                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, color: tokens.muted }}>
                    {fmt(data.totals.elimination_debit)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, color: tokens.muted }}>
                    {fmt(data.totals.elimination_credit)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800 }}>
                    {fmt(data.totals.group_debit)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800 }}>
                    {fmt(data.totals.group_credit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
