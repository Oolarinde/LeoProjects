import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Skeleton,
  Alert,
} from "@mui/material";
import {
  Payments,
  MoneyOff,
  ShowChart,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Visibility,
  Edit,
  Search,
  Add,
  Download,
  ChevronLeft,
  ChevronRight,
  AddCard,
  ReceiptLong,
  Summarize,
  PictureAsPdf,
  AccountBalance,
  Assessment,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { dashboardApi } from "../services/api";
import type { DashboardSummary } from "../types/dashboard";

const PIE_COLORS = ["#2152FF", tokens.pink, tokens.success, "#7928CA", tokens.primary, tokens.secondary];

function formatNaira(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `\u20A6${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `\u20A6${(value / 1_000).toFixed(0)}K`;
  return `\u20A6${value.toLocaleString()}`;
}

function formatChangePct(pct: number | null): string {
  if (pct === null || pct === undefined) return "--";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { year, location } = useAppStore();
  const locationLabel = location?.name ?? t("dashboard.allLocations");

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .summary(year, location?.id)
      .then((resp) => {
        // Coerce Decimal strings from Python to JS numbers
        const d = resp.data;
        setData({
          ...d,
          total_revenue: Number(d.total_revenue),
          total_expenses: Number(d.total_expenses),
          net_profit: Number(d.net_profit),
          profit_margin: Number(d.profit_margin),
          staff_salaries: Number(d.staff_salaries),
          revenue_change_pct: d.revenue_change_pct != null ? Number(d.revenue_change_pct) : null,
          expense_change_pct: d.expense_change_pct != null ? Number(d.expense_change_pct) : null,
          monthly_pnl: (d.monthly_pnl || []).map((r: any) => ({ ...r, revenue: Number(r.revenue), expenses: Number(r.expenses) })),
          revenue_streams: (d.revenue_streams || []).map((r: any) => ({ ...r, value: Number(r.value) })),
          expense_budget: (d.expense_budget || []).map((r: any) => ({ ...r, spent: Number(r.spent), budget: Number(r.budget) })),
          cash_position: d.cash_position ? {
            opening_balance: Number(d.cash_position.opening_balance),
            cash_in: Number(d.cash_position.cash_in),
            cash_out: Number(d.cash_position.cash_out),
            net_cash_flow: Number(d.cash_position.net_cash_flow),
            closing_balance: Number(d.cash_position.closing_balance),
          } : { opening_balance: 0, cash_in: 0, cash_out: 0, net_cash_flow: 0, closing_balance: 0 },
          trial_balance: (d.trial_balance || []).map((r: any) => ({ ...r, debit: Number(r.debit), credit: Number(r.credit) })),
          recent_gl_entries: d.recent_gl_entries || [],
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, location]);

  // Derived KPIs
  const kpis = data
    ? [
        {
          label: t("dashboard.totalRevenue"),
          value: formatNaira(data.total_revenue),
          accent: tokens.primary,
          gradient: tokens.gradPrimary,
          icon: <Payments sx={{ fontSize: 20, color: "#fff" }} />,
          change: formatChangePct(data.revenue_change_pct),
          up: data.revenue_change_pct !== null ? (data.revenue_change_pct > 0 ? true : data.revenue_change_pct < 0 ? false : null) : null,
        },
        {
          label: t("dashboard.totalExpenses"),
          value: formatNaira(data.total_expenses),
          accent: tokens.pink,
          gradient: tokens.gradPink,
          icon: <MoneyOff sx={{ fontSize: 20, color: "#fff" }} />,
          change: formatChangePct(data.expense_change_pct),
          up: data.expense_change_pct !== null ? (data.expense_change_pct > 0 ? false : data.expense_change_pct < 0 ? true : null) : null,
        },
        {
          label: t("dashboard.netProfit"),
          value: formatNaira(data.net_profit),
          accent: "#17AD37",
          gradient: tokens.gradSuccess,
          icon: <ShowChart sx={{ fontSize: 20, color: "#fff" }} />,
          change: data.net_profit >= 0 ? t("dashboard.profit") : t("dashboard.loss"),
          up: data.net_profit >= 0 ? true : false,
        },
        {
          label: t("dashboard.profitMargin"),
          value: `${data.profit_margin.toFixed(1)}%`,
          accent: tokens.dark,
          gradient: tokens.gradDark,
          icon: <TrendingUp sx={{ fontSize: 20, color: "#fff" }} />,
          change: "",
          up: data.profit_margin > 0 ? true : data.profit_margin < 0 ? false : null,
        },
        {
          label: t("dashboard.staffSalaries"),
          value: formatNaira(data.staff_salaries),
          accent: "#7928CA",
          gradient: tokens.gradInfo,
          icon: <AccountBalance sx={{ fontSize: 20, color: "#fff" }} />,
          change: "",
          up: null,
        },
      ]
    : [];

  const glEntries = data?.recent_gl_entries ?? [];
  const filteredEntries = glEntries.filter((e) => {
    if (activeFilter === "income" && e.type !== "Income") return false;
    if (activeFilter === "expense" && e.type !== "Expense") return false;
    if (
      searchQuery &&
      !e.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !e.account.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const revenueStreams = (data?.revenue_streams ?? []).map((s, i) => ({
    ...s,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const isEmpty =
    data &&
    data.total_revenue === 0 &&
    data.total_expenses === 0 &&
    data.net_profit === 0;

  // Skeleton card helper
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
      {/* Breadcrumb */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mb: 1.5 }}>
        <Typography
          component="a"
          sx={{
            fontSize: 12,
            color: tokens.primary,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {t("dashboard.home")}
        </Typography>
        <Typography sx={{ fontSize: 11, color: tokens.secondaryText }}>/</Typography>
        <Typography sx={{ fontSize: 13, color: tokens.muted }}>{t("dashboard.title")}</Typography>
      </Box>

      <Typography sx={{ fontSize: 21, fontWeight: 700, color: tokens.heading, mb: 0.25 }}>
        {t("dashboard.title")}
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.muted, mb: 2.25 }}>
        {t("dashboard.financialOverview", { year, location: locationLabel })}
      </Typography>

      {/* Empty state */}
      {!loading && isEmpty && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          {t("dashboard.noFinancialData", { year })}
        </Alert>
      )}

      {/* KPI Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
          gap: 1.75,
          mb: 2.5,
        }}
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton width="60%" height={16} sx={{ mb: 1 }} />
                  <Skeleton width="80%" height={28} />
                  <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card
                key={kpi.label}
                role="figure"
                aria-label={`${kpi.label}: ${kpi.value}`}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: kpi.accent,
                  },
                  "&:hover": { boxShadow: tokens.shadowHover },
                  transition: "box-shadow 0.15s",
                }}
              >
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, color: tokens.muted, fontWeight: 500, mb: 0.375 }}>
                      {kpi.label}
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: tokens.heading, lineHeight: 1.2 }}>
                      {kpi.value}
                    </Typography>
                    {kpi.change && (
                      <Box sx={{ display: "flex", alignItems: "center", mt: 0.375, gap: 0.25 }}>
                        {kpi.up === true && <TrendingUp sx={{ fontSize: 12, color: "#17AD37" }} />}
                        {kpi.up === false && <TrendingDown sx={{ fontSize: 12, color: tokens.danger }} />}
                        {kpi.up === null && <TrendingFlat sx={{ fontSize: 13, color: tokens.muted }} />}
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: kpi.up === true ? "#17AD37" : kpi.up === false ? tokens.danger : tokens.muted,
                          }}
                        >
                          {kpi.change}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2.5,
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

      {/* Row 1: P&L Trend + Revenue Streams */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2.2fr 1fr" }, gap: 1.75, mb: 2.5 }}>
        {loading ? (
          <>
            {skeletonCard(280)}
            {skeletonCard(280)}
          </>
        ) : (
          <>
            {/* P&L Trend chart */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>
                    {t("dashboard.pnlTrend")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    {[
                      { label: t("nav.revenue"), color: "#2152FF" },
                      { label: t("nav.expenses"), color: tokens.pink },
                    ].map((l) => (
                      <Box key={l.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: l.color }} />
                        <Typography sx={{ fontSize: 11, color: tokens.muted }}>{l.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box
                  role="img"
                  aria-label="Monthly profit and loss trend chart showing revenue and expenses"
                  sx={{ height: 280 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.monthly_pnl ?? []}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2152FF" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#21D4FD" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: tokens.secondaryText }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: tokens.secondaryText }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(v) => `${v / 1000}K`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }}
                        formatter={(value: number, name: string) => [
                          `\u20A6${value.toLocaleString()}`,
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2152FF"
                        strokeWidth={2.5}
                        fill="url(#revGrad)"
                        dot={false}
                        activeDot={{ r: 4 }}
                        name={t("nav.revenue")}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke={tokens.pink}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                        name={t("nav.expenses")}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Revenue Streams */}
            <Card>
              <CardContent sx={{ p: "14px !important" }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading, mb: 1 }}>
                  {t("dashboard.revenueStreams")}
                </Typography>
                {revenueStreams.length > 0 ? (
                  <>
                    <Box role="img" aria-label="Revenue streams donut chart" sx={{ height: 170 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueStreams}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {revenueStreams.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }}
                            formatter={(value: number) => [`\u20A6${value.toLocaleString()}`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box>
                      {revenueStreams.map((d) => (
                        <Box
                          key={d.name}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 0.375,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: d.color }} />
                            <Typography sx={{ fontSize: 12, color: tokens.text }}>{d.name}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>
                            {formatNaira(d.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: tokens.muted, py: 4, textAlign: "center" }}>
                    {t("dashboard.noRevenueData")}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      {/* Row 2: Expense Budget + Cash Position + Trial Balance Summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 1.75,
          mb: 2.5,
        }}
      >
        {loading ? (
          <>
            {skeletonCard(180)}
            {skeletonCard(180)}
            {skeletonCard(180)}
          </>
        ) : (
          <>
            {/* Expense vs Budget */}
            <Card>
              <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.expenseVsBudget")}</Typography>
              </Box>
              <CardContent sx={{ pt: 0.5 }}>
                {(data?.expense_budget ?? []).length > 0 ? (
                  <>
                    <Box role="img" aria-label="Expense vs budget bar chart" sx={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.expense_budget ?? []} layout="vertical" margin={{ left: 0, right: 8 }}>
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: tokens.secondaryText }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="category"
                            tick={{ fontSize: 11, fill: tokens.heading }}
                            axisLine={false}
                            tickLine={false}
                            width={70}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }}
                            formatter={(value: number) => [`\u20A6${value.toLocaleString()}`, ""]}
                          />
                          <Bar dataKey="budget" fill="#e9ecef" radius={[0, 4, 4, 0]} barSize={10} />
                          <Bar dataKey="spent" fill="#2152FF" radius={[0, 4, 4, 0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#2152FF" }} />
                        <Typography sx={{ fontSize: 13, color: tokens.muted }}>{t("dashboard.spent")}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e9ecef" }} />
                        <Typography sx={{ fontSize: 13, color: tokens.muted }}>{t("nav.budget")}</Typography>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: tokens.muted, py: 4, textAlign: "center" }}>
                    {t("dashboard.noBudgetData")}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Cash Position summary */}
            <Card>
              <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.cashPosition")}</Typography>
              </Box>
              <CardContent sx={{ pt: 1 }}>
                {data?.cash_position ? (
                  <>
                    {[
                      { label: t("dashboard.openingBalance"), value: formatNaira(data.cash_position.opening_balance), color: tokens.heading },
                      { label: t("dashboard.cashIn"), value: `+${formatNaira(data.cash_position.cash_in)}`, color: "#17AD37" },
                      { label: t("dashboard.cashOut"), value: `-${formatNaira(data.cash_position.cash_out)}`, color: tokens.danger },
                      { label: t("dashboard.netCashFlow"), value: `${data.cash_position.net_cash_flow >= 0 ? "+" : ""}${formatNaira(data.cash_position.net_cash_flow)}`, color: data.cash_position.net_cash_flow >= 0 ? "#17AD37" : tokens.danger },
                    ].map((row) => (
                      <Box
                        key={row.label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          py: 0.875,
                          borderBottom: `1px solid ${tokens.borderFaint}`,
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography sx={{ fontSize: 13, color: tokens.muted }}>{row.label}</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</Typography>
                      </Box>
                    ))}
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: `2px solid ${tokens.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>{t("dashboard.closingBalance")}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: tokens.heading }}>
                        {formatNaira(data.cash_position.closing_balance)}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: tokens.muted, py: 4, textAlign: "center" }}>
                    {t("dashboard.noCashData")}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Trial Balance snapshot */}
            <Card>
              <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.trialBalance")}</Typography>
              </Box>
              <CardContent sx={{ pt: 1 }}>
                {(data?.trial_balance ?? []).length > 0 ? (
                  <>
                    {data!.trial_balance.map((row) => (
                      <Box
                        key={row.label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          py: 0.75,
                          borderBottom: `1px solid ${tokens.borderFaint}`,
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography sx={{ fontSize: 13, color: tokens.heading, flex: 1 }}>{row.label}</Typography>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: row.debit ? tokens.heading : "transparent",
                            width: 70,
                            textAlign: "right",
                          }}
                        >
                          {row.debit ? formatNaira(row.debit) : "\u2014"}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: row.credit ? tokens.heading : "transparent",
                            width: 70,
                            textAlign: "right",
                          }}
                        >
                          {row.credit ? formatNaira(row.credit) : "\u2014"}
                        </Typography>
                      </Box>
                    ))}
                    {(() => {
                      const totalDebit = data!.trial_balance.reduce((s, r) => s + r.debit, 0);
                      const totalCredit = data!.trial_balance.reduce((s, r) => s + r.credit, 0);
                      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
                      return (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              pt: 1,
                              mt: 0.5,
                              borderTop: `2px solid ${tokens.border}`,
                            }}
                          >
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading, flex: 1 }}>
                              {t("dashboard.total")}
                            </Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#17AD37", width: 70, textAlign: "right" }}>
                              {formatNaira(totalDebit)}
                            </Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#17AD37", width: 70, textAlign: "right" }}>
                              {formatNaira(totalCredit)}
                            </Typography>
                          </Box>
                          {balanced && (
                            <Box sx={{ mt: 1.5, textAlign: "center" }}>
                              <Chip
                                label={t("dashboard.balanced")}
                                size="small"
                                sx={{ bgcolor: "rgba(23,173,55,0.1)", color: "#17AD37", fontWeight: 700, fontSize: 10 }}
                              />
                            </Box>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: tokens.muted, py: 4, textAlign: "center" }}>
                    {t("dashboard.noTrialData")}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      {/* Recent GL Entries */}
      {loading ? (
        skeletonCard(300)
      ) : (
        <Card sx={{ mb: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.25, pt: 1.75 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.recentLedger")}</Typography>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <Button
                size="small"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                sx={{
                  bgcolor: tokens.primary,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.75,
                  py: 0.5,
                  "&:hover": { bgcolor: tokens.primaryDark },
                }}
              >
                {t("dashboard.newEntry")}
              </Button>
              <Button
                size="small"
                startIcon={<Download sx={{ fontSize: 14 }} />}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 2,
                  px: 1.75,
                  py: 0.5,
                  color: tokens.heading,
                }}
              >
                {t("dashboard.export")}
              </Button>
            </Box>
          </Box>

          {/* Search + type filters */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.25, py: 1.25 }}>
            <TextField
              size="small"
              placeholder={t("dashboard.searchEntries")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search ledger entries"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 14, color: tokens.secondaryText }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 200,
                "& .MuiOutlinedInput-root": { fontSize: 12, borderRadius: 2 },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {[
                { key: "all", label: t("common.all") },
                { key: "income", label: t("dashboard.income") },
                { key: "expense", label: t("dashboard.expense") },
              ].map((s) => (
                <Chip
                  key={s.key}
                  label={s.label}
                  size="small"
                  onClick={() => setActiveFilter(s.key)}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 5,
                    border: `1px solid ${activeFilter === s.key ? tokens.primary : tokens.border}`,
                    bgcolor: activeFilter === s.key ? tokens.primary : tokens.card,
                    color: activeFilter === s.key ? "#fff" : tokens.muted,
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: tokens.primary,
                      color: activeFilter === s.key ? "#fff" : tokens.primary,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("dashboard.date")}</TableCell>
                <TableCell>{t("dashboard.account")}</TableCell>
                <TableCell>{t("common.description")}</TableCell>
                <TableCell align="right">{t("dashboard.debit")}</TableCell>
                <TableCell align="right">{t("dashboard.credit")}</TableCell>
                <TableCell align="center">{t("common.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const initials = entry.account.slice(0, 2).toUpperCase();
                  const isIncome = entry.type === "Income";
                  const gradient = isIncome ? tokens.gradPrimary : tokens.gradPink;
                  return (
                    <TableRow key={entry.id} sx={{ "&:hover": { bgcolor: "#fafbfc" } }}>
                      <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{entry.date}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: gradient,
                              fontSize: 9,
                              fontWeight: 700,
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>
                              {entry.account}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 9,
                                color: isIncome ? "#17AD37" : tokens.danger,
                                fontWeight: 600,
                              }}
                            >
                              {entry.type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 250,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.description}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: entry.debit ? 700 : 400,
                          color: entry.debit ? tokens.heading : tokens.border,
                        }}
                      >
                        {entry.debit ? formatNaira(entry.debit) : "\u2014"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: entry.credit ? 700 : 400,
                          color: entry.credit ? "#17AD37" : tokens.border,
                        }}
                      >
                        {entry.credit ? formatNaira(entry.credit) : "\u2014"}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                          <IconButton
                            size="small"
                            aria-label="View"
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: 1.5,
                              bgcolor: "rgba(52,71,103,0.08)",
                              color: tokens.dark,
                              "&:hover": { bgcolor: "rgba(52,71,103,0.15)" },
                            }}
                          >
                            <Visibility sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Edit"
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: 1.5,
                              bgcolor: "rgba(23,193,232,0.1)",
                              color: tokens.primary,
                              "&:hover": { bgcolor: "rgba(23,193,232,0.2)" },
                            }}
                          >
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.muted }}>
                    {t("dashboard.noEntries")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2.25,
              py: 1.25,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Typography sx={{ fontSize: 13, color: tokens.muted }}>
              {t("common.showing")} {filteredEntries.length} {t("common.of")} {glEntries.length} {t("common.entries")}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.375 }}>
              <IconButton
                size="small"
                aria-label="Previous page"
                sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${tokens.border}` }}
              >
                <ChevronLeft sx={{ fontSize: 15 }} />
              </IconButton>
              <Button
                size="small"
                sx={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: 1.5,
                  border: `1px solid ${tokens.primary}`,
                  bgcolor: tokens.primary,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  p: 0,
                }}
              >
                1
              </Button>
              <IconButton
                size="small"
                aria-label="Next page"
                sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${tokens.border}` }}
              >
                <ChevronRight sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </Box>
        </Card>
      )}

      {/* Bottom: Budget Utilisation + Quick Actions */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.75 }}>
        {loading ? (
          <>
            {skeletonCard(200)}
            {skeletonCard(200)}
          </>
        ) : (
          <>
            {/* Budget utilisation */}
            <Card>
              <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.budgetUtilisation")}</Typography>
              </Box>
              <CardContent sx={{ pt: 0.5 }}>
                {(data?.expense_budget ?? []).length > 0 ? (
                  data!.expense_budget.map((item) => {
                    const pct = item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0;
                    const color = pct > 85 ? tokens.danger : pct > 60 ? "#c49c09" : "#17AD37";
                    return (
                      <Box key={item.category} sx={{ mb: 1.75, "&:last-child": { mb: 0 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.heading }}>
                            {item.category}
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color }}>
                            {pct}%{" "}
                            <Typography component="span" sx={{ fontSize: 9, fontWeight: 400, color: tokens.muted }}>
                              ({formatNaira(item.spent)} / {formatNaira(item.budget)})
                            </Typography>
                          </Typography>
                        </Box>
                        <Box sx={{ height: 5, bgcolor: "#e9ecef", borderRadius: 4, overflow: "hidden" }}>
                          <Box
                            sx={{
                              height: "100%",
                              width: `${Math.min(pct, 100)}%`,
                              bgcolor: color,
                              borderRadius: 4,
                              transition: "width 0.3s",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Typography sx={{ fontSize: 13, color: tokens.muted, py: 4, textAlign: "center" }}>
                    {t("dashboard.noBudgetData")}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>{t("dashboard.quickActions")}</Typography>
              </Box>
              <CardContent sx={{ pt: 0.5 }}>
                {[
                  { icon: <AddCard sx={{ fontSize: 18 }} />, gradient: tokens.gradPrimary, title: t("dashboard.recordRevenue"), sub: t("dashboard.addIncome") },
                  { icon: <ReceiptLong sx={{ fontSize: 18 }} />, gradient: tokens.gradPink, title: t("dashboard.logExpense"), sub: t("dashboard.addExpense") },
                  { icon: <Summarize sx={{ fontSize: 18 }} />, gradient: tokens.gradSuccess, title: t("dashboard.pnlReport"), sub: t("dashboard.pnlStatement") },
                  { icon: <Assessment sx={{ fontSize: 18 }} />, gradient: tokens.gradDark, title: t("dashboard.balanceSheetAction"), sub: t("dashboard.assetsLiabilitiesEquity") },
                  { icon: <PictureAsPdf sx={{ fontSize: 18 }} />, gradient: tokens.gradInfo, title: t("dashboard.exportPdf"), sub: t("dashboard.downloadStatements") },
                ].map((action, i, arr) => (
                  <Box
                    key={action.title}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.375,
                      py: 0.875,
                      borderBottom: i < arr.length - 1 ? `1px solid ${tokens.borderFaint}` : "none",
                      cursor: "pointer",
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2.25,
                        background: action.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>{action.title}</Typography>
                      <Typography sx={{ fontSize: 13, color: tokens.muted }}>{action.sub}</Typography>
                    </Box>
                    <ChevronRight sx={{ fontSize: 16, color: tokens.muted }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </Box>
  );
}
