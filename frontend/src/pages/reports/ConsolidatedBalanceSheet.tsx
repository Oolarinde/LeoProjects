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

interface BsLine {
  account: string;
  values: Record<string, number>;
  elimination: number;
  group_total: number;
}

interface BsSection {
  label: string;
  lines: BsLine[];
  total_values: Record<string, number>;
  total_elimination: number;
  total_group: number;
}

interface CompanyInfo { id: string; name: string; }

interface ConsolidatedBsData {
  companies: CompanyInfo[];
  assets: BsSection;
  liabilities: BsSection;
  equity: BsSection;
}

export default function ConsolidatedBalanceSheet() {
  const { year } = useAppStore();
  const groupName = useAppStore((s) => s.companyGroupName) || "Group";
  const [data, setData] = useState<ConsolidatedBsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    groupApi
      .consolidatedBs(year)
      .then((r) => {
        const d = r.data;
        const companyList: CompanyInfo[] = (d.companies || []).map((c: any) =>
          typeof c === "string" ? { id: c, name: c } : { id: c.id, name: c.name }
        );
        const byCompany: any[] = d.by_company || [];
        const consol = d.consolidated || {};
        const icElim = Number(consol.ic_elimination ?? 0);

        // Build sections from by_company data
        const buildSection = (
          label: string,
          lineDefsMap: [string, string][],  // [fieldKey, displayName]
          totalField: string,
          consolidatedTotalField: string,
        ): BsSection => {
          const lines: BsLine[] = lineDefsMap.map(([field, displayName]) => {
            const values: Record<string, number> = {};
            for (const c of byCompany) {
              values[c.company_id] = Number(c[field] ?? 0);
            }
            const companyTotal = Object.values(values).reduce((a, b) => a + b, 0);
            return {
              account: displayName,
              values,
              elimination: 0,
              group_total: companyTotal,
            };
          });
          const total_values: Record<string, number> = {};
          for (const c of byCompany) {
            total_values[c.company_id] = Number(c[totalField] ?? 0);
          }
          return {
            label,
            lines,
            total_values,
            total_elimination: label === "Assets" ? -icElim : label === "Liabilities" ? -icElim : 0,
            total_group: Number(consol[consolidatedTotalField] ?? 0),
          };
        };

        setData({
          companies: companyList,
          assets: buildSection("Assets",
            [["cash_and_bank", "Cash & Bank"]],
            "total_assets",
            "total_assets",
          ),
          liabilities: buildSection("Liabilities",
            [["caution_deposits_payable", "Caution Deposits Payable"]],
            "total_liabilities",
            "total_liabilities",
          ),
          equity: buildSection("Equity",
            [["retained_earnings", "Retained Earnings"], ["current_year_profit", "Current Year Profit"]],
            "total_equity",
            "total_equity",
          ),
        });
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [year]);

  const handleExportPdf = () => { window.print(); };

  const companies = data?.companies ?? [];

  const renderLine = (line: BsLine) => (
    <TableRow key={line.account} hover>
      <TableCell sx={{ fontSize: 12, pl: 3 }}>{line.account}</TableCell>
      {companies.map((c) => (
        <TableCell key={c.id} align="right" sx={{ fontSize: 12 }}>
          {fmt(line.values[c.id] ?? 0)}
        </TableCell>
      ))}
      <TableCell align="right" sx={{ fontSize: 12, color: tokens.muted }}>
        {line.elimination !== 0 ? fmt(line.elimination) : "—"}
      </TableCell>
      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
        {fmt(line.group_total)}
      </TableCell>
    </TableRow>
  );

  const renderSection = (section: BsSection, color: string) => (
    <>
      <TableRow>
        <TableCell
          colSpan={companies.length + 3}
          sx={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em", pt: 2 }}
        >
          {section.label}
        </TableCell>
      </TableRow>
      {section.lines.map(renderLine)}
      <TableRow sx={{ bgcolor: tokens.bg }}>
        <TableCell sx={{ fontSize: 12, fontWeight: 800, color: tokens.heading }}>
          Total {section.label}
        </TableCell>
        {companies.map((c) => (
          <TableCell key={c.id} align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
            {fmt(section.total_values[c.id] ?? 0)}
          </TableCell>
        ))}
        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, color: tokens.muted }}>
          {section.total_elimination !== 0 ? fmt(section.total_elimination) : "—"}
        </TableCell>
        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800 }}>
          {fmt(section.total_group)}
        </TableCell>
      </TableRow>
    </>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading }}>
            Consolidated Balance Sheet
          </Typography>
          <Typography sx={{ fontSize: 11, color: tokens.muted }}>
            {groupName} — As at 31 Dec {year}
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
                {renderSection(data.assets, tokens.primary)}
                {renderSection(data.liabilities, tokens.pink)}
                {renderSection(data.equity, "#7928CA")}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
