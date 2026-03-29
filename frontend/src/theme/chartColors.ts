/**
 * Chart color tokens for Recharts
 * Sourced from the Talents Apartment live portal design
 * All charts should import from here — never hardcode colors in chart components
 */

import { tokens } from './theme';

// ─── Line / Area Chart Colors ────────────────────────────────────────────────

/** Use on Revenue / Rent dataset */
export const COLOR_RENT = tokens.rent;          // '#cb0c9f'

/** Use on Registration Form / primary dataset */
export const COLOR_PRIMARY_SERIES = tokens.primary;  // '#3A416F'

/** Use on "Others" / secondary dataset */
export const COLOR_INFO_SERIES = tokens.info;   // '#17c1e8'

/** Use on income mini-widget line */
export const COLOR_INCOME_LINE = '#252f40';

// ─── Fill / Area Gradients ───────────────────────────────────────────────────
// Pass these as <defs> LinearGradient in Recharts AreaChart

export const areaGradients = {
  rent: {
    id: 'gradRent',
    startColor: 'rgba(203, 12, 159, 0.2)',
    endColor: 'rgba(203, 12, 159, 0)',
  },
  primary: {
    id: 'gradPrimary',
    startColor: 'rgba(20, 23, 39, 0.2)',
    endColor: 'rgba(20, 23, 39, 0)',
  },
  income: {
    id: 'gradIncome',
    startColor: 'rgba(37, 47, 64, 0.05)',
    endColor: 'rgba(37, 47, 64, 0)',
  },
} as const;

// ─── Bar Chart ───────────────────────────────────────────────────────────────

export const COLOR_BAR = tokens.primary;        // '#3A416F'
export const BAR_BORDER_RADIUS = 4;
export const BAR_MAX_WIDTH = 35;

// ─── Doughnut / Pie Chart ────────────────────────────────────────────────────
// 26-color palette from the Room Types doughnut

export const DONUT_COLORS = [
  '#d2d8ed',
  '#3466fe',
  '#9a7b7d',
  '#173609',
  '#998f5b',
  '#3a6ce5',
  '#ea4d8b',
  '#071dae',
  '#ab5943',
  '#66d9b6',
  '#8eeda4',
  '#798c97',
  '#816945',
  '#24ba20',
  '#41ee47',
  '#a97da3',
  '#1fc7cd',
  '#8aa390',
  '#797710',
  '#9f239d',
  '#54dc6e',
  '#18e5ca',
  '#2b3114',
  '#b6484e',
  '#d91352',
  '#4937d4',
] as const;

export const DONUT_INNER_RADIUS = '60%';   // matches cutout: 60
export const DONUT_OUTER_RADIUS = '80%';
export const DONUT_STROKE_WIDTH = 2;

// ─── Axis / Grid Styling ─────────────────────────────────────────────────────

export const axisStyle = {
  tick: { fill: tokens.axisLabel, fontSize: 11 },     // '#9ca2b7'
  axisLine: { stroke: 'transparent' },
  tickLine: { stroke: 'transparent' },
} as const;

export const gridStyle = {
  stroke: tokens.border,                               // '#e7eaf1'
  strokeDasharray: '5 5',
} as const;

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: tokens.card,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    fontSize: 12,
    color: tokens.heading,
    boxShadow: '0 4px 7px -1px rgba(0,0,0,0.11)',
  },
  labelStyle: {
    color: tokens.muted,
    fontWeight: 600,
    marginBottom: 4,
  },
  cursor: { stroke: tokens.border, strokeWidth: 1 },
} as const;

// ─── Legend ──────────────────────────────────────────────────────────────────

export const legendStyle = {
  wrapperStyle: { fontSize: 12, color: tokens.muted },
} as const;

// ─── Named Series Map ─────────────────────────────────────────────────────────
// Convenience: map domain series names to their chart color + gradient

export const seriesConfig = {
  rent: {
    color: COLOR_RENT,
    gradient: areaGradients.rent.id,
    label: 'Rent',
  },
  registrationForm: {
    color: COLOR_PRIMARY_SERIES,
    gradient: areaGradients.primary.id,
    label: 'Registration Form',
  },
  others: {
    color: COLOR_INFO_SERIES,
    gradient: areaGradients.primary.id,
    label: 'Others',
  },
  income: {
    color: COLOR_INCOME_LINE,
    gradient: areaGradients.income.id,
    label: 'Income',
  },
} as const;
