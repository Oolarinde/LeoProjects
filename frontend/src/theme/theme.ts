import { createTheme } from "@mui/material/styles";

// ─── Portal Brand Tokens (pixel-matched from Talents Apartment portal) ───────
export const tokens = {
  primary: "#435ebe",
  primaryDark: "#2946af",
  info: "#17c1e8",
  success: "#2dce89",
  danger: "#ea0606",
  pink: "#cb0c9f",

  heading: "#252f40",
  text: "#344767",
  muted: "#67748e",
  axisLabel: "#9ca2b7",

  bg: "#f8f9fa",
  card: "#ffffff",
  inputBg: "#f6f7f9",
  border: "#e9ecef",

  sidebarActive: "#435ebe",
  sidebarActiveBg: "rgba(67,94,190,0.10)",
  utilBarBg: "#1e3c8a",

  gradPrimary: "linear-gradient(310deg, #2946af 0%, #435ebe 100%)",
  gradPink: "linear-gradient(310deg, #d40000 0%, #cb0c9f 100%)",
  gradGreen: "linear-gradient(310deg, #17ad37 0%, #2dce89 100%)",
  gradBlue: "linear-gradient(310deg, #1171ef 0%, #17c1e8 100%)",
} as const;

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: tokens.primary,
      dark: tokens.primaryDark,
      light: "#6b84d4",
      contrastText: "#ffffff",
    },
    secondary: {
      main: tokens.muted,
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
      main: "#f53939",
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
    fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,

    h1: { fontWeight: 700, color: tokens.heading, fontSize: "1.375rem" },
    h2: { fontWeight: 700, color: tokens.heading, fontSize: "1.125rem" },
    h3: { fontWeight: 600, color: tokens.heading, fontSize: "0.9375rem" },
    h4: { fontWeight: 700, color: tokens.heading },
    h5: { fontWeight: 700, color: tokens.heading, fontSize: "1.25rem" },
    h6: { fontWeight: 700, color: tokens.heading, fontSize: "1rem" },

    body1: { fontSize: "0.875rem", color: tokens.text },
    body2: { fontSize: "0.75rem", color: tokens.muted },

    caption: { fontSize: "0.625rem", color: tokens.muted },

    button: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      textTransform: "none" as const,
    },

    overline: {
      fontSize: "0.625rem",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      color: tokens.muted,
    },
  },

  shape: { borderRadius: 12 },

  shadows: [
    "none",
    "0 2px 4px -1px rgba(0,0,0,0.07), 0 4px 7px -1px rgba(0,0,0,0.11)",
    "0 4px 7px -1px rgba(0,0,0,0.11), 0 6px 20px rgba(0,0,0,0.07)",
    "0 6px 20px rgba(0,0,0,0.07)",
    "0 8px 24px rgba(0,0,0,0.08)",
    "0 12px 32px rgba(0,0,0,0.10)",
    ...Array(19).fill("0 12px 32px rgba(0,0,0,0.10)"),
  ] as any,

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 6px -1px rgba(0,0,0,0.10), 0 1px 4px -1px rgba(0,0,0,0.06)",
          border: "none",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "16px",
          "&:last-child": { paddingBottom: "16px" },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none" as const,
          fontWeight: 600,
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
          fontSize: "0.875rem",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.border,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.primary,
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
            letterSpacing: "0.05em",
            color: tokens.muted,
            opacity: 0.7,
            padding: "10px 12px",
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
            padding: "12px",
            borderBottom: `1px solid ${tokens.border}`,
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
          "&.Mui-selected": {
            backgroundColor: tokens.sidebarActiveBg,
            color: tokens.sidebarActive,
            "& .MuiListItemIcon-root": { color: tokens.sidebarActive },
            "&:hover": { backgroundColor: tokens.sidebarActiveBg },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 30, color: tokens.muted },
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
          fontSize: "0.6875rem",
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
