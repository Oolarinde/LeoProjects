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
  TablePagination,
  Skeleton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { ledgerApi, referenceApi } from "../services/api";
import ReportHeader from "../components/reports/ReportHeader";
import type { LedgerEntry } from "../types/reports";

function fmt(v: number) {
  if (v === 0) return "—";
  return Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GeneralLedger() {
  const { year, location } = useAppStore();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // MUI is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [accountOptions, setAccountOptions] = useState<{ id: string; name: string; code: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    referenceApi.getLocations().then((r) => setLocationOptions(r.data ?? []));
    referenceApi.getAccounts().then((r) => setAccountOptions(r.data ?? []));
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    ledgerApi
      .entries({
        year,
        location_id: location?.id,
        entry_type: entryTypeFilter || undefined,
        account_id: accountFilter || undefined,
        page: page + 1,
        size: rowsPerPage,
      })
      .then((r) => {
        const d = r.data;
        setTotal(d.total);
        setEntries(
          d.entries.map((e: LedgerEntry) => ({
            ...e,
            debit: Number(e.debit),
            credit: Number(e.credit),
          }))
        );
      })
      .catch(() => setError("Failed to load ledger entries"))
      .finally(() => setLoading(false));
  }, [year, location, entryTypeFilter, accountFilter, page, rowsPerPage]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [year, location, entryTypeFilter, accountFilter, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Box>
      <ReportHeader
        title="General Ledger"
        subtitle={`FY ${year}${location ? ` · ${location.name}` : " · All Locations"} · ${total.toLocaleString()} entries`}
        locationOptions={locationOptions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Entry Type</InputLabel>
          <Select
            value={entryTypeFilter}
            onChange={(e) => setEntryTypeFilter(e.target.value)}
            label="Entry Type"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Income">Income</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Account</InputLabel>
          <Select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            label="Account"
          >
            <MenuItem value="">All Accounts</MenuItem>
            {accountOptions.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} — {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: tokens.shadowCard }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.bg }}>
                  {["Date", "Code", "Account", "Type", "Description", "Location", "Ref #", "Debit (₦)", "Credit (₦)"].map(
                    (h) => (
                      <TableCell
                        key={h}
                        align={["Debit (₦)", "Credit (₦)"].includes(h) ? "right" : "left"}
                        sx={{
                          color: tokens.secondaryText,
                          fontWeight: 700,
                          fontSize: "0.6875rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                          borderBottom: `2px solid ${tokens.border}`,
                        }}
                      >
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  : entries.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: tokens.muted }}>
                        No ledger entries found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )
                  : entries.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ "&:hover": { bgcolor: "rgba(23,193,232,0.03)" }, borderBottom: `1px solid ${tokens.borderFaint}` }}
                      >
                        <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{row.date}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: tokens.muted, fontFamily: "monospace" }}>
                          {row.code}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.account}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.entry_type}
                            size="small"
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              height: 20,
                              bgcolor:
                                row.entry_type === "Income"
                                  ? tokens.badgePaid.bg
                                  : "rgba(234,6,6,0.08)",
                              color:
                                row.entry_type === "Income"
                                  ? tokens.badgePaid.color
                                  : tokens.danger,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.description || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.location_name || "—"}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: tokens.muted, fontFamily: "monospace" }}>
                          {row.reference_no || "—"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: 12,
                            fontFamily: "monospace",
                            fontWeight: row.debit > 0 ? 600 : 400,
                            color: row.debit > 0 ? tokens.danger : tokens.border,
                          }}
                        >
                          {fmt(row.debit)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: 12,
                            fontFamily: "monospace",
                            fontWeight: row.credit > 0 ? 600 : 400,
                            color: row.credit > 0 ? tokens.badgePaid.color : tokens.border,
                          }}
                        >
                          {fmt(row.credit)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[25, 50, 100, 200]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
