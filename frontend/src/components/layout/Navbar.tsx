/**
 * Navbar — sticky top bar with breadcrumb, year/location filter, and avatar.
 * Matches the portal: frosted glass background, rounded, elevated.
 */

// useState removed — no local state needed
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Tooltip,
  Breadcrumbs,
  Link,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsIcon from '@mui/icons-material/Settings';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useLocation } from 'react-router-dom';
import { tokens } from '../../theme';
import { SIDEBAR_WIDTH } from './Sidebar';

// ─── Route → breadcrumb label map ─────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  dashboard:        'Dashboard',
  revenue:          'Revenue',
  expenses:         'Expenses',
  payroll:          'Payroll',
  budget:           'Budget',
  analysis:         'Analysis',
  ledger:           'General Ledger',
  reports:          'Reports',
  pnl:              'Profit & Loss',
  cashflow:         'Cash Flow',
  'balance-sheet':  'Balance Sheet',
  'trial-balance':  'Trial Balance',
  settings:         'Settings',
  accounts:         'Chart of Accounts',
  employees:        'Employees',
  locations:        'Locations & Units',
  reference:        'Reference Data',
};

const YEARS = [2024, 2025, 2026];
const LOCATIONS = ['All Locations', 'Agbowo', 'UI'];

interface NavbarProps {
  onMenuClick: () => void;
  year: number;
  location: string;
  onYearChange: (y: number) => void;
  onLocationChange: (l: string) => void;
}

export default function Navbar({
  onMenuClick,
  year,
  location: loc,
  onYearChange,
  onLocationChange,
}: NavbarProps) {
  const { pathname } = useLocation();

  // Build breadcrumb segments from path
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 16,
        left: { md: SIDEBAR_WIDTH + 12 },
        width: { md: `calc(100% - ${SIDEBAR_WIDTH + 36}px)` },
        mx: { xs: 2, md: 0 },
        mr: { md: 3 },
        borderRadius: '16px',
        background: alpha('#ffffff', 0.85),
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 7px -1px rgba(0,0,0,0.08)',
        color: tokens.heading,
        zIndex: theme => theme.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
        {/* Mobile menu button */}
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 1, display: { md: 'none' }, color: tokens.heading }}
        >
          <MenuIcon />
        </IconButton>

        {/* Breadcrumbs */}
        <Box sx={{ flexGrow: 1 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
            sx={{ '& .MuiBreadcrumbs-separator': { color: tokens.axisLabel } }}
          >
            <Link
              href="/"
              underline="hover"
              sx={{ fontSize: '0.75rem', color: tokens.muted, fontWeight: 600 }}
            >
              Talents AIS
            </Link>
            {crumbs.map(crumb =>
              crumb.isLast ? (
                <Typography
                  key={crumb.href}
                  sx={{ fontSize: '0.75rem', color: tokens.heading, fontWeight: 700 }}
                >
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={crumb.href}
                  href={crumb.href}
                  underline="hover"
                  sx={{ fontSize: '0.75rem', color: tokens.muted, fontWeight: 600 }}
                >
                  {crumb.label}
                </Link>
              )
            )}
          </Breadcrumbs>

          {/* Page title (last segment, larger) */}
          {crumbs.length > 0 && (
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: tokens.heading,
                lineHeight: 1.2,
                mt: 0.25,
              }}
            >
              {crumbs[crumbs.length - 1]?.label}
            </Typography>
          )}
        </Box>

        {/* Global filters */}
        <Stack direction="row" spacing={1} alignItems="center" mr={1}>
          {/* Year selector */}
          <FormControl size="small" variant="outlined">
            <Select
              value={year}
              onChange={e => onYearChange(Number(e.target.value))}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '20px',
                height: 32,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border },
                '& .MuiSelect-select': { py: 0, px: 1.5, lineHeight: '32px' },
              }}
            >
              {YEARS.map(y => (
                <MenuItem key={y} value={y} sx={{ fontSize: '0.75rem' }}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Location selector */}
          <FormControl size="small" variant="outlined">
            <Select
              value={loc}
              onChange={e => onLocationChange(e.target.value)}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '20px',
                height: 32,
                minWidth: 120,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border },
                '& .MuiSelect-select': { py: 0, px: 1.5, lineHeight: '32px' },
              }}
            >
              {LOCATIONS.map(l => (
                <MenuItem key={l} value={l} sx={{ fontSize: '0.75rem' }}>
                  {l}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Action icons */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ color: tokens.muted }}>
              <NotificationsNoneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" sx={{ color: tokens.muted }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Avatar
            sx={{
              width: 32, height: 32,
              ml: 0.5,
              background: tokens.gradientPrimary,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            TA
          </Avatar>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
