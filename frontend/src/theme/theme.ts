import { createTheme, alpha } from '@mui/material/styles';

// ─── Brand Tokens ────────────────────────────────────────────────────────────
export const tokens = {
  // Primary brand gradient pair — matches Talents Apartments portal blue
  primaryDark: '#2946af',
  primary: '#435ebe',

  // Metric accent colors
  rent: '#cb0c9f',      // Rent / key financial metric
  info: '#17c1e8',      // Secondary metric / others
  blue: '#2152ff',      // Bright blue / text gradients
  green: '#2dce89',     // Success / migrate / download buttons

  // Surface
  bg: '#f8f9fa',
  card: '#ffffff',
  inputBg: '#f6f7f9',
  border: '#e7eaf1',

  // Text
  text: '#444444',
  heading: '#344767',
  muted: '#67748e',
  axisLabel: '#9ca2b7',

  // Gradients (use as inline style or sx backgroundImage)
  gradientPrimary: 'linear-gradient(310deg, #2946af 0%, #435ebe 100%)',
  gradientBlue: 'linear-gradient(310deg, #2266ff 0%, #4b7cef 100%)',
  gradientRent: 'linear-gradient(310deg, #d40000 0%, #cb0c9f 100%)',
  gradientGreen: 'linear-gradient(310deg, #17ad37 0%, #2dce89 100%)',
} as const;

// ─── MUI v5 Theme ────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: tokens.primary,
      dark: tokens.primaryDark,
      light: '#6b84d4',
      contrastText: '#ffffff',
    },
    success: {
      main: tokens.green,
      contrastText: '#ffffff',
    },
    secondary: {
      main: tokens.muted,
      contrastText: '#ffffff',
    },
    info: {
      main: tokens.info,
      contrastText: '#ffffff',
    },
    error: {
      main: '#ea0606',
    },
    warning: {
      main: '#f53939',
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

    h1: { fontWeight: 700, color: tokens.heading },
    h2: { fontWeight: 700, color: tokens.heading },
    h3: { fontWeight: 700, color: tokens.heading },
    h4: { fontWeight: 700, color: tokens.heading },
    h5: { fontWeight: 700, color: tokens.heading, fontSize: '1.25rem' },
    h6: { fontWeight: 700, color: tokens.heading, fontSize: '1rem' },

    body1: { fontSize: '0.875rem', color: tokens.text },   // 14px
    body2: { fontSize: '0.75rem', color: tokens.muted },   // 12px

    caption: {
      fontSize: '0.625rem',   // 10px — .text-xxs
      color: tokens.muted,
    },

    button: {
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '-0.025rem',
    },

    overline: {
      fontSize: '0.625rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: tokens.muted,
    },
  },

  shape: {
    borderRadius: 12, // --base-border-radius
  },

  shadows: [
    'none',
    '0 2px 4px -1px rgba(0,0,0,0.07), 0 4px 7px -1px rgba(0,0,0,0.11)',
    '0 4px 7px -1px rgba(0,0,0,0.11), 0 6px 20px rgba(0,0,0,0.07)',
    '0 6px 20px rgba(0,0,0,0.07)',
    '0 8px 24px rgba(0,0,0,0.08)',
    '0 12px 32px rgba(0,0,0,0.10)',
    // MUI requires 25 shadow entries — fill the rest with a consistent value
    ...Array(19).fill('0 12px 32px rgba(0,0,0,0.10)'),
  ] as any,

  components: {
    // ── Card ──────────────────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,         // border-radius-xl
          boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)',
          border: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px',
          '&:last-child': { paddingBottom: '12px' },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: '12px 12px 0' },
      },
    },

    // ── Paper ─────────────────────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },

    // ── Button ────────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'uppercase',
          letterSpacing: '-0.025rem',
          fontWeight: 700,
          fontSize: '0.75rem',
          boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          },
        },
        containedPrimary: {
          background: tokens.gradientPrimary,
          '&:hover': {
            background: tokens.gradientPrimary,
            opacity: 0.9,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '50%',
        },
      },
    },

    // ── Input / TextField ─────────────────────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: tokens.inputBg,
          fontSize: '0.875rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: tokens.primary,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          fontWeight: 600,
          color: tokens.heading,
        },
      },
    },

    // ── Table ─────────────────────────────────────────────────────────────────
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontSize: '0.6875rem',   // 11px
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: tokens.muted,
            opacity: 0.7,
            padding: '8px',
            backgroundColor: 'transparent',
            borderBottom: `1px solid ${tokens.border}`,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-body': {
            fontSize: '0.75rem',   // 12px
            padding: '8px',
            borderBottom: `1px solid ${tokens.border}`,
          },
        },
      },
    },

    // ── Chip / Badge ──────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,          // pill shape
          fontSize: '0.625rem',
          fontWeight: 700,
          height: 'auto',
          padding: '0 5px',
        },
      },
    },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 20,
          padding: '4px 12px',
          minHeight: 'unset',
          '&.Mui-selected': {
            color: '#ffffff',
            background: tokens.gradientPrimary,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          display: 'none',  // active state handled by background on tab
        },
      },
    },

    // ── Tooltip ───────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.primaryDark,
          fontSize: '0.75rem',
          borderRadius: 8,
        },
      },
    },

    // ── AppBar / Navbar ───────────────────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11)',
          backgroundColor: alpha('#ffffff', 0.8),
          backdropFilter: 'blur(20px)',
          color: tokens.heading,
        },
      },
    },

    // ── Drawer (Sidebar) ──────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: 'none',
          margin: '12px',
          height: 'calc(100vh - 24px)',
          boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07)',
        },
      },
    },

    // ── List (sidebar nav items) ──────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4,
          '&.Mui-selected': {
            background: tokens.gradientPrimary,
            color: '#ffffff',
            '& .MuiListItemIcon-root': { color: '#ffffff' },
            '& .MuiListItemText-primary': { color: '#ffffff' },
            '&:hover': {
              background: tokens.gradientPrimary,
              opacity: 0.9,
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: tokens.primaryDark,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
