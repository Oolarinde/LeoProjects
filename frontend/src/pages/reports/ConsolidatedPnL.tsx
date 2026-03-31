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
} from "@mui/material";
import { PictureAsPdf } from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { groupApi } from "../../services/api";
import { getErrorMessage } from "../../services/api";

function fmt(v: number): string {
  if (v < 0) return `(₦${Math.abs(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
  return `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface PnlLine {
  account: string;
  values: Record<string, number>;
  elimination: number;
  group_total: number;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface ConsolidatedPnlData {
  companies: CompanyInfo[];
  revenue_lines: PnlLine[];
  expense_lines: PnlLine[];
  total_revenue: Record<string, number>;
  total_expenses: Record<string, number>;
  net_profit: Record<string, number>;
  total_revenue_elimination: number;
  total_expenses_elimination: number;
  net_profit_elimination: number;
  total_revenue_group: number;
  total_expenses_group: number;
  net_profit_group: number;
}

export default function ConsolidatedPnL() {
  const { year } = useAppStore();
  const groupName = useAppStore((s) => s.companyGroupName) || "Group";
  const [data, setData] = useState<ConsolidatedPnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    groupApi
      .consolidatedPnl(year)
      .then((r) => {
        const d = r.data;
        const coerce = (lines: any[]) =>
          lines.map((l: any) => ({
            account: `${l.code} — ${l.name}`,
            values: Object.fromEntries(
              Object.entries(l.amounts || {}).map(([k, v]) => [k, Number(v)])
            ),
            elimination: Number(l.elimination ?? 0),
            group_total: Number(l.group_total ?? 0),
          }));
        const companyList: CompanyInfo[] = (d.companies || []).map((c: any) =>
          typeof c === "string" ? { id: c, name: c } : { id: c.id, name: c.name }
        );
        const totals = d.totals || {};
        const byCompany = totals.by_company || {};
        // Build per-company revenue/expense/profit maps
        const totalRevMap: Record<string, number> = {};
        const totalExpMap: Record<string, number> = {};
        const netProfitMap: Record<string, number> = {};
        for (const [cid, vals] of Object.entries(byCompany)) {
          const v = vals as any;
          totalRevMap[cid] = Number(v.revenue ?? 0);
          totalExpMap[cid] = Number(v.expenses ?? 0);
          netProfitMap[cid] = Number(v.net_profit ?? 0);
        }

        const revLines = coerce(d.revenue_lines || []);
        const expLines = coerce(d.expense_lines || []);

        // Compute elimination totals from lines
        const revElim = revLines.reduce((sum: number, l: any) => sum + l.elimination, 0);
        const expElim = expLines.reduce((sum: number, l: any) => sum + l.elimination, 0);

        setData({
          companies: companyList,
          revenue_lines: revLines,
          expense_lines: expLines,
          total_revenue: totalRevMap,
          total_expenses: totalExpMap,
          net_profit: netProfitMap,
          total_revenue_elimination: revElim,
          total_expenses_elimination: expElim,
          net_profit_elimination: revElim - expElim,
          total_revenue_group: Number(totals.total_revenue ?? 0),
          total_expenses_group: Number(totals.total_expenses ?? 0),
          net_profit_group: Number(totals.net_profit ?? 0),
        });
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [year]);

  const handleExportPdf = () => {
    window.print();
  };

  const companies = data?.companies ?? [];

  const renderLine = (line: PnlLine, bold = false) => (
    <TableRow key={line.account} hover>
      <TableCell sx={{ fontSize: 12, fontWeight: bold ? 700 : 400, pl: bold ? 2 : 3 }}>
        {line.account}
      </TableCell>
      {companies.map((c) => (
        <TableCell key={c.id} align="right" sx={{ fontSize: 12, fontWeight: bold ? 700 : 400 }}>
          {fmt(line.values[c.id] ?? 0)}
        </TableCell>
      ))}
      <TableCell align="right" sx={{ fontSize: 12, fontWeight: bold ? 700 : 400, color: tokens.muted }}>
        {line.elimination !== 0 ? fmt(line.elimination) : "—"}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, color: tokens.heading }}>
        {fmt(line.group_total)}
      </TableCell>
    </TableRow>
  );

  const renderTotalRow = (
    label: string,
    values: Record<string, number>,
    elimination: number,
    groupTotal: number,
    color?: string
  ) => (
    <TableRow sx={{ bgcolor: tokens.bg }}>
      <TableCell sx={{ fontSize: 12, fontWeight: 800, color: color || tokens.heading }}>
        {label}
      </TableCell>
      {companies.map((c) => (
        <TableCell key={c.id} align="right" sx={{ fontSize: 12, fontWeight: 700, color: color || tokens.heading }}>
          {fmt(values[c.id] ?? 0)}
        </TableCell>
      ))}
      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, color: tokens.muted }}>
        {elimination !== 0 ? fmt(elimination) : "—"}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800, color: color || tokens.heading }}>
        {fmt(groupTotal)}
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading }}>
            Consolidated Profit & Loss
          </Typography>
          <Typography sx={{ fontSize: 11, color: tokens.muted }}>
            {groupName} — FY {year}
          </Typography>
        </Box>
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
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 180 }}>Account</TableCell>
                  {companies.map((c) => (
                    <TableCell key={c.id} align="right" sx={{ minWidth: 110 }}>{c.name}</TableCell>
                  ))}
                  <TableCell align="right" sx={{ minWidth: 110, color: tokens.muted }}>Elimination</TableCell>
                  <TableCell align="right" sx={{ minWidth: 120, fontWeight: 800 }}>GROUP TOTAL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Revenue section */}
                <TableRow>
                  <TableCell
                    colSpan={companies.length + 3}
                    sx={{ fontSize: 11, fontWeight: 700, color: tokens.primary, textTransform: "uppercase", letterSpacing: "0.04em", pt: 2 }}
                  >
                    Revenue
                  </TableCell>
                </TableRow>
                {data.revenue_lines.map((line) => renderLine(line))}
                {renderTotalRow("Total Revenue", data.total_revenue, data.total_revenue_elimination, data.total_revenue_group)}

                {/* Expense section */}
                <TableRow>
                  <TableCell
                    colSpan={companies.length + 3}
                    sx={{ fontSize: 11, fontWeight: 700, color: tokens.pink, textTransform: "uppercase", letterSpacing: "0.04em", pt: 2 }}
                  >
                    Expenses
                  </TableCell>
                </TableRow>
                {data.expense_lines.map((line) => renderLine(line))}
                {renderTotalRow("Total Expenses", data.total_expenses, data.total_expenses_elimination, data.total_expenses_group, tokens.pink)}

                {/* Net Profit */}
                {renderTotalRow(
                  "Net Profit",
                  data.net_profit,
                  data.net_profit_elimination,
                  data.net_profit_group,
                  data.net_profit_group >= 0 ? "#17AD37" : tokens.danger
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
