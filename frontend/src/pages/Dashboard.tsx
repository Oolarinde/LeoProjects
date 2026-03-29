/**
 * Dashboard — main overview page.
 *
 * Sections (matching the Talents Apartment portal):
 *   Row 1 — 4 stat cards (gradient + plain variants)
 *   Row 2 — Income Channels area chart (full-width)
 *   Row 3 — Expiring Rents bar chart (left) + Room Types donut (right)
 *
 * Uses placeholder data — swap API calls in once the backend is ready.
 * All chart colors and styles come from src/theme/chartColors.ts.
 */

import { useState } from 'react';
import { Grid, Card, CardContent, CardHeader, Box, Typography, Stack, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ApartmentIcon from '@mui/icons-material/Apartment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import StatCard from '../components/StatCard';
import GradientDefs from '../components/charts/GradientDefs';
import {
  seriesConfig,
  areaGradients,
  axisStyle,
  gridStyle,
  tooltipStyle,
  legendStyle,
  DONUT_COLORS,
  DONUT_INNER_RADIUS,
  DONUT_OUTER_RADIUS,
  COLOR_BAR,
  BAR_BORDER_RADIUS,
  BAR_MAX_WIDTH,
} from '../theme';
import { tokens } from '../theme';
import { useFilter } from '../components/layout/AppShell';

// ─── Placeholder data (replace with API calls) ────────────────────────────────

const INCOME_DATA = [
  { month: 'Jan', rent: 320000, regForm: 80000, others: 40000 },
  { month: 'Feb', rent: 410000, regForm: 60000, others: 55000 },
  { month: 'Mar', rent: 380000, regForm: 90000, others: 30000 },
  { month: 'Apr', rent: 490000, regForm: 70000, others: 60000 },
  { month: 'May', rent: 520000, regForm: 110000, others: 45000 },
  { month: 'Jun', rent: 480000, regForm: 95000, others: 70000 },
  { month: 'Jul', rent: 600000, regForm: 120000, others: 50000 },
  { month: 'Aug', rent: 550000, regForm: 80000, others: 35000 },
  { month: 'Sep', rent: 620000, regForm: 100000, others: 80000 },
  { month: 'Oct', rent: 580000, regForm: 115000, others: 65000 },
  { month: 'Nov', rent: 700000, regForm: 130000, others: 90000 },
  { month: 'Dec', rent: 750000, regForm: 140000, others: 100000 },
];

const EXPIRING_DATA = [
  { month: 'Jan', count: 2 },
  { month: 'Feb', count: 1 },
  { month: 'Mar', count: 4 },
  { month: 'Apr', count: 3 },
  { month: 'May', count: 5 },
  { month: 'Jun', count: 2 },
  { month: 'Jul', count: 6 },
  { month: 'Aug', count: 3 },
  { month: 'Sep', count: 4 },
  { month: 'Oct', count: 7 },
  { month: 'Nov', count: 2 },
  { month: 'Dec', count: 1 },
];

const ROOM_TYPES = [
  { name: 'Single',        value: 5 },
  { name: 'Double',        value: 4 },
  { name: 'Suite',         value: 2 },
  { name: 'Scholar',       value: 3 },
  { name: 'Vine Special',  value: 1 },
];

const SPARK_RENT = INCOME_DATA.slice(-7).map(d => ({ v: d.rent }));
const SPARK_TENANTS = [{ v: 24 }, { v: 25 }, { v: 26 }, { v: 27 }, { v: 27 }, { v: 28 }, { v: 28 }];
const SPARK_INCOME = INCOME_DATA.slice(-7).map(d => ({ v: d.rent + d.regForm + d.others }));

const FILTER_TABS = ['All', 'Inhouse', 'Talents Apartment', 'Talents Hotel', 'All/30d'];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  '₦' + new Intl.NumberFormat('en-NG').format(v);


// ─── Section card wrapper ─────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  height = 280,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
            {title}
          </Typography>
        }
        subheader={
          subtitle && (
            <Typography variant="body2" sx={{ fontSize: '0.72rem', color: tokens.muted }}>
              {subtitle}
            </Typography>
          )
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Box height={height}>{children}</Box>
      </CardContent>
    </Card>
  );
}

// ─── Income channels legend dots ─────────────────────────────────────────────

