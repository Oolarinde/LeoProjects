import { useState } from "react";
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

// ─── Sample accounting data ────────────────────────────────────────────────
const MONTHLY_PNL = [
  { month: "Jan", revenue: 4200, salaries: 400, maintenance: 350, utilities: 280, construction: 500, other: 1270 },
  { month: "Feb", revenue: 3800, salaries: 400, maintenance: 420, utilities: 310, construction: 600, other: 1370 },
  { month: "Mar", revenue: 5100, salaries: 400, maintenance: 300, utilities: 250, construction: 350, other: 1300 },
  { month: "Apr", revenue: 4600, salaries: 400, maintenance: 380, utilities: 290, construction: 450, other: 1380 },
  { month: "May", revenue: 3900, salaries: 400, maintenance: 450, utilities: 320, construction: 700, other: 1330 },
  { month: "Jun", revenue: 4800, salaries: 400, maintenance: 280, utilities: 260, construction: 400, other: 1360 },
  { month: "Jul", revenue: 5500, salaries: 400, maintenance: 350, utilities: 300, construction: 550, other: 1400 },
  { month: "Aug", revenue: 4100, salaries: 400, maintenance: 500, utilities: 340, construction: 800, other: 1360 },
  { month: "Sep", revenue: 3600, salaries: 400, maintenance: 300, utilities: 250, construction: 300, other: 1250 },
  { month: "Oct", revenue: 4400, salaries: 400, maintenance: 350, utilities: 280, construction: 450, other: 1320 },
  { month: "Nov", revenue: 3200, salaries: 400, maintenance: 400, utilities: 310, construction: 600, other: 1390 },
  { month: "Dec", revenue: 2000, salaries: 400, maintenance: 250, utilities: 200, construction: 200, other: 950 },
];

// All 6 income streams from Chart of Accounts
const REVENUE_STREAMS = [
  { name: "Room Revenue", value: 58, color: "#2152FF" },
  { name: "Shop Rent", value: 12, color: tokens.pink },
  { name: "Caution Fee Income", value: 10, color: tokens.success },
  { name: "Extra Charges", value: 8, color: "#7928CA" },
  { name: "Form & Legal Fees", value: 7, color: tokens.primary },
  { name: "Other Income", value: 5, color: tokens.secondary },
];

// Expense breakdown by category
const EXPENSE_BUDGET = [
  { category: "Salaries", spent: 4800, budget: 6000 },
  { category: "Maintenance", spent: 2700, budget: 4500 },
  { category: "Utilities", spent: 3200, budget: 3500 },
  { category: "Construction", spent: 1900, budget: 5000 },
  { category: "Admin", spent: 1200, budget: 2000 },
  { category: "Inventory", spent: 800, budget: 1500 },
];

// 5 KPI cards — accounting focused
const KPIS = [
  {
    label: "Total Revenue",
    value: "₦45.2M",
    accent: tokens.primary,
    gradient: tokens.gradPrimary,
    icon: <Payments sx={{ fontSize: 20, color: "#fff" }} />,
    change: "+12.5%",
    up: true,
  },
  {
    label: "Total Expenses",
    value: "₦28.1M",
    accent: tokens.pink,
    gradient: tokens.gradPink,
    icon: <MoneyOff sx={{ fontSize: 20, color: "#fff" }} />,
    change: "+8.2%",
    up: false,
  },
  {
    label: "Net Profit",
    value: "₦17.1M",
    accent: "#17AD37",
    gradient: tokens.gradSuccess,
    icon: <ShowChart sx={{ fontSize: 20, color: "#fff" }} />,
    change: "+18.4%",
    up: true,
  },
  {
    label: "Profit Margin",
    value: "37.8%",
    accent: tokens.dark,
    gradient: tokens.gradDark,
    icon: <TrendingUp sx={{ fontSize: 20, color: "#fff" }} />,
    change: "+3.2%",
    up: true,
  },
  {
    label: "Staff Salaries",
    value: "₦4.8M",
    accent: "#7928CA",
    gradient: tokens.gradInfo,
    icon: <AccountBalance sx={{ fontSize: 20, color: "#fff" }} />,
    change: "0%",
    up: null,
  },
];

