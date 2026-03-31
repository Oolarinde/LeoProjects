import { Routes, Route, Navigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import { useAppStore, hasAccess, isAdmin } from "./utils/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Revenue from "./pages/Revenue";
import Expenses from "./pages/Expenses";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import GroupManagement from "./pages/GroupManagement";
import PayrollSetup from "./pages/payroll/PayrollSetup";
import PayrollEmployees from "./pages/payroll/PayrollEmployees";
import LeaveRequests from "./pages/payroll/LeaveRequests";
import ChartOfAccounts from "./pages/settings/ChartOfAccounts";
import LocationsAndUnits from "./pages/settings/Locations";
import Employees from "./pages/settings/Employees";
import ReferenceData from "./pages/settings/ReferenceData";
import ProfitLoss from "./pages/reports/ProfitLoss";
import CashFlow from "./pages/reports/CashFlow";
import BalanceSheet from "./pages/reports/BalanceSheet";
import TrialBalance from "./pages/reports/TrialBalance";
import GeneralLedger from "./pages/GeneralLedger";
import Budget from "./pages/Budget";
import PayrollProcessing from "./pages/payroll/PayrollProcessing";
import Analysis from "./pages/Analysis";
import TenantOps from "./pages/TenantOps";
import GroupDashboard from "./pages/GroupDashboard";
import GroupSettings from "./pages/GroupSettings";
import InterCompanyTransactions from "./pages/InterCompanyTransactions";
import ConsolidatedPnL from "./pages/reports/ConsolidatedPnL";
import ConsolidatedBalanceSheet from "./pages/reports/ConsolidatedBalanceSheet";
import ConsolidatedTrialBalance from "./pages/reports/ConsolidatedTrialBalance";
import StaffProfile from "./pages/payroll/StaffProfile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PermissionRoute({
  module,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAccess(user, module, "read")) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GroupRoute({ children }: { children: React.ReactNode }) {
  const effectiveRole = useAppStore((s) => s.user?.effective_role);
  if (effectiveRole !== "GROUP_ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Group features are only available to group administrators.
        </Alert>
      </Box>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard — accessible to all authenticated users */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Bookkeeping */}
        <Route path="/revenue" element={<PermissionRoute module="revenue"><Revenue /></PermissionRoute>} />
        <Route path="/expenses" element={<PermissionRoute module="expenses"><Expenses /></PermissionRoute>} />
        <Route path="/payroll" element={<GroupRoute><PayrollProcessing /></GroupRoute>} />
        <Route path="/payroll/setup" element={<GroupRoute><PayrollSetup /></GroupRoute>} />
        <Route path="/payroll/employees" element={<GroupRoute><PayrollEmployees /></GroupRoute>} />
        <Route path="/payroll/employees/:employeeId" element={<GroupRoute><StaffProfile /></GroupRoute>} />
        <Route path="/payroll/leave" element={<GroupRoute><LeaveRequests /></GroupRoute>} />
        <Route path="/budget" element={<PermissionRoute module="budget"><Budget /></PermissionRoute>} />

        {/* Reports */}
        <Route path="/analysis" element={<PermissionRoute module="analysis"><Analysis /></PermissionRoute>} />
        <Route path="/ledger" element={<PermissionRoute module="ledger"><GeneralLedger /></PermissionRoute>} />
        <Route path="/reports/pnl" element={<PermissionRoute module="pnl"><ProfitLoss /></PermissionRoute>} />
        <Route path="/reports/cashflow" element={<PermissionRoute module="cashflow"><CashFlow /></PermissionRoute>} />
        <Route path="/reports/balance-sheet" element={<PermissionRoute module="balance_sheet"><BalanceSheet /></PermissionRoute>} />
        <Route path="/reports/trial-balance" element={<PermissionRoute module="trial_balance"><TrialBalance /></PermissionRoute>} />

        {/* Settings */}
        <Route path="/settings/accounts" element={<PermissionRoute module="accounts"><ChartOfAccounts /></PermissionRoute>} />
        <Route path="/settings/employees" element={<PermissionRoute module="employees"><Employees /></PermissionRoute>} />
        <Route path="/settings/locations" element={<PermissionRoute module="locations"><LocationsAndUnits /></PermissionRoute>} />
        <Route path="/settings/reference" element={<PermissionRoute module="reference"><ReferenceData /></PermissionRoute>} />
        <Route path="/settings/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/settings/roles" element={<AdminRoute><GroupManagement /></AdminRoute>} />

        {/* Tenant Ops */}
        <Route path="/tenants" element={<PermissionRoute module="revenue"><TenantOps /></PermissionRoute>} />

        {/* Group Accounting */}
        <Route path="/group/dashboard" element={<GroupRoute><GroupDashboard /></GroupRoute>} />
        <Route path="/group/settings" element={<AdminRoute><GroupSettings /></AdminRoute>} />
        <Route path="/group/intercompany" element={<GroupRoute><InterCompanyTransactions /></GroupRoute>} />
        <Route path="/group/reports/pnl" element={<GroupRoute><ConsolidatedPnL /></GroupRoute>} />
        <Route path="/group/reports/balance-sheet" element={<GroupRoute><ConsolidatedBalanceSheet /></GroupRoute>} />
        <Route path="/group/reports/trial-balance" element={<GroupRoute><ConsolidatedTrialBalance /></GroupRoute>} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