function SeriesLegend() {
  const items = [
    { color: seriesConfig.rent.color,            label: 'Rent' },
    { color: seriesConfig.registrationForm.color, label: 'Reg. Form' },
    { color: seriesConfig.others.color,           label: 'Others' },
  ];
  return (
    <Stack direction="row" spacing={2} justifyContent="flex-end" mb={1}>
      {items.map(({ color, label }) => (
        <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: '0.7rem', color: tokens.muted, fontWeight: 600 }}>
            {label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { year, location } = useFilter();
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <Box>
      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap>
        {FILTER_TABS.map(tab => (
          <Button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            size="small"
            sx={{
              borderRadius: '20px',
              px: 2,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              background: activeFilter === tab ? tokens.gradientPrimary : '#ffffff',
              color: activeFilter === tab ? '#ffffff' : tokens.muted,
              boxShadow: activeFilter === tab
                ? '0 4px 7px -1px rgba(67,94,190,0.4)'
                : '0 2px 4px rgba(0,0,0,0.08)',
              border: 'none',
              '&:hover': {
                background: activeFilter === tab ? tokens.gradientPrimary : '#f0f2f8',
                boxShadow: activeFilter === tab
                  ? '0 4px 7px -1px rgba(67,94,190,0.4)'
                  : '0 2px 4px rgba(0,0,0,0.12)',
              },
            }}
          >
            {tab}
          </Button>
        ))}
      </Stack>

      {/* ── Row 1: Stat cards ──────────────────────────────────────────────── */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            variant="gradient"
            icon={<PeopleIcon />}
            label="Arrivals"
            value="28"
            change="+3"
            changeLabel="this week"
            sparkData={SPARK_TENANTS}
            sparkColor="rgba(255,255,255,0.8)"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            variant="gradient"
            icon={<PaidIcon />}
            label="Income"
            value={fmt(169487000)}
            change="+8%"
            changeLabel="vs last month"
            sparkData={SPARK_INCOME}
            sparkColor="rgba(255,255,255,0.8)"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            variant="plain"
            icon={<TrendingUpIcon />}
            label="Total Rent"
            value="311"
            change="+12"
            changeLabel="this month"
            sparkData={SPARK_RENT}
            sparkColor={tokens.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            variant="gradient"
            icon={<ApartmentIcon />}
            label="Apartments"
            value="286"
            change="+2"
            changeLabel="new this month"
          />
        </Grid>
      </Grid>

      {/* ── Row 2: Income channels (full-width area chart) ─────────────────── */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <ChartCard
            title="Income Channels"
            subtitle={`Monthly breakdown by source · ${year}${location !== 'All Locations' ? ' · ' + location : ''}`}
            height={280}
          >
            <SeriesLegend />
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={INCOME_DATA} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <GradientDefs />
                </defs>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="month" {...axisStyle} />
                <YAxis
                  tickFormatter={v => '₦' + (v / 1000) + 'k'}
                  tick={axisStyle.tick}
                  axisLine={axisStyle.axisLine}
                  tickLine={axisStyle.tickLine}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                  cursor={tooltipStyle.cursor}
                />
                <Area
                  type="monotone"
                  dataKey="rent"
                  name="Rent"
                  stroke={seriesConfig.rent.color}
                  strokeWidth={2}
                  fill={`url(#${areaGradients.rent.id})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="regForm"
                  name="Reg. Form"
                  stroke={seriesConfig.registrationForm.color}
                  strokeWidth={2}
                  fill={`url(#${areaGradients.primary.id})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="others"
                  name="Others"
                  stroke={seriesConfig.others.color}
                  strokeWidth={2}
                  fill={`url(#${areaGradients.primary.id})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Bar chart + Donut ───────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* Expiring Rents bar chart */}
        <Grid item xs={12} md={7}>
          <ChartCard
            title="Expiring Leases by Month"
            subtitle="Number of leases expiring per month"
            height={260}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={EXPIRING_DATA}
                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                barSize={BAR_MAX_WIDTH}
              >
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="month" {...axisStyle} />
                <YAxis
                  allowDecimals={false}
                  tick={axisStyle.tick}
                  axisLine={axisStyle.axisLine}
                  tickLine={axisStyle.tickLine}
                />
                <Tooltip
                  formatter={(value: number) => [value + ' leases', 'Expiring']}
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                  cursor={{ fill: 'rgba(58,65,111,0.05)' }}
                />
                <Bar
                  dataKey="count"
                  name="Expiring"
                  fill={COLOR_BAR}
                  radius={[BAR_BORDER_RADIUS, BAR_BORDER_RADIUS, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Room types donut */}
        <Grid item xs={12} md={5}>
          <ChartCard
            title="Room Types"
            subtitle="Units by room category"
            height={260}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ROOM_TYPES}
                  cx="45%"
                  cy="50%"
                  innerRadius={DONUT_INNER_RADIUS}
                  outerRadius={DONUT_OUTER_RADIUS}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {ROOM_TYPES.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                  {/* Centre label — rendered as SVG text overlay */}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value + ' units', name]}
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ ...legendStyle.wrapperStyle, paddingLeft: 12 }}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: tokens.muted }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Row 4: Bottom stat cards ────────────────────────────────────────── */}
      <Grid container spacing={3} mt={0}>
        <Grid item xs={12} sm={4}>
          <StatCard
            variant="gradient"
            icon={<HomeIcon />}
            label="Bookings"
            value="4"
            change="+1"
            changeLabel="pending today"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            variant="gradient"
            icon={<NotificationsActiveIcon />}
            label="Upkeep Notifications"
            value="25"
            change="3"
            changeLabel="unresolved"
            positive={false}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            variant="gradient"
            icon={<AppRegistrationIcon />}
            label="Registration"
            value="12"
            change="+2"
            changeLabel="this week"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