// Recent GL entries — mixed income + expense, single line
const GL_ENTRIES = [
  { id: "GL-001", date: "Mar 25", account: "Room Revenue", type: "Income", description: "Adewale Ogunleye — Vine 2, Agbowo", debit: "", credit: "₦150,000", gradient: tokens.gradPrimary, initials: "AO" },
  { id: "GL-002", date: "Mar 24", account: "Maintenance", type: "Expense", description: "Plumbing repair — Building B, UI", debit: "₦45,000", credit: "", gradient: tokens.gradWarning, initials: "MX" },
  { id: "GL-003", date: "Mar 22", account: "Room Revenue", type: "Income", description: "Fatima Ibrahim — Scholar, UI", debit: "", credit: "₦200,000", gradient: tokens.gradSuccess, initials: "FI" },
  { id: "GL-004", date: "Mar 20", account: "Salaries", type: "Expense", description: "March payroll — 12 staff", debit: "₦480,000", credit: "", gradient: tokens.gradPink, initials: "PR" },
  { id: "GL-005", date: "Mar 18", account: "Shop Rent", type: "Income", description: "Oluwaseun Taiwo — Premier, Agbowo", debit: "", credit: "₦250,000", gradient: tokens.gradDark, initials: "OT" },
  { id: "GL-006", date: "Mar 15", account: "Utilities", type: "Expense", description: "IBEDC electricity — all locations", debit: "₦120,000", credit: "", gradient: tokens.gradInfo, initials: "UT" },
  { id: "GL-007", date: "Mar 12", account: "Caution Fee Income", type: "Income", description: "Blessing Nwosu — Anooore 1, UI", debit: "", credit: "₦20,000", gradient: tokens.gradPrimary, initials: "BN" },
  { id: "GL-008", date: "Mar 10", account: "Admin", type: "Expense", description: "Office supplies + printing", debit: "₦35,000", credit: "", gradient: tokens.gradWarning, initials: "AD" },
];

