import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./utils/store";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
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
        {/* Daily Input */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/revenue" element={<Placeholder />} />
        <Route path="/expenses" element={<Placeholder />} />
        <Route path="/payroll" element={<Placeholder />} />
        <Route path="/budget" element={<Placeholder />} />

        {/* Reports */}
        <Route path="/analysis" element={<Placeholder />} />
        <Route path="/ledger" element={<Placeholder />} />
        <Route path="/reports/pnl" element={<Placeholder />} />
        <Route path="/reports/cashflow" element={<Placeholder />} />
        <Route path="/reports/balance-sheet" element={<Placeholder />} />
        <Route path="/reports/trial-balance" element={<Placeholder />} />

        {/* Settings */}
        <Route path="/settings/accounts" element={<Placeholder />} />
        <Route path="/settings/employees" element={<Placeholder />} />
        <Route path="/settings/locations" element={<Placeholder />} />
        <Route path="/settings/reference" element={<Placeholder />} />

        {/* Profile */}
        <Route path="/profile" element={<Placeholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
