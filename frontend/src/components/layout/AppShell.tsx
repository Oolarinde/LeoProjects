/**
 * AppShell — root layout wrapper.
 *
 * Renders Sidebar (fixed left) + Navbar (sticky top) + main content area.
 * Holds the global year/location filter state and passes it down via
 * FilterContext so any page can read it without prop-drilling.
 */

import { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import Navbar from './Navbar';
import { tokens } from '../../theme';

// ─── Global filter context ────────────────────────────────────────────────────

interface FilterState {
  year: number;
  location: string;
}

interface FilterContextValue extends FilterState {
  setYear: (y: number) => void;
  setLocation: (l: string) => void;
}

const FilterContext = createContext<FilterContextValue>({
  year: new Date().getFullYear(),
  location: 'All Locations',
  setYear: () => {},
  setLocation: () => {},
});

export function useFilter() {
  return useContext(FilterContext);
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [year, setYear] = useState<number>(2024);
  const [location, setLocation] = useState<string>('All Locations');

  return (
    <FilterContext.Provider value={{ year, location, setYear, setLocation }}>
      <Box sx={{ display: 'flex', minHeight: '100vh', background: tokens.bg }}>
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${SIDEBAR_WIDTH + 24}px)` },
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Sticky navbar */}
          <Navbar
            onMenuClick={() => setMobileOpen(true)}
            year={year}
            location={location}
            onYearChange={setYear}
            onLocationChange={setLocation}
          />

          {/* Page content */}
          <Box
            sx={{
              flexGrow: 1,
              px: { xs: 2, sm: 3 },
              py: 3,
              // Prevent content from going under the rounded sidebar on desktop
              ml: { md: 0 },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </FilterContext.Provider>
  );
}
