import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Tooltip,
  Menu as MuiMenu,
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
  ChevronLeft,
  GroupWork,
} from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore, hasAccess, isAdmin } from "../utils/store";
import { languageApi, configApi } from "../services/api";

const SIDEBAR_FULL = 210;
const SIDEBAR_MINI = 56;

const LANGUAGES = [
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "fr", label: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
  module?: string;
}

function SidebarContent({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((s) => s.user);
  const [openBookkeeping, setOpenBookkeeping] = useState(true);
  const [openReports, setOpenReports] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const filterByPermission = (items: NavItem[]) =>
    items.filter((item) => !item.module || hasAccess(user, item.module, "read"));

  const navItem = (label: string, path: string, icon: JSX.Element, indent = false) => {
    const active = isActive(path);
    const button = (
      <ListItemButton
        key={path}
        selected={active}
        onClick={() => navigate(path)}
        sx={{
          py: 0.75,
          pl: collapsed ? 0 : indent ? 5.75 : 2.25,
          pr: collapsed ? 0 : 2.25,
          minHeight: 36,
          justifyContent: collapsed ? "center" : "flex-start",
          borderLeft: collapsed ? "none" : active ? `3px solid ${tokens.sidebarActive}` : "3px solid transparent",
          bgcolor: active ? tokens.sidebarActiveBg : "transparent",
          "&.Mui-selected": {
            bgcolor: tokens.sidebarActiveBg,
            "&:hover": { bgcolor: tokens.sidebarActiveBg },
          },
          "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
        }}
      >
        {indent && !collapsed ? (
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: active ? tokens.sidebarActive : tokens.border,
              mr: 1.5,
              flexShrink: 0,
            }}
          />
        ) : (
          <Box sx={{
            minWidth: collapsed ? "auto" : 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: active ? tokens.sidebarActive : tokens.secondaryText,
          }}>
            {icon}
          </Box>
        )}
        {!collapsed && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: indent ? 13 : 14,
              fontWeight: active ? 700 : 500,
              color: active ? tokens.sidebarActive : tokens.heading,
            }}
          />
        )}
      </ListItemButton>
    );

    if (collapsed && !indent) {
      return (
        <Tooltip key={path} title={label} placement="right" arrow>
          {button}
        </Tooltip>
      );
    }
    // Hide indent items when collapsed
    if (collapsed && indent) return null;
    return button;
  };

  const section = (
    label: string,
    icon: JSX.Element,
    items: NavItem[],
    open: boolean,
    toggle: () => void,
  ) => {
    const visible = filterByPermission(items);
    if (visible.length === 0) return null;

    if (collapsed) {
      // In collapsed mode, show just the section icon — click navigates to first item
      return (
        <Tooltip key={label} title={label} placement="right" arrow>
          <ListItemButton
            onClick={() => navigate(visible[0].path)}
            sx={{
              py: 0.75,
              justifyContent: "center",
              bgcolor: visible.some((i) => isActive(i.path)) ? tokens.sidebarActiveBg : "transparent",
            }}
          >
            <Box sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: visible.some((i) => isActive(i.path)) ? tokens.sidebarActive : tokens.secondaryText,
            }}>
              {icon}
            </Box>
          </ListItemButton>
        </Tooltip>
      );
    }

    return (
      <Box key={label}>
        <ListItemButton
          onClick={toggle}
          aria-expanded={open}
          sx={{
            py: 0.75,
            px: 2.25,
            minHeight: 36,
            borderLeft: open ? `3px solid ${tokens.sidebarActive}` : "3px solid transparent",
            color: open ? tokens.sidebarActive : tokens.text,
          }}
        >
          <Box sx={{ minWidth: 28, display: "flex", alignItems: "center", color: open ? tokens.sidebarActive : tokens.secondaryText }}>
            {icon}
          </Box>
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: 14, fontWeight: 700, color: open ? tokens.sidebarActive : tokens.heading }}
          />
          {open ? <ExpandLess sx={{ fontSize: 16, color: tokens.sidebarActive }} /> : <ExpandMore sx={{ fontSize: 16, color: tokens.secondaryText }} />}
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
    { label: t("nav.revenue"), path: "/revenue", icon: <AttachMoney sx={{ fontSize: 18 }} />, module: "revenue" },
    { label: t("nav.expenses"), path: "/expenses", icon: <CreditCard sx={{ fontSize: 18 }} />, module: "expenses" },
    { label: t("nav.payroll"), path: "/payroll", icon: <People sx={{ fontSize: 18 }} />, module: "payroll" },
    { label: t("nav.payrollSetup"), path: "/payroll/setup", icon: <Settings sx={{ fontSize: 18 }} />, module: "payroll" },
    { label: t("nav.budget"), path: "/budget", icon: <AccountBalance sx={{ fontSize: 18 }} />, module: "budget" },
    { label: t("nav.generalLedger"), path: "/ledger", icon: <LibraryBooks sx={{ fontSize: 18 }} />, module: "ledger" },
  ];

  const reportItems: NavItem[] = [
    { label: t("nav.profitLoss"), path: "/reports/pnl", icon: <Description sx={{ fontSize: 18 }} />, module: "pnl" },
    { label: t("nav.cashFlow"), path: "/reports/cashflow", icon: <ShowChart sx={{ fontSize: 18 }} />, module: "cashflow" },
    { label: t("nav.balanceSheet"), path: "/reports/balance-sheet", icon: <TableChart sx={{ fontSize: 18 }} />, module: "balance_sheet" },
    { label: t("nav.trialBalance"), path: "/reports/trial-balance", icon: <Description sx={{ fontSize: 18 }} />, module: "trial_balance" },
    { label: t("nav.analysis"), path: "/analysis", icon: <BarChart sx={{ fontSize: 18 }} />, module: "analysis" },
  ];

  const settingsItems: NavItem[] = [
    { label: t("nav.chartOfAccounts"), path: "/settings/accounts", icon: <AccountTree sx={{ fontSize: 18 }} />, module: "accounts" },
    { label: t("nav.employees"), path: "/settings/employees", icon: <People sx={{ fontSize: 18 }} />, module: "employees" },
    { label: t("nav.locationsUnits"), path: "/settings/locations", icon: <LocationOn sx={{ fontSize: 18 }} />, module: "locations" },
    { label: t("nav.referenceData"), path: "/settings/reference", icon: <Settings sx={{ fontSize: 18 }} />, module: "reference" },
    ...(isAdmin(user) ? [
      { label: t("nav.userManagement"), path: "/settings/users", icon: <People sx={{ fontSize: 18 }} /> },
      { label: t("nav.roleManagement"), path: "/settings/roles", icon: <GroupWork sx={{ fontSize: 18 }} /> },
    ] : []),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL, transition: "width 0.2s ease" }}>
      {/* Logo + collapse toggle */}
      <Box sx={{ px: collapsed ? 0 : 2.25, py: 1.75, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {collapsed ? (
          <Box
            component="img"
            src="/logo.jpg"
            alt="TA"
            sx={{ width: 36, height: 36, objectFit: "cover", borderRadius: 2, cursor: "pointer" }}
            onClick={onToggle}
          />
        ) : (
          <>
            <Box
              component="img"
              src="/logo.jpg"
              alt="Talents Apartments — home away from home"
              sx={{ width: 160, height: 48, objectFit: "contain" }}
            />
            <IconButton onClick={onToggle} size="small" aria-label="Collapse sidebar" sx={{ ml: 0.5 }}>
              <ChevronLeft sx={{ fontSize: 18, color: tokens.secondaryText }} />
            </IconButton>
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: tokens.border, mx: collapsed ? 1 : 1.75 }} />

      <Box sx={{ overflow: "auto", flex: 1 }}>
        <List disablePadding sx={{ mt: 0.5 }}>
          {navItem(t("nav.dashboard"), "/dashboard", <DashboardIcon sx={{ fontSize: 18 }} />)}
          {navItem(t("nav.myProfile"), "/profile", <Person sx={{ fontSize: 18 }} />)}

          {!collapsed && <Divider sx={{ borderColor: tokens.border, mx: 1.75, my: 0.5 }} />}

          {section(t("nav.bookkeeping"), <ReceiptLong sx={{ fontSize: 18 }} />, bookkeepingItems, openBookkeeping, () => setOpenBookkeeping(!openBookkeeping))}
          {section(t("nav.reports"), <Description sx={{ fontSize: 18 }} />, reportItems, openReports, () => setOpenReports(!openReports))}
          {section(t("nav.settings"), <Settings sx={{ fontSize: 18 }} />, settingsItems, openSettings, () => setOpenSettings(!openSettings))}
        </List>
      </Box>

      {/* Sidebar footer */}
      <Box
        sx={{
          borderTop: `1px solid ${tokens.border}`,
          px: collapsed ? 0 : 1.75,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 1.25,
        }}
      >
        <Tooltip title={collapsed ? (user?.full_name ?? "User") : ""} placement="right" arrow>
          <Avatar
            src={user?.avatar_url || undefined}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              background: tokens.gradPrimary,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              cursor: collapsed ? "pointer" : "default",
            }}
            onClick={collapsed ? onToggle : undefined}
          >
            {user?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
          </Avatar>
        </Tooltip>
        {!collapsed && (
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: tokens.heading,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.full_name ?? "User"}
            </Typography>
            <Typography sx={{ fontSize: 10, color: tokens.muted }}>
              {user?.role?.replace(/_/g, " ") ?? "—"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function Layout() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const { year, setYear, user, logout, setUser, appVersion, companyName, setAppConfig } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    configApi.get().then((resp) => {
      setAppConfig(resp.data.version, resp.data.app_name);
    }).catch(() => {});
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const sidebarWidth = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("preferred_language", lang);
    try {
      await languageApi.update(lang);
      if (user) {
        setUser({ ...user, preferred_language: lang });
      }
    } catch {
      // Language saved locally even if API call fails
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: tokens.bg }}>
      {/* Mobile drawer — always full width */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { sm: "none" }, "& .MuiDrawer-paper": { width: SIDEBAR_FULL } }}
      >
        <SidebarContent collapsed={false} onToggle={() => setMobileOpen(false)} />
      </Drawer>

      {/* Desktop sidebar — collapsible */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: sidebarWidth,
            boxSizing: "border-box",
            transition: "width 0.2s ease",
            overflowX: "hidden",
          },
        }}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, ml: { sm: `${sidebarWidth}px` }, transition: "margin-left 0.2s ease" }}>
        {/* Header */}
        <Box
          component="header"
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Hamburger — shows on mobile OR when sidebar is collapsed on desktop */}
            <IconButton
              onClick={() => {
                // Mobile: open drawer. Desktop: expand sidebar.
                if (window.innerWidth < 600) {
                  setMobileOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              sx={{ p: 0.5 }}
            >
              <MenuIcon sx={{ fontSize: 20, color: tokens.muted }} />
            </IconButton>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: tokens.heading }}>
              FY {year}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ fontSize: 11, color: tokens.muted, display: { xs: "none", md: "block" } }}>{t("dashboard.viewing")}</Typography>
            <Select
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{
                fontSize: 11,
                fontWeight: 600,
                height: 30,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
                borderRadius: 2,
              }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y} sx={{ fontSize: 11 }}>{y} ({t("dashboard.fullYear")})</MenuItem>
              ))}
            </Select>

            {/* Language switcher — round flag button + dropdown */}
            <Tooltip title={t("language.select")}>
              <IconButton
                size="small"
                onClick={(e) => setLangAnchor(e.currentTarget)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1.5px solid ${tokens.border}`,
                  p: 0,
                  overflow: "hidden",
                  fontSize: 18,
                  "&:hover": { borderColor: tokens.primary },
                }}
              >
                {LANGUAGES.find((l) => l.code === i18n.language)?.flag || LANGUAGES[0].flag}
              </IconButton>
            </Tooltip>
            <MuiMenu
              anchorEl={langAnchor}
              open={Boolean(langAnchor)}
              onClose={() => setLangAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: { mt: 0.75, borderRadius: 2, minWidth: 150, boxShadow: tokens.shadowCard },
                },
              }}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem
                  key={lang.code}
                  selected={i18n.language === lang.code}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                    setLangAnchor(null);
                  }}
                  sx={{ fontSize: 13, gap: 1.25, py: 1 }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {lang.flag}
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: i18n.language === lang.code ? 700 : 500 }}>
                    {lang.label}
                  </Typography>
                </MenuItem>
              ))}
            </MuiMenu>

            <IconButton size="small" aria-label={t("dashboard.notifications")}>
              <Badge badgeContent={3} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 8, minWidth: 14, height: 14 } }}>
                <Notifications sx={{ fontSize: 18, color: tokens.muted }} />
              </Badge>
            </IconButton>

            <IconButton size="small" onClick={handleLogout} aria-label={t("auth.logout")}>
              <Logout sx={{ fontSize: 18, color: tokens.muted }} />
            </IconButton>

            <Avatar
              src={user?.avatar_url || undefined}
              sx={{ width: 30, height: 30, borderRadius: 2, background: tokens.gradPrimary, fontSize: 11, fontWeight: 700 }}
            >
              {user?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
            </Avatar>
          </Box>
        </Box>

        {/* Page content */}
        <Box component="main" sx={{ p: 3 }}>
          <Outlet />
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            px: 3,
            py: 1.75,
            textAlign: "center",
            borderTop: `1px solid ${tokens.border}`,
          }}
        >
          <Typography sx={{ fontSize: 12, color: tokens.muted }}>
            {companyName || t("footer.copyright")} &copy; {new Date().getFullYear()}, {t("footer.poweredBy")}{" "}
            {appVersion && <span style={{ float: "right" }}>{t("footer.version", { version: appVersion })}</span>}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
