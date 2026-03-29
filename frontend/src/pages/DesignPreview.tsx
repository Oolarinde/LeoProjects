/**
 * DesignPreview — temporary dev-only page to verify theme + components
 * Remove or gate behind a dev flag before production
 */

import { Box, Grid, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import StatCard from '../components/StatCard';
import { COLOR_RENT, COLOR_INFO_SERIES, tokens } from '../theme';

const sparkRent = [
  { v: 320 }, { v: 410 }, { v: 380 }, { v: 490 },
  { v: 520 }, { v: 480 }, { v: 600 },
];

const sparkOccupancy = [
  { v: 70 }, { v: 75 }, { v: 80 }, { v: 72 },
  { v: 85 }, { v: 88 }, { v: 90 },
];

export default function DesignPreview() {
  return (
    <Box sx={{ p: 3, background: tokens.bg, minHeight: '100vh' }}>
      <Typography variant="h5" mb={3}>Design System Preview</Typography>

      {/* Gradient cards (primary brand style) */}
      <Typography variant="overline" display="block" mb={1}>
        Gradient Variant
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="gradient"
            icon={<PaidIcon />}
            label="Total Rent Collected"
            value="₦4,200,000"
            change="+8%"
            changeLabel="vs last month"
            sparkData={sparkRent}
            sparkColor={COLOR_RENT}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="gradient"
            icon={<HomeIcon />}
            label="Occupied Units"
            value="12 / 15"
            change="+2"
            changeLabel="new this month"
            sparkData={sparkOccupancy}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="gradient"
            icon={<PeopleIcon />}
            label="Active Tenants"
            value="28"
            change="-1"
            changeLabel="since last month"
            positive={false}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="gradient"
            icon={<TrendingUpIcon />}
            label="Net Revenue"
            value="₦2,850,000"
            change="+12%"
            changeLabel="vs last year"
          />
        </Grid>
      </Grid>

      {/* Plain cards (white with gradient icon) */}
      <Typography variant="overline" display="block" mb={1}>
        Plain Variant
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="plain"
            icon={<PaidIcon />}
            label="Total Rent Collected"
            value="₦4,200,000"
            change="+8%"
            changeLabel="vs last month"
            sparkData={sparkRent}
            sparkColor={COLOR_RENT}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="plain"
            icon={<HomeIcon />}
            label="Occupied Units"
            value="12 / 15"
            change="+2"
            changeLabel="new this month"
            sparkData={sparkOccupancy}
            sparkColor={COLOR_INFO_SERIES}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="plain"
            icon={<PeopleIcon />}
            label="Active Tenants"
            value="28"
            change="-1"
            changeLabel="since last month"
            positive={false}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            variant="plain"
            icon={<TrendingUpIcon />}
            label="Net Revenue"
            value="₦2,850,000"
            change="+12%"
            changeLabel="vs last year"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
