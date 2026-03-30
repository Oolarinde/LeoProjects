import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  Alert,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Chip,
} from "@mui/material";
import { SaveOutlined, DeleteOutline } from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { budgetApi } from "../services/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface GridRow {
  category: string;
  monthly: number[];
  total: number;
}

interface GridData {
  year: number;
  line_type: string;
  rows: GridRow[];
  grand_total: number;
  categories: string[];
}

function fmt(v: number) {
  if (v === 0) return "";
  return Number(v).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export default function Budget() {
  const { year } = useAppStore();
  const [lineType, setLineType] = useState<"EXPENSE" | "REVENUE">("EXPENSE");
  const [data, setData] = useState<GridData | null>(null);
  const [editCells, setEditCells] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    budgetApi
      .getGrid(year, lineType)
      .then((r) => {
        const d = r.data;
        const grid: GridData = {
          year: d.year,
          line_type: d.line_type,
          grand_total: Number(d.grand_total),
          categories: d.categories,
          rows: d.rows.map((row: GridRow) => ({
            category: row.category,
            monthly: row.monthly.map(Number),
            total: Number(row.total),
          })),
        };
        setData(grid);

        // Initialize edit cells from server data
        const cells: Record<string, string> = {};
        grid.rows.forEach((row) => {
          row.monthly.forEach((val, mi) => {
            if (val > 0) {
              cells[`${row.category}:${mi + 1}`] = String(val);
            }
          });
        });
        setEditCells(cells);
      })
      .catch(() => setError("Failed to load budget data"))
      .finally(() => setLoading(false));
  }, [year, lineType]);

  useEffect(fetchData, [fetchData]);

  const handleCellChange = (category: string, month: number, value: string) => {
    const key = `${category}:${month}`;
    setEditCells((prev) => ({ ...prev, [key]: value }));
  };

  const getCellValue = (category: string, month: number): string => {
    return editCells[`${category}:${month}`] ?? "";
  };

  const getRowTotal = (category: string): number => {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const v = parseFloat(editCells[`${category}:${m}`] ?? "0");
      if (!isNaN(v)) total += v;
    }
    return total;
  };

  const getGrandTotal = (): number => {
    if (!data) return 0;
    return data.categories.reduce((sum, cat) => sum + getRowTotal(cat), 0);
  };

  const getMonthTotal = (month: number): number => {
    if (!data) return 0;
    return data.categories.reduce((sum, cat) => {
      const v = parseFloat(editCells[`${cat}:${month}`] ?? "0");
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  };

  const saveAll = async () => {
    if (!data) return;
    setSaving(true);
    setError("");

    const cells: { category: string; month: number; amount: number }[] = [];
    for (const cat of data.categories) {
      for (let m = 1; m <= 12; m++) {
        const raw = editCells[`${cat}:${m}`];
        const val = parseFloat(raw ?? "0");
        if (!isNaN(val) && val > 0) {
          cells.push({ category: cat, month: m, amount: val });
        }
      }
    }

    try {
      await budgetApi.bulkSave({ year, line_type: lineType, cells });
      setToast(`Saved ${cells.length} budget entries`);
      fetchData();
    } catch {
      setError("Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    if (!confirm(`Clear all ${lineType} budget for FY ${year}?`)) return;
    setSaving(true);
    try {
      await budgetApi.clearAll(year, lineType);
      setToast("Budget cleared");
      setEditCells({});
      fetchData();
    } catch {
      setError("Failed to clear budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
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
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            color={tokens.navy}
            sx={{ fontFamily: "Mulish, sans-serif" }}
          >
            Budget Planning
          </Typography>
          <Typography variant="body2" color={tokens.muted} sx={{ mt: 0.25 }}>
            FY {year} · {lineType === "EXPENSE" ? "Expense" : "Revenue"} Budget
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            size="small"
            value={lineType}
            exclusive
            onChange={(_, v) => v && setLineType(v)}
          >
            <ToggleButton value="EXPENSE" sx={{ fontSize: 11, px: 2 }}>
              Expense
            </ToggleButton>
            <ToggleButton value="REVENUE" sx={{ fontSize: 11, px: 2 }}>
              Revenue
            </ToggleButton>
          </ToggleButtonGroup>

          <Chip
            label={`Grand Total: ₦${fmt(getGrandTotal()) || "0"}`}
            sx={{
              fontWeight: 700,
              fontSize: 12,
              bgcolor: tokens.navy,
              color: "#fff",
            }}
          />

          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutline sx={{ fontSize: 14 }} />}
            onClick={clearAll}
            disabled={saving}
            sx={{ height: 32, fontSize: 11, borderRadius: 2, textTransform: "none" }}
          >
            Clear
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<SaveOutlined sx={{ fontSize: 14 }} />}
            onClick={saveAll}
            disabled={saving}
            sx={{
              height: 32,
              fontSize: 11,
              borderRadius: 2,
              textTransform: "none",
              background: tokens.gradPrimary,
            }}
          >
            {saving ? "Saving…" : "Save All"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.navy }}>
                  <TableCell
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 180,
                      position: "sticky",
                      left: 0,
                      bgcolor: tokens.navy,
                      zIndex: 2,
                    }}
                  >
                    Category
                  </TableCell>
                  {MONTHS.map((m) => (
                    <TableCell
                      key={m}
                      align="center"
                      sx={{ color: "#fff", fontWeight: 700, minWidth: 90, px: 0.5 }}
                    >
                      {m}
                    </TableCell>
                  ))}
                  <TableCell
                    align="right"
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 110,
                      position: "sticky",
                      right: 0,
                      bgcolor: tokens.navy,
                      zIndex: 2,
                    }}
                  >
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={14}>
                          <Skeleton />
                        </TableCell>
                      </TableRow>
                    ))
                  : data?.categories.map((cat, ri) => (
                      <TableRow
                        key={cat}
                        hover
                        sx={{
                          "&:nth-of-type(even)": { bgcolor: tokens.bg },
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: 12,
                            position: "sticky",
                            left: 0,
                            bgcolor: ri % 2 === 1 ? tokens.bg : "#fff",
                            zIndex: 1,
                          }}
                        >
                          {cat}
                        </TableCell>
                        {MONTHS.map((_, mi) => (
                          <TableCell key={mi} align="center" sx={{ p: 0.25 }}>
                            <TextField
                              size="small"
                              variant="standard"
                              type="number"
                              value={getCellValue(cat, mi + 1)}
                              onChange={(e) =>
                                handleCellChange(cat, mi + 1, e.target.value)
                              }
                              placeholder="0"
                              InputProps={{
                                disableUnderline: true,
                                sx: {
                                  fontSize: 12,
                                  textAlign: "right",
                                  "& input": {
                                    textAlign: "right",
                                    py: 0.5,
                                    px: 0.5,
                                  },
                                },
                              }}
                              sx={{
                                width: 80,
                                "& .MuiInput-root:hover": {
                                  bgcolor: "rgba(23,193,232,0.06)",
                                  borderRadius: 1,
                                },
                                "& .MuiInput-root.Mui-focused": {
                                  bgcolor: "rgba(23,193,232,0.10)",
                                  borderRadius: 1,
                                },
                              }}
                            />
                          </TableCell>
                        ))}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: tokens.navy,
                            position: "sticky",
                            right: 0,
                            bgcolor: ri % 2 === 1 ? tokens.bg : "#fff",
                            zIndex: 1,
                          }}
                        >
                          {fmt(getRowTotal(cat)) || "—"}
                        </TableCell>
                      </TableRow>
                    ))}

                {/* Month totals row */}
                {!loading && data && (
                  <TableRow sx={{ bgcolor: "rgba(27,42,74,0.06)" }}>
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        fontSize: 12,
                        position: "sticky",
                        left: 0,
                        bgcolor: "rgba(27,42,74,0.06)",
                        zIndex: 1,
                      }}
                    >
                      TOTAL
                    </TableCell>
                    {MONTHS.map((_, mi) => (
                      <TableCell
                        key={mi}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: tokens.navy,
                        }}
                      >
                        {fmt(getMonthTotal(mi + 1)) || "—"}
                      </TableCell>
                    ))}
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 900,
                        fontSize: 14,
                        color: tokens.navy,
                        position: "sticky",
                        right: 0,
                        bgcolor: "rgba(27,42,74,0.06)",
                        zIndex: 1,
                      }}
                    >
                      ₦{fmt(getGrandTotal()) || "0"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        message={toast}
      />
    </Box>
  );
}
