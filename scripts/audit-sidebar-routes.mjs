/**
 * Playwright audit: every sidebar nav route + entity detail pages (super_admin).
 * Usage: node scripts/audit-sidebar-routes.mjs [--base=http://localhost:8080] [--seed=scripts/audit-seed.json]
 */
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://localhost:8080";
const SEED_ARG = process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1];
const SEED_PATH = SEED_ARG ?? join(process.cwd(), "scripts", "audit-seed.json");

const APP_DATA_KEY = "mahi_solar_app_data";
const APP_DATA_VERSION_KEY = "mahi_solar_app_data_version";
const APP_DATA_VERSION = "9";

const SIDEBAR_PATHS = [
  "/",
  "/enquiries",
  "/quotations",
  "/projects",
  "/active-sites",
  "/timeline",
  "/calendar",
  "/inventory/materials",
  "/inventory/tools",
  "/templates",
  "/attendance",
  "/employees",
  "/teams",
  "/agents",
  "/finance",
  "/customers",
  "/invoices",
  "/vendors",
  "/loans",
  "/partners",
  "/vendorship-companies",
  "/subcontractors",
  "/inc-work-sources",
  "/analytics",
  "/audit",
  "/audit/chart-of-accounts",
  "/audit/profit-loss",
  "/audit/inventory",
  "/audit/debtors-creditors",
  "/audit/gst",
  "/audit/cash-bank",
  "/audit/expenses",
  "/audit/assets",
  "/audit/logs",
  "/audit/reports",
  "/audit/data-flow",
  "/notifications",
  "/settings/design-system",
  "/super-admin/data-engine",
];

const DETAIL_BUILDERS = [
  (d) => (d.projects?.[0]?.id ? `/projects/${d.projects[0].id}` : null),
  (d) => (d.agents?.[0]?.id ? `/agents/${d.agents[0].id}` : null),
  (d) => (d.customers?.[0]?.id ? `/customers/${d.customers[0].id}` : null),
  (d) => (d.teams?.[0]?.id ? `/teams/${d.teams[0].id}` : null),
  (d) => (d.employees?.[0]?.id ? `/employees/${d.employees[0].id}` : null),
  (d) => (d.vendors?.[0]?.id ? `/vendors/${d.vendors[0].id}` : null),
  (d) => (d.partners?.[0]?.id ? `/partners/${d.partners[0].id}` : null),
  (d) => (d.vendorshipCompanies?.[0]?.id ? `/vendorship/${d.vendorshipCompanies[0].id}` : null),
  (d) => (d.incGiverCompanies?.[0]?.id ? `/inc-sources/${d.incGiverCompanies[0].id}` : null),
  (d) => (d.subcontractors?.[0]?.id ? `/subcontractor/${d.subcontractors[0].id}` : null),
  (d) => (d.loans?.[0]?.id ? `/loans/person/${d.loans[0].id}` : null),
];

const DETAIL_PREFIXES = [
  { list: "/projects", pattern: /^\/projects\/[^/]+$/ },
  { list: "/agents", pattern: /^\/agents\/[^/]+$/ },
  { list: "/customers", pattern: /^\/customers\/[^/]+$/ },
  { list: "/teams", pattern: /^\/teams\/[^/]+$/ },
  { list: "/employees", pattern: /^\/employees\/[^/]+$/ },
  { list: "/vendors", pattern: /^\/vendors\/[^/]+$/ },
  { list: "/partners", pattern: /^\/partners\/[^/]+$/ },
  { list: "/vendorship-companies", pattern: /^\/vendorship\/[^/]+$/ },
  { list: "/inc-work-sources", pattern: /^\/inc-sources\/[^/]+$/ },
  { list: "/subcontractors", pattern: /^\/subcontractor\/[^/]+$/ },
  { list: "/loans", pattern: /^\/loans\/person\/[^/]+$/ },
];

const SESSION = {
  mahi_demo_session_authenticated: "1",
  mahi_demo_session_role: "super_admin",
  mahi_demo_session_member_id: "SA-001",
  mahi_demo_session_email: "rajesh.kulkarni@mss.solar",
  mahi_demo_session_user_name: "Rajesh Kulkarni",
};

