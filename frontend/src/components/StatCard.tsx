/**
 * StatCard — replicates the Talents Apartment dashboard stat cards.
 *
 * Two variants:
 *   variant="gradient"  → dark navy/slate gradient background (primary brand card)
 *   variant="plain"     → white card with gradient icon badge
 *
 * Optionally renders a mini Recharts spark line at the bottom.
 *
 * Usage:
 *   <StatCard
 *     variant="gradient"
 *     icon={<HomeIcon />}
 *     label="Total Rent"
 *     value="₦4,200,000"
 *     change="+12%"
 *     changeLabel="since last month"
 *     sparkData={[{ v: 100 }, { v: 140 }, { v: 120 }, { v: 180 }]}
 *     sparkColor={COLOR_RENT}
 *   />
 */

import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import { tokens, tooltipStyle } from '../theme';

type SparkPoint = { v: number };

interface StatCardProps {
  /** Card background style */
  variant?: 'gradient' | 'plain';
  /** MUI icon element shown in the icon badge */
  icon: React.ReactNode;
  /** Small uppercase label above the value */
  label: string;
  /** Main metric value — format it before passing (e.g. "₦4,200,000") */
  value: string;
  /** Change percentage/amount string, e.g. "+12%" */
  change?: string;
  /** Label after the change value, e.g. "since last month" */
  changeLabel?: string;
  /** Whether the change is positive (green) or negative (red). Defaults to true. */
  positive?: boolean;
  /** Optional spark line data array — each item must have a `v` key */
  sparkData?: SparkPoint[];
  /** Stroke color for the spark line */
  sparkColor?: string;
  /** Card min-width override */
  minWidth?: number | string;
}

export default function StatCard({
  variant = 'plain',
  icon,
  label,
  value,
  change,
  changeLabel,
  positive = true,
  sparkData,
  sparkColor = tokens.primary,
  minWidth,
}: StatCardProps) {
  const isGradient = variant === 'gradient';

  return (
    <Card
      sx={{
        borderRadius: '16px',
        background: isGradient ? tokens.gradientPrimary : tokens.card,
        color: isGradient ? '#fff' : 'inherit',
        minWidth,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: '12px !important' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          {/* Text block */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: isGradient ? 'rgba(255,255,255,0.7)' : tokens.muted,
                fontSize: '0.65rem',
                letterSpacing: '0.06em',
                lineHeight: 1.4,
              }}
            >
              {label}
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: isGradient ? '#fff' : tokens.heading,
                mt: 0.25,
                lineHeight: 1.3,
              }}
            >
              {value}
            </Typography>

            {(change || changeLabel) && (
              <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                {change && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      color: isGradient
                        ? positive ? 'rgba(130,214,22,1)' : 'rgba(234,6,6,0.85)'
                        : positive ? '#82d616' : '#ea0606',
                    }}
                  >
                    {change}
                  </Typography>
                )}
                {changeLabel && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: isGradient ? 'rgba(255,255,255,0.6)' : tokens.muted,
                    }}
                  >
                    {changeLabel}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>

          {/* Icon badge */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: isGradient
                ? 'rgba(255,255,255,0.2)'
                : tokens.gradientPrimary,
              boxShadow: isGradient
                ? 'none'
                : '0 4px 7px -1px rgba(20,23,39,0.40)',
              color: '#fff',
              fontSize: 20,
              '& svg': { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        </Stack>

        {/* Optional spark line */}
        {sparkData && sparkData.length > 0 && (
          <Box mt={1.5} mx={-0.5} height={48}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Tooltip
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                  cursor={false}
                />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={isGradient ? 'rgba(255,255,255,0.7)' : sparkColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
