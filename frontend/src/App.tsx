import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import DesignPreview from './pages/DesignPreview';

// Placeholder — swap for real pages as they're built
function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: 32, color: '#344767', fontFamily: 'Open Sans, sans-serif' }}>
      <h2 style={{ margin: 0 }}>{name}</h2>
      <p style={{ color: '#67748e', fontSize: 14 }}>Page coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Shell wraps all authenticated pages */}
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="revenue"   element={<Placeholder name="Revenue" />} />
            <Route path="expenses"  element={<Placeholder name="Expenses" />} />
            <Route path="payroll"   element={<Placeholder name="Payroll" />} />
            <Route path="budget"    element={<Placeholder name="Budget" />} />
            <Route path="analysis"  element={<Placeholder name="Analysis" />} />
            <Route path="ledger"    element={<Placeholder name="General Ledger" />} />

            <Route path="reports">
              <Route path="pnl"           element={<Placeholder name="Profit & Loss" />} />
              <Route path="cashflow"      element={<Placeholder name="Cash Flow" />} />
              <Route path="balance-sheet" element={<Placeholder name="Balance Sheet" />} />
              <Route path="trial-balance" element={<Placeholder name="Trial Balance" />} />
            </Route>

            <Route path="settings">
              <Route path="accounts"  element={<Placeholder name="Chart of Accounts" />} />
              <Route path="employees" element={<Placeholder name="Employees" />} />
              <Route path="locations" element={<Placeholder name="Locations & Units" />} />
              <Route path="reference" element={<Placeholder name="Reference Data" />} />
            </Route>

            {/* Dev-only design preview — remove before production */}
            <Route path="design-preview" element={<DesignPreview />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
