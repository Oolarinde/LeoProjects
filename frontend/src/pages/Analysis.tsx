import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { analysisApi, referenceApi } from "../services/api";
import ReportHeader from "../components/reports/ReportHeader";

const PIE_COLORS = ["#2152FF", tokens.pink, tokens.success, "#7928CA", tokens.primary, tokens.secondary, "#FF6B35", "#004E64"];

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
  return `₦${v.toLocaleString()}`;
}

function fmtFull(v: number) {
  return `₦${Number(v).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

interface AnalysisData {
  monthly_rev_exp: { month: string; revenue: number; expenses: number; net: number }[];
  expense_by_category: { name: string; amount: number }[];
  revenue_by_source: { name: string; amount: number }[];
  yoy_revenue: { month: string; current_year: number; prior_year: number }[];
  monthly_cashflow: { month: string; revenue: number; expenses: number; net: number }[];
  budget_utilization: { category: string; spent: number; budget: number; pct: number }[];
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  avg_monthly_revenue: number;
  avg_monthly_expense: number;
  top_expense_category: string;
  top_revenue_source: string;
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
      <CardContent sx={{ py: "10px !important" }}>
        <Typography sx={{ fontSize: 11, color: tokens.muted, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color, mt: 0.25 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children, height = 220 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
      <CardContent>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.navy, mb: 1.5 }}>{title}</Typography>
        <Box sx={{ height }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export default function Analysis() {
  const { year, location } = useAppStore();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    referenceApi.getLocations().then((r) => setLocationOptions(r.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    analysisApi
      .summary(year, location?.id)
      .then((r) => {
        const d = r.data;
        const c = (v: unknown) => Number(v);
        setData({
          monthly_rev_exp: d.monthly_rev_exp.map((m: any) => ({ ...m, revenue: c(m.revenue), expenses: c(m.expenses), net: c(m.net) })),
          expense_by_category: d.expense_by_category.map((m: any) => ({ ...m, amount: c(m.amount) })),
          revenue_by_source: d.revenue_by_source.map((m: any) => ({ ...m, amount: c(m.amount) })),
          yoy_revenue: d.yoy_revenue.map((m: any) => ({ ...m, current_year: c(m.current_year), prior_year: c(m.prior_year) })),
          monthly_cashflow: d.monthly_cashflow.map((m: any) => ({ ...m, revenue: c(m.revenue), expenses: c(m.expenses), net: c(m.net) })),
          budget_utilization: d.budget_utilization.map((m: any) => ({ ...m, spent: c(m.spent), budget: c(m.budget), pct: c(m.pct) })),
          total_revenue: c(d.total_revenue),
          total_expenses: c(d.total_expenses),
          net_profit: c(d.net_profit),
          avg_monthly_revenue: c(d.avg_monthly_revenue),
          avg_monthly_expense: c(d.avg_monthly_expense),
          top_expense_category: d.top_expense_category,
          top_revenue_source: d.top_revenue_source,
        });
      })
      .catch(() => setError("Failed to load analysis data"))
      .finally(() => setLoading(false));
  }, [year, location]);

  const isProfit = (data?.net_profit ?? 0) >= 0;

  return (
    <Box>
      <ReportHeader
        title="Financial Analysis"
        subtitle={`FY ${year}${location ? ` · ${location.name}` : " · All Locations"}`}
        locationOptions={locationOptions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={250} sx={{ borderRadius: 3 }} />)}
        </Box>
      ) : data ? (
        <>
          {/* KPI Row */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 1.5, mb: 2.5 }}>
            <KpiCard label="Total Revenue" value={fmt(data.total_revenue)} color={tokens.navy} />
            <KpiCard label="Total Expenses" value={fmt(data.total_expenses)} color={tokens.danger} />
            <KpiCard label={isProfit ? "Net Profit" : "Net Loss"} value={fmt(Math.abs(data.net_profit))} color={isProfit ? tokens.badgePaid.color : tokens.danger} />
            <KpiCard label="Avg Monthly Revenue" value={fmt(data.avg_monthly_revenue)} color={tokens.primary} />
            <KpiCard label="Top Revenue Source" value={data.top_revenue_source || "—"} color={tokens.navy} />
            <KpiCard label="Top Expense" value={data.top_expense_category || "—"} color={tokens.danger} />
          </Box>

          {/* Chart Row 1: Revenue vs Expense + Expense Pie */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2, mb: 2 }}>
            <ChartCard title="Revenue vs Expenses by Month">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthly_rev_exp} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.borderFaint} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tokens.secondaryText }} />
                  <YAxis tick={{ fontSize: 10, fill: tokens.secondaryText }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.border}`, fontSize: 11, boxShadow: tokens.shadowCard }}
                    formatter={(v: number) => [fmtFull(v), ""]}
                  />
                  <Area type="monotone" dataKey="revenue" fill="rgba(33,82,255,0.12)" stroke="#2152FF" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" fill="rgba(234,6,6,0.08)" stroke={tokens.danger} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Expenses by Category">
              {data.expense_by_category.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={data.expense_by_category}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {data.expense_by_category.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 10, fontSize: 11 }}
                        formatter={(v: number) => [fmtFull(v), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 0.5 }}>
                    {data.expense_by_category.slice(0, 5).map((d, i) => (
                      <Box key={d.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <Typography sx={{ fontSize: 11 }}>{d.name}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{fmt(d.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: tokens.muted, textAlign: "center", pt: 6 }}>No expense data</Typography>
              )}
            </ChartCard>
          </Box>

          {/* Chart Row 2: Revenue Sources + YoY Comparison */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 2 }}>
            <ChartCard title="Revenue by Source">
              {data.revenue_by_source.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenue_by_source} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: tokens.secondaryText }} tickFormatter={(v) => fmt(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: tokens.heading }} width={90} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, fontSize: 11 }}
                      formatter={(v: number) => [fmtFull(v), "Revenue"]}
                    />
                    <Bar dataKey="amount" fill="#2152FF" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography sx={{ fontSize: 11, color: tokens.muted, textAlign: "center", pt: 6 }}>No revenue data</Typography>
              )}
            </ChartCard>

            <ChartCard title={`Year-over-Year Revenue (${year} vs ${year - 1})`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.yoy_revenue} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.borderFaint} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tokens.secondaryText }} />
                  <YAxis tick={{ fontSize: 10, fill: tokens.secondaryText }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, fontSize: 11 }}
                    formatter={(v: number, name: string) => [fmtFull(v), name === "current_year" ? `FY ${year}` : `FY ${year - 1}`]}
                  />
                  <Bar dataKey="current_year" name={`FY ${year}`} fill="#2152FF" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="prior_year" name={`FY ${year - 1}`} fill={tokens.secondary} radius={[4, 4, 0, 0]} barSize={10} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>

          {/* Chart Row 3: Cash Flow Line + Budget Utilization */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <ChartCard title="Monthly Cash Flow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthly_cashflow} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.borderFaint} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tokens.secondaryText }} />
                  <YAxis tick={{ fontSize: 10, fill: tokens.secondaryText }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, fontSize: 11 }}
                    formatter={(v: number, name: string) => [fmtFull(v), name === "net" ? "Net Flow" : name === "revenue" ? "Cash In" : "Cash Out"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke={tokens.badgePaid.color} strokeWidth={2} dot={{ r: 3 }} name="Cash In" />
                  <Line type="monotone" dataKey="expenses" stroke={tokens.danger} strokeWidth={2} dot={{ r: 3 }} name="Cash Out" />
                  <Line type="monotone" dataKey="net" stroke="#2152FF" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 5" name="Net Flow" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Budget Utilization" height={Math.max(220, data.budget_utilization.length * 45)}>
              {data.budget_utilization.length > 0 ? (
                <Box>
                  {data.budget_utilization.map((b) => {
                    const pct = Number(b.pct);
                    const color = pct > 100 ? tokens.danger : pct > 80 ? "#e65100" : pct > 60 ? "#9a7a08" : tokens.badgePaid.color;
                    return (
                      <Box key={b.category} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{b.category}</Typography>
                          <Typography sx={{ fontSize: 11, color: tokens.muted }}>
                            {fmtFull(b.spent)} / {b.budget > 0 ? fmtFull(b.budget) : "No budget"}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(pct, 100)}
                            sx={{
                              flex: 1,
                              height: 8,
                              borderRadius: 4,
                              bgcolor: tokens.borderFaint,
                              "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
                            }}
                          />
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
                            {b.budget > 0 ? `${pct.toFixed(0)}%` : "—"}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 11, color: tokens.muted, textAlign: "center", pt: 6 }}>No budget data</Typography>
              )}
            </ChartCard>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
