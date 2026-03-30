import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
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
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { tokens } from "../../theme/theme";
import { useAppStore } from "../../utils/store";
import { payrollApi } from "../../services/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
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

function ExpandableRow({ item }: { item: PayrollItem }) {
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
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.basic_salary)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(item.total_allowances)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600 }}>{fmt(item.gross_pay)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.paye_tax)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.pension_employee)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, color: tokens.danger }}>{fmt(item.total_deductions)}</TableCell>
        <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: tokens.navy }}>{fmt(item.net_pay)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
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

export default function PayrollProcessing() {
  const { year } = useAppStore();
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
      setRuns(resp.data.map((r: RunSummary) => ({
        ...r,
        total_gross: Number(r.total_gross),
        total_net: Number(r.total_net),
        total_paye: Number(r.total_paye),
        total_pension_ee: Number(r.total_pension_ee),
        total_pension_er: Number(r.total_pension_er),
        total_deductions: Number(r.total_deductions),
      })));
    } catch {
      // ignore
    }
  }, [selectedYear]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const existingRun = runs.find((r) => r.year === selectedYear && r.month === selectedMonth);

  const loadRunDetail = async (runId: string) => {
    setLoading(true);
    setError("");
    try {
      const resp = await payrollApi.getRunDetail(runId);
      const d = resp.data;
      setCurrentRun({
        ...d,
        total_gross: Number(d.total_gross),
        total_net: Number(d.total_net),
        total_paye: Number(d.total_paye),
        total_pension_ee: Number(d.total_pension_ee),
        total_pension_er: Number(d.total_pension_er),
        total_deductions: Number(d.total_deductions),
        items: d.items.map((item: PayrollItem) => ({
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
          lines: item.lines.map((l: ItemLine) => ({ ...l, amount: Number(l.amount) })),
        })),
      });
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
      <Typography variant="h5" fontWeight={700} color={tokens.navy} sx={{ fontFamily: "Mulish, sans-serif", mb: 2 }}>
        Payroll Processing
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel
              StepIconProps={{ sx: { fontSize: 18 } }}
              sx={{ "& .MuiStepLabel-label": { fontSize: 11 } }}
            >
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
              <Select
                size="small"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                sx={{ minWidth: 90, fontSize: 11 }}
              >
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y} sx={{ fontSize: 11 }}>FY {y}</MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                sx={{ minWidth: 130, fontSize: 11 }}
              >
                {MONTHS.map((m, i) => (
                  <MenuItem key={i} value={i + 1} sx={{ fontSize: 11 }}>{m}</MenuItem>
                ))}
              </Select>
              {existingRun && (
                <Chip
                  label={`Existing: ${existingRun.status}`}
                  size="small"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: STATUS_COLORS[existingRun.status]?.bg,
                    color: STATUS_COLORS[existingRun.status]?.color,
                  }}
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

            {/* Previous runs table */}
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
                          <Chip
                            label={r.status}
                            size="small"
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: STATUS_COLORS[r.status]?.bg,
                              color: STATUS_COLORS[r.status]?.color,
                            }}
                          />
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
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                disabled={calculating}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateAndCalculate}
                disabled={calculating}
                startIcon={calculating ? <CircularProgress size={14} /> : undefined}
                sx={{ background: tokens.gradPrimary, textTransform: "none", borderRadius: 2, minWidth: 160 }}
              >
                {calculating ? "Calculating…" : "Run Payroll Calculation"}
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

              {/* Status + Actions */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Chip
                  label={currentRun.status}
                  size="small"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: STATUS_COLORS[currentRun.status]?.bg,
                    color: STATUS_COLORS[currentRun.status]?.color,
                  }}
                />
                <Typography sx={{ fontSize: 11, color: tokens.muted }}>
                  {MONTHS[currentRun.month - 1]} {currentRun.year} · {currentRun.employee_count} employees
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => { setActiveStep(0); setCurrentRun(null); }}
                  sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}
                >
                  Back
                </Button>
                {currentRun.status === "CALCULATED" && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      onClick={handleCreateAndCalculate}
                      disabled={calculating}
                      sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}
                    >
                      Recalculate
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircle sx={{ fontSize: 13 }} />}
                      onClick={handleApprove}
                      sx={{ background: tokens.gradSuccess, textTransform: "none", borderRadius: 2, fontSize: 11 }}
                    >
                      Approve
                    </Button>
                  </>
                )}
                {["DRAFT", "CALCULATED"].includes(currentRun.status) && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<Cancel sx={{ fontSize: 13 }} />}
                    onClick={handleCancel}
                    sx={{ textTransform: "none", borderRadius: 2, fontSize: 11 }}
                  >
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
                          {["Ref", "Employee", "Basic", "Allowances", "Gross", "PAYE", "Pension", "Deductions", "Net Pay"].map((h) => (
                            <TableCell
                              key={h}
                              align={["Ref", "Employee"].includes(h) ? "left" : "right"}
                              sx={{ color: "#fff", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentRun.items.map((item) => (
                          <ExpandableRow key={item.id} item={item} />
                        ))}
                        {/* Totals row */}
                        <TableRow sx={{ bgcolor: "rgba(27,42,74,0.06)" }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: 11 }}>TOTAL</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                            {fmt(currentRun.items.reduce((s, i) => s + i.basic_salary, 0))}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                            {fmt(currentRun.items.reduce((s, i) => s + i.total_allowances, 0))}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>
                            {fmt(currentRun.total_gross)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>
                            {fmt(currentRun.total_paye)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>
                            {fmt(currentRun.total_pension_ee)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: tokens.danger }}>
                            {fmt(currentRun.total_deductions)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, fontSize: 11, color: tokens.navy }}>
                            {fmt(currentRun.total_net)}
                          </TableCell>
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
