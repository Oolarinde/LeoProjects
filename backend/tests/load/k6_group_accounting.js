/**
 * k6 Load Test — Group Accounting Feature
 *
 * Endpoints under test:
 *   1. POST /api/auth/switch-company        (highest frequency — company switching)
 *   2. GET  /api/company-groups/dashboard    (read-heavy dashboard)
 *   3. POST /api/intercompany/transactions   (write + mirror entries)
 *   4. GET  /api/reports/consolidated/pnl/summary          (expensive SQL)
 *   5. GET  /api/reports/consolidated/balance-sheet/summary (expensive SQL)
 *   6. GET  /api/reports/consolidated/trial-balance/summary (expensive SQL)
 *
 * Scenarios:
 *   - smoke:  1 VU,  10 iterations
 *   - load:   10 VUs, 2 minutes
 *   - stress: 50 VUs, 1 minute
 *
 * Usage:
 *   k6 run --env SCENARIO=smoke  k6_group_accounting.js
 *   k6 run --env SCENARIO=load   k6_group_accounting.js
 *   k6 run --env SCENARIO=stress k6_group_accounting.js
 *
 * Environment variables:
 *   BASE_URL           — API base URL         (default: http://localhost:8000)
 *   USERNAME           — Login email           (default: admin@talents.com)
 *   PASSWORD           — Login password        (default: admin123)
 *   TARGET_COMPANY_ID  — UUID of company to switch to (required for switch test)
 *   SOURCE_COMPANY_ID  — UUID of source company for IC transactions
 *   YEAR               — Fiscal year to query  (default: 2024)
 *   SCENARIO           — smoke | load | stress (default: smoke)
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const USERNAME = __ENV.USERNAME || "admin@talents.com";
const PASSWORD = __ENV.PASSWORD || "admin123";
const TARGET_COMPANY_ID = __ENV.TARGET_COMPANY_ID || "";
const SOURCE_COMPANY_ID = __ENV.SOURCE_COMPANY_ID || "";
const YEAR = parseInt(__ENV.YEAR || "2024", 10);
const SCENARIO = __ENV.SCENARIO || "smoke";

// ─── Custom Metrics ─────────────────────────────────────────────────────────

// Per-endpoint response time trends
const switchCompanyDuration = new Trend("switch_company_duration", true);
const dashboardDuration = new Trend("group_dashboard_duration", true);
const icCreateDuration = new Trend("ic_create_duration", true);
const consolPnlDuration = new Trend("consol_pnl_duration", true);
const consolBsDuration = new Trend("consol_bs_duration", true);
const consolTbDuration = new Trend("consol_tb_duration", true);

// Per-endpoint failure rates
const switchCompanyErrors = new Rate("switch_company_errors");
const dashboardErrors = new Rate("group_dashboard_errors");
const icCreateErrors = new Rate("ic_create_errors");
const consolPnlErrors = new Rate("consol_pnl_errors");
const consolBsErrors = new Rate("consol_bs_errors");
const consolTbErrors = new Rate("consol_tb_errors");

// Aggregate error counter
const totalErrors = new Counter("total_errors");

// ─── Scenario Selection ─────────────────────────────────────────────────────

const scenarios = {
  smoke: {
    executor: "per-vu-iterations",
    vus: 1,
    iterations: 10,
    maxDuration: "1m",
  },
  load: {
    executor: "constant-vus",
    vus: 10,
    duration: "2m",
  },
  stress: {
    executor: "constant-vus",
    vus: 50,
    duration: "1m",
  },
};

export const options = {
  scenarios: {
    default: scenarios[SCENARIO] || scenarios.smoke,
  },
  thresholds: {
    // SLO: Company switch p95 < 200ms
    switch_company_duration: ["p(95)<200"],
    // SLO: Dashboard p95 < 500ms
    group_dashboard_duration: ["p(95)<500"],
    // SLO: IC creation p95 < 1000ms
    ic_create_duration: ["p(95)<1000"],
    // SLO: Consolidated reports p95 < 2000ms
    consol_pnl_duration: ["p(95)<2000"],
    consol_bs_duration: ["p(95)<2000"],
    consol_tb_duration: ["p(95)<2000"],
    // Overall error rates
    switch_company_errors: ["rate<0.05"],
    group_dashboard_errors: ["rate<0.05"],
    ic_create_errors: ["rate<0.05"],
    consol_pnl_errors: ["rate<0.05"],
    consol_bs_errors: ["rate<0.05"],
    consol_tb_errors: ["rate<0.05"],
  },
};

// ─── Auth Setup ─────────────────────────────────────────────────────────────

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: USERNAME, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, {
    "login status is 200": (r) => r.status === 200,
  });

  if (loginRes.status !== 200) {
    console.error(`Login failed: ${loginRes.status} — ${loginRes.body}`);
    return { token: null };
  }

  const body = loginRes.json();
  const token = body.access_token;

  // Fetch user info to discover company IDs if not provided via env
  const meRes = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let targetCompanyId = TARGET_COMPANY_ID;
  let sourceCompanyId = SOURCE_COMPANY_ID;

  if (meRes.status === 200) {
    const meBody = meRes.json();
    const companies = meBody.companies || [];
    if (!sourceCompanyId && meBody.company_id) {
      sourceCompanyId = meBody.company_id;
    }
    if (!targetCompanyId && companies.length >= 2) {
      // Pick a company that is NOT the current one
      const other = companies.find((c) => c.id !== meBody.company_id);
      targetCompanyId = other ? other.id : companies[0].id;
    } else if (!targetCompanyId && companies.length === 1) {
      targetCompanyId = companies[0].id;
    }
  }

  return {
    token,
    targetCompanyId,
    sourceCompanyId,
    year: YEAR,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

function readHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// ─── Main Test Function ─────────────────────────────────────────────────────

export default function (data) {
  if (!data.token) {
    console.error("No auth token — aborting iteration");
    return;
  }

  const { token, targetCompanyId, sourceCompanyId, year } = data;

  // ── 1. Company Switch (highest frequency) ───────────────────────────────
  group("POST /api/auth/switch-company", () => {
    if (!targetCompanyId) {
      console.warn("No target company ID — skipping switch test");
      return;
    }

    const res = http.post(
      `${BASE_URL}/api/auth/switch-company`,
      JSON.stringify({ company_id: targetCompanyId }),
      authHeaders(token)
    );

    switchCompanyDuration.add(res.timings.duration);
    const passed = check(res, {
      "switch-company status is 200": (r) => r.status === 200,
      "switch-company returns access_token": (r) => {
        try {
          return r.json().access_token !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!passed) {
      switchCompanyErrors.add(1);
      totalErrors.add(1);
    } else {
      switchCompanyErrors.add(0);
    }
  });

  sleep(0.3);

  // ── 2. Group Dashboard (read-heavy) ─────────────────────────────────────
  group("GET /api/company-groups/dashboard", () => {
    const res = http.get(
      `${BASE_URL}/api/company-groups/dashboard?year=${year}`,
      readHeaders(token)
    );

    dashboardDuration.add(res.timings.duration);
    const passed = check(res, {
      "dashboard status is 200": (r) => r.status === 200,
      "dashboard has group_name": (r) => {
        try {
          return r.json().group_name !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!passed) {
      dashboardErrors.add(1);
      totalErrors.add(1);
    } else {
      dashboardErrors.add(0);
    }
  });

  sleep(0.3);

  // ── 3. IC Transaction Creation (write + mirror) ─────────────────────────
  group("POST /api/intercompany/transactions", () => {
    if (!sourceCompanyId || !targetCompanyId) {
      console.warn("Missing company IDs — skipping IC creation test");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      source_company_id: sourceCompanyId,
      target_company_id: targetCompanyId,
      transaction_type: "management_fee",
      date: today,
      amount: (Math.random() * 50000 + 1000).toFixed(2),
      description: `k6 load test IC txn — ${Date.now()}`,
      reference_no: `K6-${__VU}-${__ITER}`,
    };

    const res = http.post(
      `${BASE_URL}/api/intercompany/transactions`,
      JSON.stringify(payload),
      authHeaders(token)
    );

    icCreateDuration.add(res.timings.duration);
    const passed = check(res, {
      "ic-create status is 201": (r) => r.status === 201,
      "ic-create returns id": (r) => {
        try {
          const body = r.json();
          return body.id !== undefined || body.allocated !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!passed) {
      icCreateErrors.add(1);
      totalErrors.add(1);
    } else {
      icCreateErrors.add(0);
    }
  });

  sleep(0.3);

  // ── 4. Consolidated P&L (expensive SQL) ─────────────────────────────────
  group("GET /api/reports/consolidated/pnl/summary", () => {
    const res = http.get(
      `${BASE_URL}/api/reports/consolidated/pnl/summary?year=${year}`,
      readHeaders(token)
    );

    consolPnlDuration.add(res.timings.duration);
    const passed = check(res, {
      "consol-pnl status is 200": (r) => r.status === 200,
    });

    if (!passed) {
      consolPnlErrors.add(1);
      totalErrors.add(1);
    } else {
      consolPnlErrors.add(0);
    }
  });

  sleep(0.2);

  // ── 5. Consolidated Balance Sheet ───────────────────────────────────────
  group("GET /api/reports/consolidated/balance-sheet/summary", () => {
    const res = http.get(
      `${BASE_URL}/api/reports/consolidated/balance-sheet/summary?year=${year}`,
      readHeaders(token)
    );

    consolBsDuration.add(res.timings.duration);
    const passed = check(res, {
      "consol-bs status is 200": (r) => r.status === 200,
    });

    if (!passed) {
      consolBsErrors.add(1);
      totalErrors.add(1);
    } else {
      consolBsErrors.add(0);
    }
  });

  sleep(0.2);

  // ── 6. Consolidated Trial Balance ───────────────────────────────────────
  group("GET /api/reports/consolidated/trial-balance/summary", () => {
    const res = http.get(
      `${BASE_URL}/api/reports/consolidated/trial-balance/summary?year=${year}`,
      readHeaders(token)
    );

    consolTbDuration.add(res.timings.duration);
    const passed = check(res, {
      "consol-tb status is 200": (r) => r.status === 200,
    });

    if (!passed) {
      consolTbErrors.add(1);
      totalErrors.add(1);
    } else {
      consolTbErrors.add(0);
    }
  });

  sleep(0.5);
}
