import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  IconButton,
  Collapse,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment,
  Menu,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Cancel,
  Search as SearchIcon,
  Download as DownloadIcon,
  PlayArrow,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Assessment as ReportsIcon,
  Dashboard as DashboardIcon,
  Payments as PaymentsIcon,
  People as PeopleIcon,
  AccountBalance,
  EventNote,
  ArrowForward,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { payrollApi } from "../../services/api";
import { formatNairaDecimal } from "../../utils/format";
import PayrollSetup from "./PayrollSetup";

// ── Constants ────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const STEPS = ["Select Period", "Calculate", "Review & Approve"];

function fmt(v: number | string) {
  const n = Number(v);
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "rgba(251,207,51,0.15)", color: "#9a7a08" },
  CALCULATED: { bg: "rgba(23,193,232,0.12)", color: "#0b8eaa" },
  APPROVED: { bg: "rgba(130,214,22,0.12)", color: "#4d8a0c" },
  PAID: { bg: "rgba(130,214,22,0.2)", color: "#2d6b04" },
  CANCELLED: { bg: "rgba(234,6,6,0.08)", color: "#c20505" },
};

const ALL_STATUSES = ["All", "DRAFT", "CALCULATED", "APPROVED", "PAID", "CANCELLED"];

// ── Interfaces ───────────────────────────────────────────────────
interface RunSummary {
  id: string;
  year: number;
  month: number;
  status: string;
  employee_count: number;
  total_gross: number;
  total_net: number;
  total_paye: number;
  total_pension_ee: number;
  total_pension_er: number;
  total_deductions: number;
  run_date: string | null;
  created_at: string;
}

interface ItemLine {
  id: string;
  line_type: string;
  type_code: string;
  name: string;
  amount: number;
}

interface PayrollItem {
  id: string;
  employee_id: string;
  company_id?: string;
  company_name?: string;
  employee_name: string;
  employee_ref: string;
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  cra: number;
  taxable_income_annual: number;
  paye_tax: number;
  pension_employee: number;
  pension_employer: number;
  nhf: number;
  nsitf: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  lines: ItemLine[];
}

interface RunDetail extends RunSummary {
  items: PayrollItem[];
}