async function auditPath(page, path, consoleErrors) {
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  };
  page.on("console", onConsole);

  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(800);

  const url = new URL(page.url());
  const finalPath = url.pathname;
  const bodyText = await page.locator("main").innerText().catch(() => "");

  const issues = [];
  if (bodyText.includes("This page failed to load") || bodyText.includes("failed to load")) {
    issues.push("PAGE_ERROR_BOUNDARY");
  }
  if (bodyText.includes("isn't available for the") && bodyText.includes("role")) {
    issues.push("ROUTE_ACCESS_DENIED");
  }
  if (finalPath === "/" && path !== "/" && !bodyText.includes("Dashboard")) {
    issues.push(`REDIRECTED_TO_HOME (from ${path})`);
  }
  if (finalPath !== path && !path.includes(finalPath) && !finalPath.includes(path.split("/")[1])) {
    // allow legacy redirects e.g. /vendorship-companies/X -> /vendorship/X
    if (!issues.some((i) => i.startsWith("REDIRECTED"))) {
      issues.push(`UNEXPECTED_URL ${finalPath}`);
    }
  }
  const criticalConsole = pageErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !e.includes("DevTools") &&
      (e.includes("Uncaught") || e.includes("ReferenceError") || e.includes("TypeError")),
  );
  if (criticalConsole.length) {
    issues.push(`CONSOLE: ${criticalConsole[0].slice(0, 120)}`);
  }

  page.off("console", onConsole);
  consoleErrors.push(...pageErrors);
  return { path, finalPath, issues, ok: issues.length === 0 };
}

async function collectDetailLinks(page, listPath, pattern) {
  await page.goto(`${BASE}${listPath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(600);
  const hrefs = await page.locator('main a[href]').evaluateAll((els) =>
    els.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  const paths = [...new Set(hrefs.map((h) => h.split("?")[0]).filter((p) => pattern.test(p)))];
  return paths.slice(0, 3);
}

async function loadSeedIntoPage(page) {
  if (!existsSync(SEED_PATH)) {
    console.warn(`No seed file at ${SEED_PATH} — detail routes may be skipped. Run: npx vitest run src/tests/generateAuditSeed.test.ts`);
    return null;
  }
  const raw = readFileSync(SEED_PATH, "utf8");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ appKey, versionKey, version, payload }) => {
      localStorage.setItem(appKey, payload);
      localStorage.setItem(versionKey, version);
    },
    { appKey: APP_DATA_KEY, versionKey: APP_DATA_VERSION_KEY, version: APP_DATA_VERSION, payload: raw },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return JSON.parse(raw);
}

function detailPathsFromSeed(appData) {
  if (!appData) return [];
  return DETAIL_BUILDERS.map((fn) => fn(appData)).filter(Boolean);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript((session) => {
    for (const [k, v] of Object.entries(session)) {
      localStorage.setItem(k, v);
    }
  }, SESSION);

  const page = await context.newPage();
  const appData = await loadSeedIntoPage(page);
  const allConsole = [];
  const results = [];

  for (const path of SIDEBAR_PATHS) {
    results.push(await auditPath(page, path, allConsole));
  }

  const seededDetails = detailPathsFromSeed(appData);
  if (seededDetails.length > 0) {
    for (const dp of seededDetails) {
      results.push(await auditPath(page, dp, allConsole));
    }
  } else {
    for (const { list, pattern } of DETAIL_PREFIXES) {
    const detailPaths = await collectDetailLinks(page, list, pattern);
    if (detailPaths.length === 0) {
      results.push({ path: `${list} → (detail)`, finalPath: "-", issues: ["NO_DETAIL_LINKS_FOUND"], ok: false });
      continue;
    }
    for (const dp of detailPaths) {
      results.push(await auditPath(page, dp, allConsole));
    }
  }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SIDEBAR ROUTE AUDIT (super_admin) ===\n");
  console.log(`Base: ${BASE}`);
  console.log(`Checked: ${results.length} routes`);
  console.log(`Pass: ${results.length - failed.length}`);
  console.log(`Fail: ${failed.length}\n`);

  for (const r of results) {
    const mark = r.ok ? "OK  " : "FAIL";
    console.log(`${mark}  ${r.path}${r.finalPath !== r.path ? ` → ${r.finalPath}` : ""}`);
    if (r.issues.length) console.log(`       ${r.issues.join("; ")}`);
  }

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
