/**
 * Sidebar — fixed left drawer replicating the Talents Apartment portal nav.
 *
 * Active item gets the primary gradient background + white text/icon.
 * Inactive items show dark icon + muted text, hover brightens slightly.
 *
 * Nav sections mirror the 15 domain modules in CLAUDE.md.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import BookIcon from '@mui/icons-material/Book';
import WarningIcon from '@mui/icons-material/Warning';
import HotelIcon from '@mui/icons-material/Hotel';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import GavelIcon from '@mui/icons-material/Gavel';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

import { tokens } from '../../theme';

export const SIDEBAR_WIDTH = 250;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard',   icon: <DashboardIcon />,   path: '/dashboard' },
  { label: 'My Profile',  icon: <PersonIcon />,       path: '/profile' },
  {
    label: 'Bookings',
    icon: <BookIcon />,
    children: [
      { label: 'All Bookings',  path: '/bookings/all' },
      { label: 'Checkout',      path: '/bookings/checkout' },
      { label: 'Morning Turn',  path: '/bookings/morning-turn' },
    ],
  },
  {
    label: 'Residents',
    icon: <PeopleAltIcon />,
    children: [
      { label: 'All Residents', path: '/residents' },
      { label: 'Checkout',      path: '/residents/checkout' },
      { label: 'Clearance',     path: '/residents/clearance' },
      { label: 'Morning Turn',  path: '/residents/morning-turn' },
    ],
  },
  { label: 'Payments',    icon: <PaymentsIcon />,     path: '/payments' },
  { label: 'Complaints',  icon: <WarningIcon />,      path: '/complaints' },
  {
    label: 'Rooms',
    icon: <HotelIcon />,
    children: [
      { label: 'All Rooms',  path: '/rooms' },
    ],
  },
  { label: 'Inventory',   icon: <InventoryIcon />,    path: '/inventory' },
  { label: 'Guests',      icon: <PeopleIcon />,       path: '/guests' },
  { label: 'Leases',      icon: <GavelIcon />,        path: '/leases' },
  {
    label: 'Reports',
    icon: <AssessmentIcon />,
    children: [
      { label: 'Profit & Loss',    path: '/reports/pnl' },
      { label: 'Cash Flow',        path: '/reports/cashflow' },
      { label: 'Balance Sheet',    path: '/reports/balance-sheet' },
    ],
  },
  {
    label: 'Settings',
    icon: <SettingsIcon />,
    children: [
      { label: 'Chart of Accounts', path: '/settings/accounts' },
      { label: 'Employees',         path: '/settings/employees' },
      { label: 'Locations & Units', path: '/settings/locations' },
    ],
  },
];

// ─── Dot bullet for sub-items ─────────────────────────────────────────────────
function SubDot() {
  return (
    <Box
      component="span"
      sx={{
        width: 6, height: 6,
        borderRadius: '50%',
        background: 'currentColor',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

// ─── Single nav row ───────────────────────────────────────────────────────────
function NavRow({
  label,
  icon,
  path: _path,
  active,
  onClick,
  indent = false,
  expandIcon,
}: {
  label: string;
  icon?: React.ReactNode;
  path?: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
  expandIcon?: React.ReactNode;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      selected={active}
      sx={{
        mx: 1,
        pl: indent ? 4 : 1.5,
        pr: 1,
        py: 0.75,
        borderRadius: '8px',
        mb: 0.25,
        transition: 'background 0.2s',
        '&:not(.Mui-selected):hover': {
          background: 'rgba(58,65,111,0.06)',
        },
      }}
    >
      {/* Icon badge — only on top-level items */}
      {!indent && icon && (
        <ListItemIcon
          sx={{
            minWidth: 36,
            mr: 1,
            '& .icon-badge': {
              width: 32, height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: active ? tokens.gradientPrimary : '#fff',
              boxShadow: active
                ? '0 4px 7px -1px rgba(20,23,39,0.4)'
                : '0 2px 4px rgba(0,0,0,0.12)',
              color: active ? '#fff' : tokens.primaryDark,
              fontSize: 16,
              transition: 'all 0.2s',
              '& svg': { fontSize: 16 },
            },
          }}
        >
          <Box className="icon-badge">{icon}</Box>
        </ListItemIcon>
      )}

      {/* Sub-item dot */}
      {indent && (
        <ListItemIcon sx={{ minWidth: 20, mr: 1 }}>
          <SubDot />
        </ListItemIcon>
      )}

      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: indent ? '0.8rem' : '0.875rem',
          fontWeight: active ? 700 : 600,
          color: active ? '#fff' : tokens.heading,
          lineHeight: 1.4,
        }}
      />
      {expandIcon}
    </ListItemButton>
  );
}

// ─── Drawer contents ──────────────────────────────────────────────────────────
function SidebarContents() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Record<string, boolean>>({
    Reports: location.pathname.startsWith('/reports'),
    Settings: location.pathname.startsWith('/settings'),
  });

  const toggle = (label: string) =>
    setOpen(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo / brand */}
      <Box
        sx={{
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box
          component="img"
          src="/ta-logo.webp"
          alt="Talents Apartments"
          sx={{ height: 48, maxWidth: '100%', objectFit: 'contain' }}
        />
      </Box>

      <Divider sx={{ mx: 2, borderColor: tokens.border }} />

      {/* Nav list */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1, pt: 1, pb: 2 }}>
        <List disablePadding>
          {NAV.map(item => {
            const isActive = item.path
              ? location.pathname === item.path
              : false;
            const isExpanded = open[item.label] ?? false;
            const childActive =
              item.children?.some(c => location.pathname === c.path) ?? false;

            if (item.children) {
              return (
                <Box key={item.label}>
                  <NavRow
                    label={item.label}
                    icon={item.icon}
                    active={childActive}
                    onClick={() => toggle(item.label)}
                    expandIcon={
                      isExpanded
                        ? <ExpandLess sx={{ fontSize: 16, color: childActive ? '#fff' : tokens.muted }} />
                        : <ExpandMore sx={{ fontSize: 16, color: tokens.muted }} />
                    }
                  />
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {item.children.map(child => (
                        <NavRow
                          key={child.path}
                          label={child.label}
                          active={location.pathname === child.path}
                          onClick={() => navigate(child.path)}
                          indent
                        />
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            return (
              <NavRow
                key={item.label}
                label={item.label}
                icon={item.icon}
                path={item.path}
                active={isActive}
                onClick={() => item.path && navigate(item.path)}
              />
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Divider sx={{ mx: 2, borderColor: tokens.border }} />
      <Box sx={{ px: 2.5, py: 2, flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.65rem', color: tokens.muted }}>
          Agbowo · UI Locations
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: tokens.axisLabel }}>
          Ibadan, Nigeria · ₦ NGN
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: SIDEBAR_WIDTH,
      borderRadius: '16px',
      border: 'none',
      margin: '12px',
      height: 'calc(100vh - 24px)',
      boxShadow:
        '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)',
      boxSizing: 'border-box',
      overflowX: 'hidden',
    },
  };

  return (
    <Box
      component="nav"
      sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
      >
        <SidebarContents />
      </Drawer>

      {/* Desktop persistent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
      >
        <SidebarContents />
      </Drawer>
    </Box>
  );
}
