import { Box, Typography, Select, MenuItem, Button, Chip } from "@mui/material";
import { PictureAsPdf, FileDownload } from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";

interface Location {
  id: string;
  name: string;
}

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  locationOptions?: Location[];
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  balanceBadge?: { balanced: boolean; amount?: number };
}

export default function ReportHeader({
  title,
  subtitle,
  locationOptions = [],
  onExportPdf,
  onExportCsv,
  balanceBadge,
}: ReportHeaderProps) {
  const { year, setYear, location, setLocation } = useAppStore();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
      }}
    >
      {/* Title */}
      <Box>
        <Typography
          variant="h5"
          fontWeight={700}
          color={tokens.navy}
          sx={{ fontFamily: "Mulish, sans-serif" }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color={tokens.muted} sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Controls */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {/* Balance badge */}
        {balanceBadge !== undefined && (
          <Chip
            size="small"
            label={
              balanceBadge.balanced
                ? "✓ Balanced"
                : `⚠ Imbalance: ₦${Math.abs(balanceBadge.amount ?? 0).toLocaleString()}`
            }
            sx={{
              fontWeight: 700,
              fontSize: 11,
              bgcolor: balanceBadge.balanced
                ? tokens.badgePaid.bg
                : tokens.badgeOverdue.bg,
              color: balanceBadge.balanced
                ? tokens.badgePaid.color
                : tokens.badgeOverdue.color,
            }}
          />
        )}

        {/* Year selector */}
        <Select
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ fontSize: 12, fontWeight: 600, height: 32, minWidth: 80, borderRadius: 2 }}
        >
          {[2022, 2023, 2024, 2025, 2026].map((y) => (
            <MenuItem key={y} value={y}>
              FY {y}
            </MenuItem>
          ))}
        </Select>

        {/* Location selector */}
        {locationOptions.length > 0 && (
          <Select
            size="small"
            value={location?.id ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) setLocation(null);
              else setLocation(locationOptions.find((l) => l.id === val) ?? null);
            }}
            displayEmpty
            sx={{ fontSize: 12, fontWeight: 600, height: 32, minWidth: 130, borderRadius: 2 }}
          >
            <MenuItem value="">All Locations</MenuItem>
            {locationOptions.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </Select>
        )}

        {/* Export buttons */}
        {onExportCsv && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownload sx={{ fontSize: 14 }} />}
            onClick={onExportCsv}
            sx={{ height: 32, fontSize: 11, borderRadius: 2, textTransform: "none" }}
          >
            CSV
          </Button>
        )}
        {onExportPdf && (
          <Button
            size="small"
            variant="contained"
            startIcon={<PictureAsPdf sx={{ fontSize: 14 }} />}
            onClick={onExportPdf}
            sx={{
              height: 32,
              fontSize: 11,
              borderRadius: 2,
              textTransform: "none",
              background: tokens.gradDark,
            }}
          >
            PDF
          </Button>
        )}
      </Box>
    </Box>
  );
}
