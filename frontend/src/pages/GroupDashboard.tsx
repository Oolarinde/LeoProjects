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
  Skeleton,
  Alert,
  Chip,
  Avatar,
} from "@mui/material";
import {
  Payments,
  MoneyOff,
  ShowChart,
  SwapHoriz,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { groupApi, companyApi } from "../services/api";
import { getErrorMessage } from "../services/api";
import { formatNaira } from "../utils/format";

const CHART_COLORS = ["#2152FF", tokens.pink, tokens.success, "#7928CA", tokens.primary, tokens.secondary];

function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value.toLocaleString()}`;
}

interface GroupDashboardData {
  group_name: string;
  year: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  ic_net_balance: number;
  subsidiaries: {
    company_id: string;
    company_name: string;
    entity_prefix: string | null;
    revenue: number;
    expenses: number;
    net_profit: number;
  }[];
  revenue_by_subsidiary: {
    month: string;
    [companyName: string]: string | number;
  }[];
  pending_ic_transactions: {
    id: string;
    date: string;
    source_company: string;
    target_company: string;
    amount: number;
    type: string;
  }[];
}

export default function GroupDashboard() {
  const { year } = useAppStore();
  const groupName = useAppStore((s) => s.companyGroupName) || "Group";

  const [data, setData] = useState<GroupDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { switchCompany, companies } = useAppStore();

  useEffect(() => {
    setLoading(true);
    setError("");
    groupApi
      .groupDashboard(year)
      .then((resp) => {
        const d = resp.data;
        setData({
          ...d,
          group_name: d.group_name || "",
          year: d.year || year,
          total_revenue: Number(d.group_revenue ?? 0),
          total_expenses: Number(d.group_expenses ?? 0),
          net_profit: Number(d.group_net_profit ?? 0),
          ic_net_balance: Number(d.ic_balance ?? 0),
          subsidiaries: (d.subsidiaries || []).map((s: any) => ({
            ...s,
            revenue: Number(s.revenue),
            expenses: Number(s.expenses),
            net_profit: Number(s.net_profit),
          })),
          revenue_by_subsidiary: d.revenue_by_subsidiary || [],
          pending_ic_transactions: d.pending_ic_transactions || [],
        });
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [year]);

  const handleCompanyClick = async (companyId: string) => {
    const target = companies.find((c) => c.id === companyId);
    if (!target) return;
    try {
      const resp = await companyApi.switchCompany(companyId);
      switchCompany(companyId, resp.data, target.name);
    } catch {
      // silent — company switch failed
    }
  };

  const kpis = data
    ? [
        {
          label: "Group Revenue",
          value: fmtCompact(data.total_revenue),
          accent: tokens.primary,
          gradient: tokens.gradPrimary,
          icon: <Payments sx={{ fontSize: 16, color: "#fff" }} />,
        },
        {
          label: "Group Expenses",
          value: fmtCompact(data.total_expenses),
          accent: tokens.pink,
          gradient: tokens.gradPink,
          icon: <MoneyOff sx={{ fontSize: 16, color: "#fff" }} />,
        },
        {
          label: "Group Net Profit",
          value: fmtCompact(data.net_profit),
          accent: "#17AD37",
          gradient: tokens.gradSuccess,
          icon: <ShowChart sx={{ fontSize: 16, color: "#fff" }} />,
        },
        {
          label: "IC Balance",
          value: fmtCompact(data.ic_net_balance),
          accent: tokens.dark,
          gradient: tokens.gradDark,
          icon: <SwapHoriz sx={{ fontSize: 16, color: "#fff" }} />,
        },
      ]
    : [];

  const subsidiaryNames = data?.subsidiaries?.map((s) => s.company_name) ?? [];

  const skeletonCard = (height = 200) => (
    <Card>
      <CardContent>
        <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={height} />
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading, mb: 0.25 }}>
        Group Dashboard — {groupName}
      </Typography>
      <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 2 }}>
        Financial Overview for FY {year}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 1.75,
          mb: 2.5,
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton width="60%" height={16} sx={{ mb: 1 }} />
                  <Skeleton width="80%" height={28} />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card
                key={kpi.label}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: kpi.accent,
                  },
                  "&:hover": { boxShadow: tokens.shadowHover },
                  transition: "box-shadow 0.15s",
                }}
              >
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 72 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: tokens.muted, fontWeight: 500, mb: 0.375, whiteSpace: "nowrap" }}>
                      {kpi.label}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: tokens.heading, lineHeight: 1.2 }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 2,
                      background: kpi.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </CardContent>
              </Card>
            ))}
      </Box>

      {/* Bottom row: Subsidiary Performance + Chart */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {/* Subsidiary Performance Table */}
        {loading ? (
          skeletonCard(240)
        ) : (
          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.heading, mb: 1.5 }}>
                Subsidiary Performance
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Expenses</TableCell>
                    <TableCell align="right">Net Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.subsidiaries ?? []).map((sub) => (
                    <TableRow
                      key={sub.company_id}
                      hover
                      sx={{ cursor: "pointer", "&:hover": { bgcolor: tokens.sidebarActiveBg } }}
                      onClick={() => handleCompanyClick(sub.company_id)}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Avatar
                            sx={{
                              width: 22,
                              height: 22,
                              fontSize: 9,
                              fontWeight: 700,
                              background: tokens.gradPrimary,
                            }}
                          >
                            {(sub.entity_prefix || sub.company_name.slice(0, 2)).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: tokens.heading }}>
                            {sub.company_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>
                        {formatNaira(sub.revenue)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, color: tokens.pink }}>
                        {formatNaira(sub.expenses)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: sub.net_profit >= 0 ? "#17AD37" : tokens.danger,
                          }}
                        >
                          {formatNaira(sub.net_profit)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.subsidiaries ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: tokens.muted, py: 3 }}>
                        No subsidiaries found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Subsidiary stacked bar chart */}
        {loading ? (
          skeletonCard(240)
        ) : (
          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.heading, mb: 1.5 }}>
                Revenue by Subsidiary
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.revenue_by_subsidiary ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tokens.axisLabel }} />
                  <YAxis tick={{ fontSize: 10, fill: tokens.axisLabel }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${tokens.border}` }}
                    formatter={(value: number) => formatNaira(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {subsidiaryNames.map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      stackId="revenue"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={i === subsidiaryNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Pending IC Transactions */}
      {!loading && (data?.pending_ic_transactions ?? []).length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.heading }}>
                Pending IC Transactions
              </Typography>
              <Chip
                size="small"
                label={data?.pending_ic_transactions.length}
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: tokens.badgePending.bg,
                  color: tokens.badgePending.color,
                }}
              />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.pending_ic_transactions ?? []).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell sx={{ fontSize: 12 }}>{tx.date}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{tx.type}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{tx.source_company}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{tx.target_company}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {formatNaira(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
