import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Typography,
  Paper,
} from "@mui/material";

const MODULES = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "revenue", label: "Revenue" },
  { slug: "expenses", label: "Expenses" },
  { slug: "payroll", label: "Payroll" },
  { slug: "budget", label: "Budget" },
  { slug: "analysis", label: "Analysis" },
  { slug: "ledger", label: "General Ledger" },
  { slug: "pnl", label: "Profit & Loss" },
  { slug: "cashflow", label: "Cash Flow" },
  { slug: "balance_sheet", label: "Balance Sheet" },
  { slug: "trial_balance", label: "Trial Balance" },
  { slug: "accounts", label: "Chart of Accounts" },
  { slug: "employees", label: "Employees" },
  { slug: "locations", label: "Locations & Units" },
  { slug: "reference", label: "Reference Data" },
];

interface PermissionsGridProps {
  value: Record<string, string>;
  onChange: (permissions: Record<string, string>) => void;
  disabled?: boolean;
}

export default function PermissionsGrid({
  value,
  onChange,
  disabled = false,
}: PermissionsGridProps) {
  const handleChange = (module: string, level: string) => {
    const next = { ...value };
    if (level === "none") {
      delete next[module];
    } else {
      next[module] = level;
    }
    onChange(next);
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography fontWeight={600} fontSize={13}>
                Module
              </Typography>
            </TableCell>
            <TableCell width={140}>
              <Typography fontWeight={600} fontSize={13}>
                Access Level
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {MODULES.map((mod) => (
            <TableRow key={mod.slug}>
              <TableCell>
                <Typography fontSize={13}>{mod.label}</Typography>
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={value[mod.slug] ?? "none"}
                  onChange={(e) => handleChange(mod.slug, e.target.value)}
                  disabled={disabled}
                  sx={{ fontSize: 13, height: 32, minWidth: 110 }}
                >
                  <MenuItem value="none" sx={{ fontSize: 13 }}>
                    None
                  </MenuItem>
                  <MenuItem value="read" sx={{ fontSize: 13 }}>
                    Read
                  </MenuItem>
                  <MenuItem value="write" sx={{ fontSize: 13 }}>
                    Read & Write
                  </MenuItem>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export { MODULES };