export default function Dashboard() {
  const { year, location } = useAppStore();
  const locationLabel = location?.name ?? "All Locations";
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = GL_ENTRIES.filter((e) => {
    if (activeFilter === "Income" && e.type !== "Income") return false;
    if (activeFilter === "Expense" && e.type !== "Expense") return false;
    if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase()) && !e.account.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mb: 1.5 }}>
        <Typography component="a" sx={{ fontSize: 12, color: tokens.primary, fontWeight: 600, textDecoration: "none", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>
          Home
        </Typography>
        <Typography sx={{ fontSize: 11, color: tokens.secondaryText }}>/</Typography>
        <Typography sx={{ fontSize: 13, color: tokens.muted }}>Dashboard</Typography>
      </Box>

      <Typography sx={{ fontSize: 21, fontWeight: 700, color: tokens.heading, mb: 0.25 }}>
        Dashboard
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.muted, mb: 2.25 }}>
        Financial overview for FY {year} — {locationLabel}
      </Typography>

      {/* KPI Cards — 5 columns, accounting-focused */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.75, mb: 2.5 }}>
        {KPIS.map((kpi) => (
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
                top: 0, left: 0, right: 0,
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
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.375, gap: 0.25 }}>
                  {kpi.up === true && <TrendingUp sx={{ fontSize: 12, color: "#17AD37" }} />}
                  {kpi.up === false && <TrendingDown sx={{ fontSize: 12, color: tokens.danger }} />}
                  {kpi.up === null && <TrendingFlat sx={{ fontSize: 13, color: tokens.muted }} />}
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: kpi.up === true ? "#17AD37" : kpi.up === false ? tokens.danger : tokens.muted }}>
                    {kpi.change}
                  </Typography>
                </Box>
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
        {/* P&L Trend chart */}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>
                Profit & Loss Trend
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {[
                  { label: "Revenue", color: "#2152FF" },
                  { label: "Salaries", color: tokens.pink },
                  { label: "Maintenance", color: "#F59E0B" },
                  { label: "Utilities", color: "#7928CA" },
                  { label: "Construction", color: tokens.danger },
                ].map((l) => (
                  <Box key={l.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: l.color }} />
                    <Typography sx={{ fontSize: 11, color: tokens.muted }}>{l.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box role="img" aria-label="Monthly profit and loss trend chart showing revenue, salaries, maintenance, utilities and construction" sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_PNL}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2152FF" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#21D4FD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tokens.secondaryText }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: tokens.secondaryText }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }}
                    formatter={(value: number, name: string) => [`₦${value.toLocaleString()}K`, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2152FF" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} name="Revenue" />
                  <Line type="monotone" dataKey="salaries" stroke={tokens.pink} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Salaries" />
                  <Line type="monotone" dataKey="maintenance" stroke="#F59E0B" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} strokeDasharray="4 2" name="Maintenance" />
                  <Line type="monotone" dataKey="utilities" stroke="#7928CA" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} name="Utilities" />
                  <Line type="monotone" dataKey="construction" stroke={tokens.danger} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} strokeDasharray="6 3" name="Construction" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Revenue Streams — all 6 income accounts */}
        <Card>
          <CardContent sx={{ p: "14px !important" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading, mb: 1 }}>
              Revenue Streams
            </Typography>
            <Box role="img" aria-label="Revenue streams donut chart" sx={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={REVENUE_STREAMS} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={2} dataKey="value">
                    {REVENUE_STREAMS.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }} formatter={(value: number) => [`${value}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box>
              {REVENUE_STREAMS.map((d) => (
                <Box key={d.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.375 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: d.color }} />
                    <Typography sx={{ fontSize: 12, color: tokens.text }}>{d.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>{d.value}%</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Row 2: Expense Budget + Cash Position + Trial Balance Summary */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.75, mb: 2.5 }}>
        {/* Expense vs Budget */}
        <Card>
          <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>Expense vs Budget</Typography>
          </Box>
          <CardContent sx={{ pt: 0.5 }}>
            <Box role="img" aria-label="Expense vs budget bar chart" sx={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EXPENSE_BUDGET} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: tokens.secondaryText }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: tokens.heading }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.border}`, fontSize: 12 }} formatter={(value: number) => [`₦${value.toLocaleString()}K`, ""]} />
                  <Bar dataKey="budget" fill="#e9ecef" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="spent" fill="#2152FF" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#2152FF" }} />
                <Typography sx={{ fontSize: 13, color: tokens.muted }}>Spent</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e9ecef" }} />
                <Typography sx={{ fontSize: 13, color: tokens.muted }}>Budget</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Cash Position summary */}
        <Card>
          <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>Cash Position</Typography>
          </Box>
          <CardContent sx={{ pt: 1 }}>
            {[
              { label: "Opening Balance", value: "₦8,200,000", color: tokens.heading },
              { label: "Cash In (Revenue)", value: "+₦45,200,000", color: "#17AD37" },
              { label: "Cash Out (Expenses)", value: "-₦28,100,000", color: tokens.danger },
              { label: "Net Cash Flow", value: "+₦17,100,000", color: "#17AD37" },
            ].map((row) => (
              <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.875, borderBottom: `1px solid ${tokens.borderFaint}`, "&:last-child": { borderBottom: "none" } }}>
                <Typography sx={{ fontSize: 13, color: tokens.muted }}>{row.label}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</Typography>
              </Box>
            ))}
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `2px solid ${tokens.border}`, display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>Closing Balance</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: tokens.heading }}>₦25,300,000</Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Trial Balance snapshot */}
        <Card>
          <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>Trial Balance</Typography>
          </Box>
          <CardContent sx={{ pt: 1 }}>
            {[
              { label: "Assets", debit: "₦42.3M", credit: "" },
              { label: "Liabilities", debit: "", credit: "₦8.2M" },
              { label: "Equity", debit: "", credit: "₦17.0M" },
              { label: "Revenue", debit: "", credit: "₦45.2M" },
              { label: "Expenses", debit: "₦28.1M", credit: "" },
            ].map((row) => (
              <Box key={row.label} sx={{ display: "flex", alignItems: "center", py: 0.75, borderBottom: `1px solid ${tokens.borderFaint}`, "&:last-child": { borderBottom: "none" } }}>
                <Typography sx={{ fontSize: 13, color: tokens.heading, flex: 1 }}>{row.label}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: row.debit ? tokens.heading : "transparent", width: 70, textAlign: "right" }}>
                  {row.debit || "—"}
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: row.credit ? tokens.heading : "transparent", width: 70, textAlign: "right" }}>
                  {row.credit || "—"}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: "flex", alignItems: "center", pt: 1, mt: 0.5, borderTop: `2px solid ${tokens.border}` }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading, flex: 1 }}>Total</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#17AD37", width: 70, textAlign: "right" }}>₦70.4M</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#17AD37", width: 70, textAlign: "right" }}>₦70.4M</Typography>
            </Box>
            <Box sx={{ mt: 1.5, textAlign: "center" }}>
              <Chip
                label="✓ Balanced"
                size="small"
                sx={{ bgcolor: "rgba(23,173,55,0.1)", color: "#17AD37", fontWeight: 700, fontSize: 10 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Recent GL Entries — income + expenses, one line per entry */}
      <Card sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.25, pt: 1.75 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>
            Recent Ledger Entries
          </Typography>
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
              New Entry
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
              Export
            </Button>
          </Box>
        </Box>

        {/* Search + type filters */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.25, py: 1.25 }}>
          <TextField
            size="small"
            placeholder="Search entries..."
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
            {["All", "Income", "Expense"].map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                onClick={() => setActiveFilter(s)}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 5,
                  border: `1px solid ${activeFilter === s ? tokens.primary : tokens.border}`,
                  bgcolor: activeFilter === s ? tokens.primary : tokens.card,
                  color: activeFilter === s ? "#fff" : tokens.muted,
                  cursor: "pointer",
                  "&:hover": { borderColor: tokens.primary, color: activeFilter === s ? "#fff" : tokens.primary },
                }}
              />
            ))}
          </Box>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.map((entry) => (
              <TableRow key={entry.id} sx={{ "&:hover": { bgcolor: "#fafbfc" } }}>
                <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{entry.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, borderRadius: "50%", background: entry.gradient, fontSize: 9, fontWeight: 700 }}>
                      {entry.initials}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.heading }}>{entry.account}</Typography>
                      <Typography sx={{ fontSize: 9, color: entry.type === "Income" ? "#17AD37" : tokens.danger, fontWeight: 600 }}>{entry.type}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.description}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: entry.debit ? 700 : 400, color: entry.debit ? tokens.heading : tokens.border }}>
                  {entry.debit || "—"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: entry.credit ? 700 : 400, color: entry.credit ? "#17AD37" : tokens.border }}>
                  {entry.credit || "—"}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                    <IconButton size="small" aria-label="View" sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: "rgba(52,71,103,0.08)", color: tokens.dark, "&:hover": { bgcolor: "rgba(52,71,103,0.15)" } }}>
                      <Visibility sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" aria-label="Edit" sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: "rgba(23,193,232,0.1)", color: tokens.primary, "&:hover": { bgcolor: "rgba(23,193,232,0.2)" } }}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.25, py: 1.25, borderTop: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontSize: 13, color: tokens.muted }}>Showing {filteredEntries.length} of {GL_ENTRIES.length} entries</Typography>
          <Box sx={{ display: "flex", gap: 0.375 }}>
            <IconButton size="small" aria-label="Previous page" sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${tokens.border}` }}>
              <ChevronLeft sx={{ fontSize: 15 }} />
            </IconButton>
            <Button size="small" sx={{ minWidth: 28, height: 28, borderRadius: 1.5, border: `1px solid ${tokens.primary}`, bgcolor: tokens.primary, color: "#fff", fontSize: 13, fontWeight: 600, p: 0 }}>1</Button>
            <IconButton size="small" aria-label="Next page" sx={{ width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${tokens.border}` }}>
              <ChevronRight sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>
      </Card>

      {/* Bottom: Quick Actions */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.75 }}>
        {/* Budget utilisation */}
        <Card>
          <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>Budget Utilisation</Typography>
          </Box>
          <CardContent sx={{ pt: 0.5 }}>
            {EXPENSE_BUDGET.map((item) => {
              const pct = Math.round((item.spent / item.budget) * 100);
              const color = pct > 85 ? tokens.danger : pct > 60 ? "#c49c09" : "#17AD37";
              return (
                <Box key={item.category} sx={{ mb: 1.75, "&:last-child": { mb: 0 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.heading }}>{item.category}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color }}>
                      {pct}% <Typography component="span" sx={{ fontSize: 9, fontWeight: 400, color: tokens.muted }}>(₦{item.spent.toLocaleString()}K / ₦{item.budget.toLocaleString()}K)</Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ height: 5, bgcolor: "#e9ecef", borderRadius: 4, overflow: "hidden" }}>
                    <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: "width 0.3s" }} />
                  </Box>
                </Box>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Box sx={{ px: 2.25, pt: 1.75, pb: 0.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: tokens.heading }}>Quick Actions</Typography>
          </Box>
          <CardContent sx={{ pt: 0.5 }}>
            {[
              { icon: <AddCard sx={{ fontSize: 18 }} />, gradient: tokens.gradPrimary, title: "Record Revenue", sub: "Add income entry" },
              { icon: <ReceiptLong sx={{ fontSize: 18 }} />, gradient: tokens.gradPink, title: "Log Expense", sub: "Add expense entry" },
              { icon: <Summarize sx={{ fontSize: 18 }} />, gradient: tokens.gradSuccess, title: "P&L Report", sub: "Profit & loss statement" },
              { icon: <Assessment sx={{ fontSize: 18 }} />, gradient: tokens.gradDark, title: "Balance Sheet", sub: "Assets, liabilities, equity" },
              { icon: <PictureAsPdf sx={{ fontSize: 18 }} />, gradient: tokens.gradInfo, title: "Export PDF", sub: "Download statements" },
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
      </Box>
    </Box>
  );
}
