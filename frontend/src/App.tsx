import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore, hasAccess, isAdmin } from "./utils/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import UserManagement from "./pages/UserManagement";

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
        <Route path="/revenue" element={<PermissionRoute module="revenue"><Placeholder /></PermissionRoute>} />
        <Route path="/expenses" element={<PermissionRoute module="expenses"><Placeholder /></PermissionRoute>} />
        <Route path="/payroll" element={<PermissionRoute module="payroll"><Placeholder /></PermissionRoute>} />
        <Route path="/budget" element={<PermissionRoute module="budget"><Placeholder /></PermissionRoute>} />

        {/* Reports */}
        <Route path="/analysis" element={<PermissionRoute module="analysis"><Placeholder /></PermissionRoute>} />
        <Route path="/ledger" element={<PermissionRoute module="ledger"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/pnl" element={<PermissionRoute module="pnl"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/cashflow" element={<PermissionRoute module="cashflow"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/balance-sheet" element={<PermissionRoute module="balance_sheet"><Placeholder /></PermissionRoute>} />
        <Route path="/reports/trial-balance" element={<PermissionRoute module="trial_balance"><Placeholder /></PermissionRoute>} />

        {/* Settings */}
        <Route path="/settings/accounts" element={<PermissionRoute module="accounts"><Placeholder /></PermissionRoute>} />
        <Route path="/settings/employees" element={<PermissionRoute module="employees"><Placeholder /></PermissionRoute>} />
        <Route path="/settings/locations" element={<PermissionRoute module="locations"><Placeholder /></PermissionRoute>} />
        <Route path="/settings/reference" element={<PermissionRoute module="reference"><Placeholder /></PermissionRoute>} />
        <Route path="/settings/users" element={<AdminRoute><UserManagement /></AdminRoute>} />

        {/* Profile */}
        <Route path="/profile" element={<Placeholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
