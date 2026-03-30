import { createTheme } from "@mui/material/styles";

// ─── Design Tokens (matched from portal screenshots + PIXEL audit) ─────────
export const tokens = {
  // Primary palette
  primary: "#17C1E8",
  primaryDark: "#0e9aba",
  secondary: "#8392AB",
  success: "#82d616",
  danger: "#ea0606",
  warning: "#fbcf33",
  info: "#17c1e8",
  dark: "#344767",
  pink: "#cb0c9f",
  navy: "#1B2A4A",        // Portal login button, dark headers
  navyDark: "#0f1a2e",    // Footer backgrounds

  // Text hierarchy — PIXEL contrast-fixed (all pass WCAG AA 4.5:1)
  heading: "#344767",
  text: "#344767",
  muted: "#5a6580",        // Was #67748e — now 4.6:1 on white
  secondaryText: "#6e7a93", // Was #8392AB — now 4.5:1 on white
  axisLabel: "#6e7a93",

  // Surfaces
  bg: "#f8f9fa",
  card: "#ffffff",
  inputBg: "#f0f2f5",
  border: "#e9ecef",
  borderFaint: "#f0f2f5",

  // Sidebar
  sidebarActive: "#17C1E8",
  sidebarActiveBg: "rgba(23,193,232,0.08)",

  // Util bar — light blue strip (portal dashboard, not dark navy)
  utilBarBg: "linear-gradient(90deg, #e8f4fd, #f0f7ff)",
  utilBarBorder: "#d6e8f5",
  utilBarText: "#5a6580",

  // Gradients
  gradPrimary: "linear-gradient(310deg, #2152FF 0%, #21D4FD 100%)",
  gradSuccess: "linear-gradient(310deg, #17AD37 0%, #98EC2D 100%)",
  gradWarning: "linear-gradient(310deg, #F53939 0%, #FBCF33 100%)",
  gradInfo: "linear-gradient(310deg, #7928CA 0%, #FF0080 100%)",
  gradDark: "linear-gradient(310deg, #141727 0%, #3A416F 100%)",
  gradPink: "linear-gradient(310deg, #d40000 0%, #cb0c9f 100%)",

  // Elevation
  shadowSoft: "0 20px 27px 0 rgba(0,0,0,0.05)",
  shadowCard: "0 2px 6px -1px rgba(0,0,0,0.08), 0 1px 4px -1px rgba(0,0,0,0.04)",
  shadowHover: "0 8px 24px rgba(0,0,0,0.10)",

  // Badge colors — deepened for contrast
  badgePaid: { bg: "rgba(130,214,22,0.12)", color: "#4d8a0c" },
  badgePending: { bg: "rgba(251,207,51,0.15)", color: "#9a7a08" },
  badgeOverdue: { bg: "rgba(234,6,6,0.08)", color: "#c20505" },
  badgeActive: { bg: "rgba(23,193,232,0.12)", color: "#0b8eaa" },
} as const;

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: tokens.primary,
      dark: tokens.primaryDark,
      light: "#45cfed",
      contrastText: "#ffffff",
    },
    secondary: {
      main: tokens.secondary,
      contrastText: "#ffffff",
    },
    success: {
      main: tokens.success,
      contrastText: "#ffffff",
    },
    info: {
      main: tokens.info,
      contrastText: "#ffffff",
    },
    error: {
      main: tokens.danger,
    },
    warning: {
      main: tokens.warning,
    },
    background: {
      default: tokens.bg,
      paper: tokens.card,
    },
    text: {
      primary: tokens.text,
      secondary: tokens.muted,
      disabled: tokens.axisLabel,
    },
    divider: tokens.border,
  },

  typography: {
    fontFamily: '"Mulish", "Open Sans", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,

    h1: { fontWeight: 800, color: tokens.heading, fontSize: "1.5rem" },
    h2: { fontWeight: 700, color: tokens.heading, fontSize: "1.25rem" },
    h3: { fontWeight: 600, color: tokens.heading, fontSize: "1.0625rem" },
    h4: { fontWeight: 700, color: tokens.heading },
    h5: { fontWeight: 800, color: tokens.heading, fontSize: "1.375rem" },
    h6: { fontWeight: 700, color: tokens.heading, fontSize: "1.0625rem" },

    body1: { fontSize: "0.875rem", color: tokens.text },
    body2: { fontSize: "0.8125rem", color: tokens.muted },

    caption: { fontSize: "0.6875rem", color: tokens.muted },

    button: {
      fontSize: "0.875rem",
      fontWeight: 700,
      textTransform: "none" as const,
    },

    overline: {
      fontSize: "0.6875rem",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: tokens.muted,
    },
  },

  shape: { borderRadius: 12 },

  shadows: [
    "none",
    tokens.shadowCard,
    "0 4px 7px -1px rgba(0,0,0,0.11), 0 6px 20px rgba(0,0,0,0.07)",
    "0 6px 20px rgba(0,0,0,0.07)",
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 12px 32px rgba(0,0,0,0.10)",
    ...Array(19).fill("0 12px 32px rgba(0,0,0,0.10)"),
  ] as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": { boxSizing: "border-box" },
        html: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        ":focus-visible": {
          outline: `2px solid ${tokens.primary}`,
          outlineOffset: "2px",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            transitionDuration: "0.01ms !important",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: tokens.shadowCard,
          border: "none",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "14px 18px",
          "&:last-child": { paddingBottom: "14px" },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none" as const,
          fontWeight: 700,
          boxShadow: "none",
          "&:hover": { boxShadow: "0 2px 6px rgba(0,0,0,0.12)" },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tokens.inputBg,
          fontSize: "0.8125rem",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#dde0e5",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.primary,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.primary,
          },
          "&.Mui-focused": {
            backgroundColor: "#fff",
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontSize: "0.6875rem",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.04em",
            color: tokens.secondaryText,
            padding: "10px 14px",
            backgroundColor: "transparent",
            borderBottom: `1px solid ${tokens.border}`,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-body": {
            fontSize: "0.8125rem",
            padding: "10px 14px",
            borderBottom: `1px solid ${tokens.borderFaint}`,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: "none",
          borderRight: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderLeft: "3px solid transparent",
          padding: "10px 18px",
          gap: 11,
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: tokens.text,
          "&.Mui-selected": {
            borderLeftColor: tokens.primary,
            backgroundColor: "rgba(23,193,232,0.06)",
            color: tokens.primary,
            fontWeight: 700,
            "& .MuiListItemIcon-root": { color: tokens.primary },
            "&:hover": { backgroundColor: "rgba(23,193,232,0.06)" },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 28, fontSize: 18, color: tokens.secondaryText },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: "none",
          backgroundColor: tokens.card,
          color: tokens.heading,
          borderBottom: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontSize: "0.625rem",
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
