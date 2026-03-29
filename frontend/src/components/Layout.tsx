import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Avatar,
  Divider,
  IconButton,
  Badge,
  Typography,
  Drawer,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Person,
  ReceiptLong,
  AttachMoney,
  CreditCard,
  People,
  AccountBalance,
  LibraryBooks,
  Description,
  ShowChart,
  TableChart,
  BarChart,
  AccountTree,
  Settings,
  LocationOn,
  ExpandMore,
  ExpandLess,
  Notifications,
  Menu as MenuIcon,
  Logout,
} from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore, hasAccess, isAdmin } from "../utils/store";
import { GroupWork } from "@mui/icons-material";

const SIDEBAR_WIDTH = 230;

// ─── Sidebar ─────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
  module?: string; // permission module slug — omit for always-visible items
}

function SidebarContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((s) => s.user);
  const [openBookkeeping, setOpenBookkeeping] = useState(true);
  const [openReports, setOpenReports] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const filterByPermission = (items: NavItem[]) =>
    items.filter((item) => !item.module || hasAccess(user, item.module, "read"));

  const navItem = (label: string, path: string, icon: JSX.Element, indent = false) => (
    <ListItemButton
      key={path}
      selected={isActive(path)}
      onClick={() => navigate(path)}
      sx={{
        py: 0.85,
        pl: indent ? 4.5 : 2,
        pr: 2,
        minHeight: 38,
        borderLeft: isActive(path) ? `3px solid ${tokens.sidebarActive}` : "3px solid transparent",
        bgcolor: isActive(path) ? tokens.sidebarActiveBg : "transparent",
        "&.Mui-selected": {
          bgcolor: tokens.sidebarActiveBg,
          "&:hover": { bgcolor: tokens.sidebarActiveBg },
        },
        "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
      }}
    >
      {!indent && (
        <Box sx={{ minWidth: 30, display: "flex", alignItems: "center", color: isActive(path) ? tokens.sidebarActive : tokens.muted }}>
          {icon}
        </Box>
      )}
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: 14,
          fontWeight: isActive(path) ? 600 : 500,
          color: isActive(path) ? tokens.sidebarActive : tokens.heading,
        }}
      />
    </ListItemButton>
  );

  const section = (
    label: string,
    icon: JSX.Element,
    items: NavItem[],
    open: boolean,
    toggle: () => void,
  ) => {
    const visible = filterByPermission(items);
    if (visible.length === 0) return null;
    return (
      <Box key={label}>
        <ListItemButton onClick={toggle} sx={{ py: 0.85, px: 2, minHeight: 38 }}>
          <Box sx={{ minWidth: 30, display: "flex", alignItems: "center", color: tokens.muted }}>
            {icon}
          </Box>
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: tokens.heading }}
          />
          {open ? <ExpandLess sx={{ fontSize: 16, color: tokens.muted }} /> : <ExpandMore sx={{ fontSize: 16, color: tokens.muted }} />}
        </ListItemButton>
        <Collapse in={open}>
          <List disablePadding>
            {visible.map((item) => navItem(item.label, item.path, item.icon, true))}
          </List>
        </Collapse>
      </Box>
    );
  };

  const bookkeepingItems: NavItem[] = [
    { label: "Revenue", path: "/revenue", icon: <AttachMoney sx={{ fontSize: 18 }} />, module: "revenue" },
    { label: "Expenses", path: "/expenses", icon: <CreditCard sx={{ fontSize: 18 }} />, module: "expenses" },
    { label: "Payroll", path: "/payroll", icon: <People sx={{ fontSize: 18 }} />, module: "payroll" },
    { label: "Budget", path: "/budget", icon: <AccountBalance sx={{ fontSize: 18 }} />, module: "budget" },
    { label: "General Ledger", path: "/ledger", icon: <LibraryBooks sx={{ fontSize: 18 }} />, module: "ledger" },
  ];

  const reportItems: NavItem[] = [
    { label: "Profit & Loss", path: "/reports/pnl", icon: <Description sx={{ fontSize: 18 }} />, module: "pnl" },
    { label: "Cash Flow", path: "/reports/cashflow", icon: <ShowChart sx={{ fontSize: 18 }} />, module: "cashflow" },
    { label: "Balance Sheet", path: "/reports/balance-sheet", icon: <TableChart sx={{ fontSize: 18 }} />, module: "balance_sheet" },
    { label: "Trial Balance", path: "/reports/trial-balance", icon: <Description sx={{ fontSize: 18 }} />, module: "trial_balance" },
    { label: "Analysis", path: "/analysis", icon: <BarChart sx={{ fontSize: 18 }} />, module: "analysis" },
  ];

  const settingsItems: NavItem[] = [
    { label: "Chart of Accounts", path: "/settings/accounts", icon: <AccountTree sx={{ fontSize: 18 }} />, module: "accounts" },
    { label: "Employees", path: "/settings/employees", icon: <People sx={{ fontSize: 18 }} />, module: "employees" },
    { label: "Locations & Units", path: "/settings/locations", icon: <LocationOn sx={{ fontSize: 18 }} />, module: "locations" },
    { label: "Reference Data", path: "/settings/reference", icon: <Settings sx={{ fontSize: 18 }} />, module: "reference" },
    ...(isAdmin(user) ? [{ label: "User Management", path: "/settings/users", icon: <GroupWork sx={{ fontSize: 18 }} /> }] : []),
  ];

  return (
    <Box sx={{ overflow: "auto", height: "100%" }}>
      {/* Logo */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center" }}>
        <img src="/ta-logo.webp" alt="Talents Apartment" style={{ height: 32, objectFit: "contain" }} />
      </Box>

      <Divider sx={{ borderColor: tokens.border }} />

      <List disablePadding sx={{ mt: 0.5 }}>
        {navItem("Dashboard", "/dashboard", <DashboardIcon sx={{ fontSize: 20 }} />)}
        {navItem("My Profile", "/profile", <Person sx={{ fontSize: 20 }} />)}

        {section("Bookkeeping", <ReceiptLong sx={{ fontSize: 20 }} />, bookkeepingItems, openBookkeeping, () => setOpenBookkeeping(!openBookkeeping))}
        {section("Reports", <Description sx={{ fontSize: 20 }} />, reportItems, openReports, () => setOpenReports(!openReports))}
        {section("Settings", <Settings sx={{ fontSize: 20 }} />, settingsItems, openSettings, () => setOpenSettings(!openSettings))}
      </List>
    </Box>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { year, setYear, location: selectedLocation, setLocation, user, logout } = useAppStore();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: tokens.bg }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { sm: "none" }, "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH } }}
      >
        <SidebarContent />
      </Drawer>

      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, ml: { sm: `${SIDEBAR_WIDTH}px` } }}>
        {/* Utility bar */}
        <Box
          sx={{
            bgcolor: tokens.utilBarBg,
            color: "#fff",
            px: 3,
            height: 36,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <IconButton sx={{ display: { sm: "none" }, color: "#fff", mr: 1 }} onClick={() => setMobileOpen(true)}>
            <MenuIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, opacity: 0.7, flex: 1 }}>
            Talents Apartments — Accounting Information System
          </Typography>
        </Box>

        {/* Page header */}
        <Box
          sx={{
            bgcolor: "#fff",
            px: 3,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: tokens.heading }}>
            FY {year}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: tokens.muted }}>Viewing</Typography>

            {/* Year selector */}
            <Select
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                height: 32,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
                borderRadius: 2,
              }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>{y} (Full Year)</MenuItem>
              ))}
            </Select>

            {/* Location selector */}
            <Select
              size="small"
              value={selectedLocation?.id ?? "all"}
              onChange={(e) => {
                const val = e.target.value;
                setLocation(val === "all" ? null : { id: val, name: val });
              }}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                height: 32,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
                borderRadius: 2,
              }}
            >
              <MenuItem value="all" sx={{ fontSize: 13 }}>All Locations</MenuItem>
              <MenuItem value="Agbowo" sx={{ fontSize: 13 }}>Agbowo</MenuItem>
              <MenuItem value="UI" sx={{ fontSize: 13 }}>UI</MenuItem>
            </Select>

            <IconButton size="small" aria-label="Notifications">
              <Badge badgeContent={3} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 8, minWidth: 15, height: 15 } }}>
                <Notifications sx={{ fontSize: 18, color: tokens.muted }} />
              </Badge>
            </IconButton>

            <IconButton size="small" onClick={handleLogout} aria-label="Logout">
              <Logout sx={{ fontSize: 18, color: tokens.muted }} />
            </IconButton>

            <Avatar sx={{ width: 30, height: 30, bgcolor: tokens.primary, fontSize: 11, fontWeight: 700 }}>
              {user?.full_name?.charAt(0) ?? "?"}
            </Avatar>
          </Box>
        </Box>

        {/* Page content */}
        <Box component="main" sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
