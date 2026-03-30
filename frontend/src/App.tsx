import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore, hasAccess, isAdmin } from "./utils/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Revenue from "./pages/Revenue";
import Expenses from "./pages/Expenses";
import Placeholder from "./pages/Placeholder";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import GroupManagement from "./pages/GroupManagement";
import PayrollSetup from "./pages/payroll/PayrollSetup";
import ChartOfAccounts from "./pages/settings/ChartOfAccounts";
import LocationsAndUnits from "./pages/settings/Locations";
import Employees from "./pages/settings/Employees";
import ReferenceData from "./pages/settings/ReferenceData";

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
        <Route path="/payroll" element={<PermissionRoute module="payroll"><Placeholder /></PermissionRoute>} />
        <Route path="/payroll/setup" element={<PermissionRoute module="payroll"><PayrollSetup /></PermissionRoute>} />
        <Route path="/budget" element={<PermissionRoute module="budget"><Placeholder /></PermissionRoute>} />

        {/* Reports */}
        <Route path="/analysis" element={<PermissionRoute module="analysis"><Placeholder /></PermissionRoute>} />
        <Route path="/ledger" element={<PermissionRoute module="ledger"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/pnl" element={<PermissionRoute module="pnl"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/cashflow" element={<PermissionRoute module="cashflow"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/balance-sheet" element={<PermissionRoute module="balance_sheet"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/trial-balance" element={<PermissionRoute module="trial_balance"><Placeholder /></PermissionRoute>} />

        {/* Settings */}
        <Route path="/settings/accounts" element={<PermissionRoute module="accounts"><ChartOfAccounts /></PermissionRoute>} />
        <Route path="/settings/employees" element={<PermissionRoute module="employees"><Employees /></PermissionRoute>} />
        <Route path="/settings/locations" element={<PermissionRoute module="locations"><LocationsAndUnits /></PermissionRoute>} />
        <Route path="/settings/reference" element={<PermissionRoute module="reference"><ReferenceData /></PermissionRoute>} />
        <Route path="/settings/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/settings/roles" element={<AdminRoute><GroupManagement /></AdminRoute>} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