// ── Expandable Row (reused from PayrollProcessing) ──────────────
function ExpandableRow({ item, showCompany }: { item: PayrollItem; showCompany?: boolean }) {
  const [open, setOpen] = useState(false);
  const allowances = item.lines.filter((l) => l.line_type === "ALLOWANCE");
  const deductions = item.lines.filter((l) => l.line_type === "DEDUCTION");

  return (
    <>
      <TableRow hover sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}>
        <TableCell sx={{ py: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{item.employee_ref}</TableCell>
        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{item.employee_name}</TableCell>
        {showCompany && <TableCell sx={{ fontSize: 11, color: tokens.muted }}>{item.company_name || "—"}</TableCell>}
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.basic_salary)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.total_allowances)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(item.gross_pay)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.paye_tax)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.pension_employee)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.total_deductions)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(item.net_pay)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={showCompany ? 11 : 10} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open}>
            <Box sx={{ py: 1, px: 2, display: "flex", gap: 4 }}>
              {allowances.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, mb: 0.5 }}>ALLOWANCES</Typography>
                  {allowances.map((l) => (
                    <Box key={l.id} sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                      <Typography sx={{ fontSize: 11 }}>{l.name}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(l.amount)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, mb: 0.5 }}>DEDUCTIONS</Typography>
                {deductions.map((l) => (
                  <Box key={l.id} sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                    <Typography sx={{ fontSize: 11 }}>{l.name}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.danger }}>{fmt(l.amount)}</Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, mb: 0.5 }}>TAX DETAILS</Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                  <Typography sx={{ fontSize: 11 }}>CRA (monthly)</Typography>
                  <Typography sx={{ fontSize: 11 }}>{fmt(item.cra)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                  <Typography sx={{ fontSize: 11 }}>Taxable Income (annual)</Typography>
                  <Typography sx={{ fontSize: 11 }}>{fmt(item.taxable_income_annual)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                  <Typography sx={{ fontSize: 11 }}>Pension (Employer)</Typography>
                  <Typography sx={{ fontSize: 11 }}>{fmt(item.pension_employer)}</Typography>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function buildSubsidiarySummary(items: PayrollItem[]) {
  const byCompany: Record<string, { name: string; gross: number; deductions: number; net: number; count: number }> = {};
  for (const item of items) {
    const key = item.company_id || "unknown";
    const name = item.company_name || "Unknown";
    if (!byCompany[key]) byCompany[key] = { name, gross: 0, deductions: 0, net: 0, count: 0 };
    byCompany[key].gross += Number(item.gross_pay);
    byCompany[key].deductions += Number(item.total_deductions);
    byCompany[key].net += Number(item.net_pay);
    byCompany[key].count += 1;
  }
  return Object.values(byCompany).sort((a, b) => b.gross - a.gross);
}

function coerceRun(r: RunSummary): RunSummary {
  return {
    ...r,
    total_gross: Number(r.total_gross),
    total_net: Number(r.total_net),
    total_paye: Number(r.total_paye),
    total_pension_ee: Number(r.total_pension_ee),
    total_pension_er: Number(r.total_pension_er),
    total_deductions: Number(r.total_deductions),
  };
}

function coerceItems(items: PayrollItem[]): PayrollItem[] {
  return items.map((item) => ({
    ...item,
    basic_salary: Number(item.basic_salary),
    total_allowances: Number(item.total_allowances),
    gross_pay: Number(item.gross_pay),
    cra: Number(item.cra),
    taxable_income_annual: Number(item.taxable_income_annual),
    paye_tax: Number(item.paye_tax),
    pension_employee: Number(item.pension_employee),
    pension_employer: Number(item.pension_employer),
    nhf: Number(item.nhf),
    nsitf: Number(item.nsitf),
    other_deductions: Number(item.other_deductions),
    total_deductions: Number(item.total_deductions),
    net_pay: Number(item.net_pay),
    lines: item.lines.map((l) => ({ ...l, amount: Number(l.amount) })),
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: Run Payroll
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RunPayrollTab() {
  const { year, user } = useAppStore();
  const isGroupAdmin = user?.effective_role === "GROUP_ADMIN";
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(year);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [currentRun, setCurrentRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const fetchRuns = useCallback(async () => {
    try {
      const resp = await payrollApi.listRuns(selectedYear);
      setRuns(resp.data.map(coerceRun));
    } catch { /* ignore */ }
  }, [selectedYear]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const existingRun = runs.find((r) => r.year === selectedYear && r.month === selectedMonth);

  const loadRunDetail = async (runId: string) => {
    setLoading(true);
    setError("");
    try {
      const resp = await payrollApi.getRunDetail(runId);
      const d = resp.data;
      setCurrentRun({ ...coerceRun(d), items: coerceItems(d.items) });
    } catch {
      setError("Failed to load payroll run details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndCalculate = async () => {
    setCalculating(true);
    setError("");
    setSuccess("");
    try {
      let runId: string;
      if (existingRun) {
        runId = existingRun.id;
      } else {
        const createResp = await payrollApi.createRun({ year: selectedYear, month: selectedMonth });
        runId = createResp.data.id;
      }
      await payrollApi.calculateRun(runId);
      await fetchRuns();
      await loadRunDetail(runId);
      setActiveStep(2);
      setSuccess("Payroll calculated successfully");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to calculate payroll");
    } finally {
      setCalculating(false);
    }
  };

  const handleApprove = async () => {
    if (!currentRun) return;
    setLoading(true);
    setError("");
    try {
      await payrollApi.approveRun(currentRun.id);
      await fetchRuns();
      await loadRunDetail(currentRun.id);
      setSuccess("Payroll approved");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentRun || !confirm("Cancel this payroll run?")) return;
    setLoading(true);
    try {
      await payrollApi.cancelRun(currentRun.id);
      setCurrentRun(null);
      setActiveStep(0);
      await fetchRuns();
      setSuccess("Payroll run cancelled");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel StepIconProps={{ sx: { fontSize: 18 } }} sx={{ "& .MuiStepLabel-label": { fontSize: 11 } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 0: Select Period */}
      {activeStep === 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy, mb: 2 }}>
              Select Payroll Period
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
              <Select size="small" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} sx={{ minWidth: 90, fontSize: 11 }}>
                {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: 11 }}>FY {y}</MenuItem>)}
              </Select>
              <Select size="small" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} sx={{ minWidth: 130, fontSize: 11 }}>
                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1} sx={{ fontSize: 11 }}>{m}</MenuItem>)}
              </Select>
              {existingRun && (
                <Chip
                  label={`Existing: ${existingRun.status}`}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[existingRun.status]?.bg, color: STATUS_COLORS[existingRun.status]?.color }}
                />
              )}
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                if (existingRun && ["CALCULATED", "APPROVED", "PAID"].includes(existingRun.status)) {
                  loadRunDetail(existingRun.id);
                  setActiveStep(2);
                } else {
                  setActiveStep(1);
                }
              }}
              sx={{ background: tokens.gradPrimary, textTransform: "none", borderRadius: 2 }}
            >
              {existingRun ? "View / Recalculate" : "Continue"}
            </Button>

            {runs.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, mb: 1 }}>
                  Previous Runs — FY {selectedYear}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Month", "Status", "Employees", "Gross", "Net", "Run Date"].map((h) => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow
                        key={r.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedMonth(r.month);
                          if (["CALCULATED", "APPROVED", "PAID"].includes(r.status)) {
                            loadRunDetail(r.id);
                            setActiveStep(2);
                          }
                        }}
                      >
                        <TableCell sx={{ fontSize: 11 }}>{MONTHS[r.month - 1]}</TableCell>
                        <TableCell>
                          <Chip label={r.status} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[r.status]?.bg, color: STATUS_COLORS[r.status]?.color }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{r.employee_count}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{fmt(r.total_gross)}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(r.total_net)}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{r.run_date ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Calculate */}
      {activeStep === 1 && (
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.navy, mb: 1 }}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </Typography>
            <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 3 }}>
              This will calculate PAYE tax, pension, NHF, NSITF and all deductions for every active employee.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)} disabled={calculating} sx={{ textTransform: "none", borderRadius: 2 }}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateAndCalculate}
                disabled={calculating}
                startIcon={calculating ? <CircularProgress size={14} /> : undefined}
                sx={{ background: tokens.gradPrimary, textTransform: "none", borderRadius: 2, minWidth: 160 }}
              >
                {calculating ? "Calculating..." : "Run Payroll Calculation"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Approve */}
      {activeStep === 2 && (
        <>
          {loading ? (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 0.5 }} />)}
              </CardContent>
            </Card>
          ) : currentRun ? (
            <>
              {/* Summary cards */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 1.5, mb: 2 }}>
                {[
                  { label: "Employees", value: currentRun.employee_count, color: tokens.navy, isCurrency: false },
                  { label: "Total Gross", value: currentRun.total_gross, color: tokens.navy, isCurrency: true },
                  { label: "PAYE Tax", value: currentRun.total_paye, color: tokens.danger, isCurrency: true },
                  { label: "Pension (EE)", value: currentRun.total_pension_ee, color: tokens.muted, isCurrency: true },
                  { label: "Total Deductions", value: currentRun.total_deductions, color: tokens.danger, isCurrency: true },
                  { label: "Total Net Pay", value: currentRun.total_net, color: tokens.badgePaid.color, isCurrency: true },
                ].map(({ label, value, color, isCurrency }) => (
                  <Card key={label} sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
                    <CardContent sx={{ py: "10px !important" }}>
                      <Typography sx={{ fontSize: 11, color: tokens.muted, fontWeight: 600 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color, mt: 0.25 }}>
                        {isCurrency ? fmt(value) : value}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {/* Cost by Subsidiary */}
              {isGroupAdmin && currentRun.items.some((i) => i.company_name) && (() => {
                const summary = buildSubsidiarySummary(currentRun.items);
                return summary.length > 1 ? (
                  <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard, mb: 2 }}>
                    <CardContent sx={{ py: "10px !important" }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy, mb: 1 }}>Cost by Subsidiary</Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {["Subsidiary", "Employees", "Gross Pay", "Deductions", "Net Pay"].map((h) => (
                              <TableCell key={h} align={h === "Subsidiary" ? "left" : "right"} sx={{ fontSize: 11, fontWeight: 700, color: tokens.muted, py: 0.5 }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {summary.map((row) => (
                            <TableRow key={row.name}>
                              <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 11 }}>{row.count}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(row.gross)}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(row.deductions)}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>{fmt(row.net)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Status + Actions */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
                <Chip
                  label={currentRun.status}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[currentRun.status]?.bg, color: STATUS_COLORS[currentRun.status]?.color }}
                />
                <Typography sx={{ fontSize: 11, color: tokens.muted }}>
                  {MONTHS[currentRun.month - 1]} {currentRun.year} · {currentRun.employee_count} employees
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" size="small" onClick={() => { setActiveStep(0); setCurrentRun(null); }} sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}>
                  Back
                </Button>
                {currentRun.status === "CALCULATED" && (
                  <>
                    <Button variant="outlined" size="small" color="warning" onClick={handleCreateAndCalculate} disabled={calculating} sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}>
                      Recalculate
                    </Button>
                    <Button variant="contained" size="small" startIcon={<CheckCircle sx={{ fontSize: 13 }} />} onClick={handleApprove} sx={{ background: tokens.gradSuccess, textTransform: "none", borderRadius: 2, fontSize: 11 }}>
                      Approve
                    </Button>
                  </>
                )}
                {["DRAFT", "CALCULATED"].includes(currentRun.status) && (
                  <Button variant="outlined" size="small" color="error" startIcon={<Cancel sx={{ fontSize: 13 }} />} onClick={handleCancel} sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}>
                    Cancel
                  </Button>
                )}
              </Box>

              {/* Employee payroll items table */}
              <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: tokens.navy }}>
                          <TableCell sx={{ color: "#fff", width: 36 }} />
                          {[
                            "Ref", "Employee",
                            ...(isGroupAdmin ? ["Company"] : []),
                            "Basic", "Allowances", "Gross", "PAYE", "Pension", "Deductions", "Net Pay",
                          ].map((h) => (
                            <TableCell key={h} align={["Ref", "Employee", "Company"].includes(h) ? "left" : "right"} sx={{ color: "#fff", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentRun.items.map((item) => (
                          <ExpandableRow key={item.id} item={item} showCompany={isGroupAdmin} />
                        ))}
                        <TableRow sx={{ bgcolor: "rgba(27,42,74,0.06)" }}>
                          <TableCell colSpan={isGroupAdmin ? 4 : 3} sx={{ fontWeight: 800, fontSize: 11 }}>TOTAL</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>{fmt(currentRun.items.reduce((s, i) => s + i.basic_salary, 0))}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>{fmt(currentRun.items.reduce((s, i) => s + i.total_allowances, 0))}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>{fmt(currentRun.total_gross)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>{fmt(currentRun.total_paye)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>{fmt(currentRun.total_pension_ee)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>{fmt(currentRun.total_deductions)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, fontSize: 11, color: tokens.navy }}>{fmt(currentRun.total_net)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert severity="info">Select a period and calculate to see results.</Alert>
          )}
        </>
      )}
    </Box>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: Payroll History
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PayrollHistoryTab() {
  const { user } = useAppStore();
  const isGroupAdmin = user?.effective_role === "GROUP_ADMIN";

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [historyYear, setHistoryYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, RunDetail>>({});
  const [loading, setLoading] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await payrollApi.history(historyYear, selectedMonth ?? undefined);
      setRuns(resp.data.map(coerceRun));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [historyYear, selectedMonth]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filteredRuns = useMemo(() => {
    let result = runs;
    if (statusFilter !== "All") {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result;
  }, [runs, statusFilter]);

  const loadDetail = async (runId: string) => {
    if (runDetails[runId]) return;
    try {
      const resp = await payrollApi.getRunDetail(runId);
      const d = resp.data;
      setRunDetails((prev) => ({ ...prev, [runId]: { ...coerceRun(d), items: coerceItems(d.items) } }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
    } else {
      setExpandedRunId(runId);
      loadDetail(runId);
    }
  };

  // For single-month view, load the detail for that month's run automatically
  const singleMonthRun = selectedMonth ? filteredRuns.find((r) => r.month === selectedMonth) : null;
  const singleMonthDetail = singleMonthRun ? runDetails[singleMonthRun.id] : null;

  useEffect(() => {
    if (singleMonthRun && !runDetails[singleMonthRun.id]) {
      loadDetail(singleMonthRun.id);
    }
  }, [singleMonthRun?.id]);

  const filteredItems = useMemo(() => {
    if (!singleMonthDetail) return [];
    if (!searchTerm) return singleMonthDetail.items;
    const term = searchTerm.toLowerCase();
    return singleMonthDetail.items.filter(
      (i) => i.employee_name.toLowerCase().includes(term) || i.employee_ref.toLowerCase().includes(term)
    );
  }, [singleMonthDetail, searchTerm]);

  const handleDownload = (format: string) => {
    setDownloadAnchor(null);
    // Client-side fallback: print for PDF, alert for Excel
    if (format === "pdf") {
      window.print();
    } else {
      // TODO: Backend export endpoint needed for proper Excel export
      alert("Excel export requires a backend endpoint. Use browser print for now.");
    }
  };

  return (
    <Box>
      {/* Filters bar */}
      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard, mb: 2 }}>
        <CardContent sx={{ py: "12px !important" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            {/* Year */}
            <Select size="small" value={historyYear} onChange={(e) => setHistoryYear(Number(e.target.value))} sx={{ minWidth: 90, fontSize: 11 }}>
              {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: 11 }}>FY {y}</MenuItem>)}
            </Select>

            {/* Status */}
            <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 110, fontSize: 11 }}>
              {ALL_STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 11 }}>{s}</MenuItem>)}
            </Select>

            {/* Search */}
            <TextField
              size="small"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: tokens.muted }} /></InputAdornment>,
              }}
              sx={{ minWidth: 180, "& input": { fontSize: 11 } }}
            />

            <Box sx={{ flex: 1 }} />

            {/* Download button */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
              sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}
            >
              Download
            </Button>
            <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
              <MenuItem onClick={() => handleDownload("xlsx")} sx={{ fontSize: 11 }}>Export as Excel</MenuItem>
              <MenuItem onClick={() => handleDownload("pdf")} sx={{ fontSize: 11 }}>Export as PDF</MenuItem>
            </Menu>
          </Box>

          {/* Month chips */}
          <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap" }}>
            <Chip
              label="All"
              size="small"
              onClick={() => setSelectedMonth(null)}
              sx={{
                fontSize: 11,
                fontWeight: 600,
                bgcolor: selectedMonth === null ? tokens.primary : "transparent",
                color: selectedMonth === null ? "#fff" : tokens.muted,
                border: selectedMonth === null ? "none" : `1px solid ${tokens.border}`,
                cursor: "pointer",
                "&:hover": { bgcolor: selectedMonth === null ? tokens.primaryDark : tokens.bg },
              }}
            />
            {MONTH_SHORT.map((m, i) => (
              <Chip
                key={i}
                label={m}
                size="small"
                onClick={() => setSelectedMonth(selectedMonth === i + 1 ? null : i + 1)}
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: selectedMonth === i + 1 ? tokens.primary : "transparent",
                  color: selectedMonth === i + 1 ? "#fff" : tokens.muted,
                  border: selectedMonth === i + 1 ? "none" : `1px solid ${tokens.border}`,
                  cursor: "pointer",
                  "&:hover": { bgcolor: selectedMonth === i + 1 ? tokens.primaryDark : tokens.bg },
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 0.5 }} />)}
          </CardContent>
        </Card>
      ) : selectedMonth && singleMonthRun ? (
        /* Single month detail view */
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.navy }}>
              {MONTHS[selectedMonth - 1]} {historyYear}
            </Typography>
            <Chip
              label={singleMonthRun.status}
              size="small"
              sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[singleMonthRun.status]?.bg, color: STATUS_COLORS[singleMonthRun.status]?.color }}
            />
            <Typography sx={{ fontSize: 11, color: tokens.muted }}>
              {singleMonthRun.employee_count} employees | Gross: {fmt(singleMonthRun.total_gross)} | Net: {fmt(singleMonthRun.total_net)}
            </Typography>
          </Box>

          {singleMonthDetail ? (
            <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: tokens.navy }}>
                        <TableCell sx={{ color: "#fff", width: 36 }} />
                        {[
                          "Ref", "Employee",
                          ...(isGroupAdmin ? ["Company"] : []),
                          "Gross", "PAYE", "Pension", "NHF", "Other", "Net Pay",
                        ].map((h) => (
                          <TableCell key={h} align={["Ref", "Employee", "Company"].includes(h) ? "left" : "right"} sx={{ color: "#fff", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <HistoryDetailRow key={item.id} item={item} showCompany={isGroupAdmin} />
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={isGroupAdmin ? 10 : 9} sx={{ textAlign: "center", py: 3, color: tokens.muted, fontSize: 11 }}>
                            {searchTerm ? "No employees match your search" : "No payroll data"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 0.5 }} />)}
              </CardContent>
            </Card>
          )}
        </>
      ) : selectedMonth && !singleMonthRun ? (
        <Alert severity="info" sx={{ fontSize: 11 }}>
          No payroll run found for {MONTHS[(selectedMonth || 1) - 1]} {historyYear}.
        </Alert>
      ) : (
        /* All months summary view */
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tokens.navy }}>
                    <TableCell sx={{ color: "#fff", width: 36 }} />
                    {["Month", "Employees", "Total Gross", "Total Deductions", "Total Net", "Status"].map((h) => (
                      <TableCell key={h} align={["Month", "Status"].includes(h) ? "left" : "right"} sx={{ color: "#fff", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRuns.map((r) => (
                    <HistorySummaryRow
                      key={r.id}
                      run={r}
                      expanded={expandedRunId === r.id}
                      detail={runDetails[r.id]}
                      onToggle={() => toggleExpand(r.id)}
                      isGroupAdmin={isGroupAdmin}
                      searchTerm={searchTerm}
                    />
                  ))}
                  {filteredRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: "center", py: 3, color: tokens.muted, fontSize: 11 }}>
                        No payroll runs found for FY {historyYear}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function HistorySummaryRow({
  run,
  expanded,
  detail,
  onToggle,
  isGroupAdmin,
  searchTerm,
}: {
  run: RunSummary;
  expanded: boolean;
  detail?: RunDetail;
  onToggle: () => void;
  isGroupAdmin: boolean;
  searchTerm: string;
}) {
  const filteredItems = useMemo(() => {
    if (!detail) return [];
    if (!searchTerm) return detail.items;
    const term = searchTerm.toLowerCase();
    return detail.items.filter(
      (i) => i.employee_name.toLowerCase().includes(term) || i.employee_ref.toLowerCase().includes(term)
    );
  }, [detail, searchTerm]);

  return (
    <>
      <TableRow hover sx={{ cursor: "pointer", "&:nth-of-type(even)": { bgcolor: tokens.bg } }} onClick={onToggle}>
        <TableCell sx={{ py: 0.5 }}>
          <IconButton size="small">
            {expanded ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{MONTHS[run.month - 1]}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{run.employee_count}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(run.total_gross)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(run.total_deductions)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(run.total_net)}</TableCell>
        <TableCell>
          <Chip label={run.status} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: STATUS_COLORS[run.status]?.bg, color: STATUS_COLORS[run.status]?.color }} />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: expanded ? undefined : "none" }}>
          <Collapse in={expanded}>
            {detail ? (
              <Box sx={{ py: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        "Ref", "Employee",
                        ...(isGroupAdmin ? ["Company"] : []),
                        "Gross", "PAYE", "Pension", "Deductions", "Net Pay",
                      ].map((h) => (
                        <TableCell key={h} align={["Ref", "Employee", "Company"].includes(h) ? "left" : "right"} sx={{ fontSize: 10, fontWeight: 700, color: tokens.muted, py: 0.5 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{item.employee_ref}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{item.employee_name}</TableCell>
                        {isGroupAdmin && <TableCell sx={{ fontSize: 11, color: tokens.muted }}>{item.company_name || "—"}</TableCell>}
                        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.gross_pay)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.paye_tax)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.pension_employee)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.total_deductions)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(item.net_pay)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isGroupAdmin ? 8 : 7} sx={{ textAlign: "center", py: 1, color: tokens.muted, fontSize: 10 }}>
                          {searchTerm ? "No employees match" : "Loading..."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ py: 1, px: 2 }}>
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={24} sx={{ mb: 0.25 }} />)}
              </Box>
            )}
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function HistoryDetailRow({ item, showCompany }: { item: PayrollItem; showCompany?: boolean }) {
  const [open, setOpen] = useState(false);
  const allowances = item.lines.filter((l) => l.line_type === "ALLOWANCE");
  const deductions = item.lines.filter((l) => l.line_type === "DEDUCTION");

  return (
    <>
      <TableRow hover sx={{ "&:nth-of-type(even)": { bgcolor: tokens.bg } }}>
        <TableCell sx={{ py: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp sx={{ fontSize: 14 }} /> : <KeyboardArrowDown sx={{ fontSize: 14 }} />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{item.employee_ref}</TableCell>
        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{item.employee_name}</TableCell>
        {showCompany && <TableCell sx={{ fontSize: 11, color: tokens.muted }}>{item.company_name || "—"}</TableCell>}
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(item.gross_pay)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.paye_tax)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.pension_employee)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.nhf)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.other_deductions)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(item.net_pay)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={showCompany ? 10 : 9} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open}>
            <Box sx={{ py: 1, px: 2, display: "flex", gap: 4 }}>
              {allowances.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: tokens.muted, mb: 0.5 }}>ALLOWANCES</Typography>
                  {allowances.map((l) => (
                    <Box key={l.id} sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                      <Typography sx={{ fontSize: 11 }}>{l.name}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(l.amount)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {deductions.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: tokens.muted, mb: 0.5 }}>DEDUCTIONS</Typography>
                  {deductions.map((l) => (
                    <Box key={l.id} sx={{ display: "flex", justifyContent: "space-between", gap: 3, mb: 0.25 }}>
                      <Typography sx={{ fontSize: 11 }}>{l.name}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.danger }}>{fmt(l.amount)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 0: Payroll Dashboard (Landing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PayrollDashboardTab({ onNavigateTab }: { onNavigateTab: (tab: number) => void }) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [dashYear, setDashYear] = useState(currentYear);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await payrollApi.listRuns(dashYear);
      setRuns(resp.data.map(coerceRun));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [dashYear]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // KPI computations
  const totalPayrollCost = useMemo(() => runs.reduce((s, r) => s + r.total_gross, 0), [runs]);
  const totalPaye = useMemo(() => runs.reduce((s, r) => s + r.total_paye, 0), [runs]);
  const headcount = useMemo(() => {
    const latestRun = runs.filter((r) => ["CALCULATED", "APPROVED", "PAID"].includes(r.status)).sort((a, b) => b.month - a.month)[0];
    return latestRun?.employee_count ?? 0;
  }, [runs]);
  const avgSalary = useMemo(() => {
    if (headcount === 0) return 0;
    const latestRun = runs.filter((r) => ["CALCULATED", "APPROVED", "PAID"].includes(r.status)).sort((a, b) => b.month - a.month)[0];
    return latestRun ? latestRun.total_gross / latestRun.employee_count : 0;
  }, [runs, headcount]);

  // Recent runs (last 3)
  const recentRuns = useMemo(() =>
    [...runs]
      .filter((r) => ["CALCULATED", "APPROVED", "PAID"].includes(r.status))
      .sort((a, b) => b.month - a.month)
      .slice(0, 3),
    [runs]
  );

  // Trend chart data
  const trendData = useMemo(() => {
    return MONTH_SHORT.map((m, i) => {
      const run = runs.find((r) => r.month === i + 1);
      return {
        month: m,
        gross: run ? run.total_gross : 0,
        deductions: run ? run.total_deductions : 0,
        net: run ? run.total_net : 0,
      };
    });
  }, [runs]);

  const kpis = [
    {
      label: "Total Payroll Cost",
      value: fmt(totalPayrollCost),
      accent: tokens.navy,
      gradient: tokens.gradDark,
      icon: <PaymentsIcon sx={{ fontSize: 16, color: "#fff" }} />,
    },
    {
      label: "Average Salary",
      value: fmt(avgSalary),
      accent: tokens.primary,
      gradient: tokens.gradPrimary,
      icon: <AccountBalance sx={{ fontSize: 16, color: "#fff" }} />,
    },
    {
      label: "Headcount",
      value: String(headcount),
      accent: "#17AD37",
      gradient: tokens.gradSuccess,
      icon: <PeopleIcon sx={{ fontSize: 16, color: "#fff" }} />,
    },
    {
      label: "PAYE Total",
      value: fmt(totalPaye),
      accent: "#7928CA",
      gradient: tokens.gradInfo,
      icon: <ReportsIcon sx={{ fontSize: 16, color: "#fff" }} />,
    },
  ];

  const quickLinks = [
    { label: "Run Payroll", icon: <PlayArrow sx={{ fontSize: 18 }} />, action: () => onNavigateTab(1) },
    { label: "Staff Directory", icon: <PeopleIcon sx={{ fontSize: 18 }} />, action: () => navigate("/staff/directory") },
    { label: "Leave Requests", icon: <EventNote sx={{ fontSize: 18 }} />, action: () => navigate("/staff/leave") },
    { label: "Payroll Setup", icon: <SettingsIcon sx={{ fontSize: 18 }} />, action: () => onNavigateTab(3) },
  ];

  return (
    <Box>
      {/* Year selector */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.navy }}>Payroll Dashboard</Typography>
        <Select size="small" value={dashYear} onChange={(e) => setDashYear(Number(e.target.value))} sx={{ minWidth: 90, fontSize: 11 }}>
          {yearOptions.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: 11 }}>FY {y}</MenuItem>)}
        </Select>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.75, mb: 2.5 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton width="60%" height={16} sx={{ mb: 1 }} />
                  <Skeleton width="80%" height={28} />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card
                key={kpi.label}
                sx={{
                  borderRadius: 3,
                  boxShadow: tokens.shadowCard,
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: kpi.accent,
                  },
                  "&:hover": { boxShadow: tokens.shadowHover },
                  transition: "box-shadow 0.15s",
                }}
              >
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 72 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: tokens.muted, fontWeight: 500, mb: 0.375, whiteSpace: "nowrap" }}>
                      {kpi.label}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: tokens.heading, lineHeight: 1.2 }}>
                      {kpi.value}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: tokens.muted, mt: 0.25 }}>
                      FY {dashYear}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 2,
                      background: kpi.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </CardContent>
              </Card>
            ))}
      </Box>

      {/* Monthly Trend Chart (AreaChart) */}
      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard, mb: 2.5 }}>
        <CardContent>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.navy, mb: 2 }}>
            Monthly Payroll Trend — FY {dashYear}
          </Typography>
          {loading ? (
            <Skeleton variant="rectangular" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tokens.navy} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={tokens.navy} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tokens.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={tokens.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tokens.danger} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={tokens.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: tokens.muted }} />
                <YAxis tick={{ fontSize: 10, fill: tokens.muted }} tickFormatter={(v) => formatNairaDecimal(v)} />
                <RechartsTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${tokens.border}` }}
                  formatter={(value: number) => [fmt(value), ""]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="gross" name="Gross Pay" stroke={tokens.navy} strokeWidth={2} fill="url(#gradGross)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="deductions" name="Deductions" stroke={tokens.danger} strokeWidth={2} fill="url(#gradDed)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="net" name="Net Pay" stroke={tokens.primary} strokeWidth={2} fill="url(#gradNet)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Links + Recent Runs */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        {/* Quick Links */}
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.navy, mb: 2 }}>Quick Links</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              {quickLinks.map((link) => (
                <Card
                  key={link.label}
                  onClick={link.action}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${tokens.border}`,
                    boxShadow: "none",
                    cursor: "pointer",
                    "&:hover": { borderColor: tokens.primary, bgcolor: "rgba(23,193,232,0.04)" },
                    transition: "all 0.15s",
                  }}
                >
                  <CardContent sx={{ py: "12px !important", px: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        bgcolor: tokens.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: tokens.primary,
                      }}
                    >
                      {link.icon}
                    </Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: tokens.navy, flex: 1 }}>{link.label}</Typography>
                    <ArrowForward sx={{ fontSize: 13, color: tokens.muted }} />
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Recent Payroll Runs */}
        <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
          <CardContent>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.navy, mb: 2 }}>Recent Payroll Runs</Typography>
            {loading ? (
              <Box>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)}</Box>
            ) : recentRuns.length === 0 ? (
              <Typography sx={{ fontSize: 11, color: tokens.muted, py: 2, textAlign: "center" }}>
                No payroll runs found for FY {dashYear}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Period", "Employees", "Gross", "Net", "Status"].map((h) => (
                      <TableCell key={h} align={["Period", "Status"].includes(h) ? "left" : "right"} sx={{ fontSize: 10, fontWeight: 700, color: tokens.muted, py: 0.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentRuns.map((r) => (
                    <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => onNavigateTab(1)}>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{MONTHS[r.month - 1]} {r.year}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11 }}>{r.employee_count}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(r.total_gross)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(r.total_net)}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          sx={{ fontSize: 10, fontWeight: 700, bgcolor: STATUS_COLORS[r.status]?.bg, color: STATUS_COLORS[r.status]?.color }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN: Unified Payroll Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Payroll() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color={tokens.navy} sx={{ fontFamily: "Mulish, sans-serif", mb: 0.5 }}>
        Payroll
      </Typography>
      <Typography sx={{ fontSize: 11, color: tokens.muted, mb: 2 }}>
        Run payroll, view history, configure settings, and generate reports
      </Typography>

      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: `1px solid ${tokens.border}`,
            "& .MuiTab-root": { fontSize: 12, fontWeight: 600, textTransform: "none", minHeight: 40 },
            "& .Mui-selected": { color: tokens.primary },
            "& .MuiTabs-indicator": { backgroundColor: tokens.primary },
          }}
        >
          <Tab icon={<DashboardIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Dashboard" />
          <Tab icon={<PlayArrow sx={{ fontSize: 16 }} />} iconPosition="start" label="Run Payroll" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="History" />
          <Tab icon={<SettingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Setup" />
        </Tabs>
        <CardContent>
          {tab === 0 && <PayrollDashboardTab onNavigateTab={setTab} />}
          {tab === 1 && <RunPayrollTab />}
          {tab === 2 && <PayrollHistoryTab />}
          {tab === 3 && <PayrollSetup embedded />}
        </CardContent>
      </Card>
    </Box>
  );
}
