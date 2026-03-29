import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  AttachMoney,
  MoneyOff,
  ShowChart,
  GroupWork,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";

// ─── Sample data (will be replaced by API calls in Phase 2) ──────────────────
const MONTHLY = [
  { month: "Jan", revenue: 4200, expenses: 2800 },
  { month: "Feb", revenue: 3800, expenses: 3100 },
  { month: "Mar", revenue: 5100, expenses: 2600 },
  { month: "Apr", revenue: 4600, expenses: 2900 },
  { month: "May", revenue: 3900, expenses: 3200 },
  { month: "Jun", revenue: 4800, expenses: 2700 },
  { month: "Jul", revenue: 5500, expenses: 3000 },
  { month: "Aug", revenue: 4100, expenses: 3400 },
  { month: "Sep", revenue: 3600, expenses: 2500 },
  { month: "Oct", revenue: 4400, expenses: 2800 },
  { month: "Nov", revenue: 3200, expenses: 3100 },
  { month: "Dec", revenue: 2000, expenses: 2000 },
];

const DONUT = [
  { name: "Room Revenue", value: 65, color: tokens.primary },
  { name: "Shop Rent", value: 12, color: tokens.pink },
  { name: "Caution Fees", value: 10, color: tokens.success },
  { name: "Extra Charges", value: 8, color: tokens.info },
  { name: "Other", value: 5, color: tokens.muted },
];

const KPIS = [
  { label: "Total Revenue", value: "₦45.2M", color: tokens.primary, icon: <AttachMoney sx={{ fontSize: 22, color: "#fff" }} />, change: "+12.5%", up: true },
  { label: "Total Expenses", value: "₦28.1M", color: tokens.pink, icon: <MoneyOff sx={{ fontSize: 22, color: "#fff" }} />, change: "+8.2%", up: false },
  { label: "Net Profit", value: "₦17.1M", color: tokens.success, icon: <ShowChart sx={{ fontSize: 22, color: "#fff" }} />, change: "+18.4%", up: true },
  { label: "Staff Salaries", value: "₦4.8M", color: tokens.info, icon: <GroupWork sx={{ fontSize: 22, color: "#fff" }} />, change: "0%", up: true },
  { label: "Profit Margin", value: "37.8%", color: tokens.primaryDark, icon: <TrendingUp sx={{ fontSize: 22, color: "#fff" }} />, change: "+3.2%", up: true },
];

export default function Dashboard() {
  const { year, location } = useAppStore();
  const locationLabel = location?.name ?? "All Locations";

  return (
    <Box>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: tokens.heading, mb: 0.5 }}>
        Dashboard
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.muted, mb: 2.5 }}>
        Financial overview for FY {year} — {locationLabel}
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 2, mb: 3 }}>
        {KPIS.map((kpi) => (
          <Card key={kpi.label} role="figure" aria-label={`${kpi.label}: ${kpi.value}`}>
            <CardContent sx={{ p: "16px 20px !important", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography sx={{ fontSize: 26, fontWeight: 700, color: tokens.heading, lineHeight: 1.2 }}>
                  {kpi.value}
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.muted, mt: 0.5 }}>
                  {kpi.label}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, gap: 0.5 }}>
                  {kpi.up ? (
                    <TrendingUp sx={{ fontSize: 14, color: tokens.success }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: tokens.danger }} />
                  )}
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: kpi.up ? tokens.success : tokens.danger }}>
                    {kpi.change}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: 2.5,
                  bgcolor: kpi.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 10px ${kpi.color}40`,
                }}
              >
                {kpi.icon}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Charts row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2.2fr 1fr" }, gap: 2 }}>
        {/* Revenue vs Expenses line chart */}
        <Card>
          <CardContent sx={{ p: "16px 20px !important" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading }}>
                Revenue vs Expenses
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: tokens.primary }} />
                  <Typography sx={{ fontSize: 11, color: tokens.muted }}>Revenue (₦'000)</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: tokens.pink }} />
                  <Typography sx={{ fontSize: 11, color: tokens.muted }}>Expenses (₦'000)</Typography>
                </Box>
              </Box>
            </Box>
            <Box role="img" aria-label="Revenue vs Expenses monthly trend" sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tokens.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: tokens.muted }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}K`, ""]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke={tokens.primary} strokeWidth={2.5} dot={{ r: 3, fill: tokens.primary }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="expenses" stroke={tokens.pink} strokeWidth={2.5} dot={{ r: 3, fill: tokens.pink }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Revenue breakdown donut */}
        <Card>
          <CardContent sx={{ p: "16px !important" }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.heading, mb: 1 }}>
              Revenue Breakdown
            </Typography>
            <Box role="img" aria-label="Revenue breakdown by category" sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DONUT} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                    {DONUT.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }} formatter={(value: number) => [`${value}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 1 }}>
              {DONUT.map((d) => (
                <Box key={d.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: d.color }} />
                    <Typography sx={{ fontSize: 12, color: tokens.text }}>{d.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.heading }}>{d.value}%</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
