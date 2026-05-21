import { describe, expect, it } from "vitest";

/**
 * Phase 1.6 — Catch-all import smoke for every page module under `src/pages/**`.
 *
 * Sister to `pageImportsSmoke.test.ts` (curated list). This is the full list — any future
 * page added under `src/pages/` should be wired into a route AND should appear here so
 * top-level errors surface in CI rather than at the user's first navigation.
 *
 * If a page is added and this test breaks because the new page throws on import, the page
 * has a real defect (top-level field-access on undefined, top-level `new Date(undefined)`,
 * etc.) — fix the page; do NOT add a defensive import wrapper here.
 */
describe("Every page in src/pages imports without throwing", () => {
  it("imports all top-level pages", { timeout: 60000 }, async () => {
    await expect(import("@/pages/Dashboard")).resolves.toBeDefined();
    await expect(import("@/pages/Enquiries")).resolves.toBeDefined();
    await expect(import("@/pages/Quotations")).resolves.toBeDefined();
    await expect(import("@/pages/Projects")).resolves.toBeDefined();
    await expect(import("@/pages/ProjectDetail")).resolves.toBeDefined();
    await expect(import("@/pages/ActiveSites")).resolves.toBeDefined();
    await expect(import("@/pages/Timeline")).resolves.toBeDefined();
    await expect(import("@/pages/Calendar")).resolves.toBeDefined();
    await expect(import("@/pages/Customers")).resolves.toBeDefined();
    await expect(import("@/pages/CustomerDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Invoices")).resolves.toBeDefined();
    await expect(import("@/pages/Vendors")).resolves.toBeDefined();
    await expect(import("@/pages/VendorDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Loans")).resolves.toBeDefined();
    await expect(import("@/pages/LoanPersonDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Partners")).resolves.toBeDefined();
    await expect(import("@/pages/PartnerDetail")).resolves.toBeDefined();
    await expect(import("@/pages/VendorshipCompanies")).resolves.toBeDefined();
    await expect(import("@/pages/VendorshipCompanyDetail")).resolves.toBeDefined();
    await expect(import("@/pages/INCWorkSources")).resolves.toBeDefined();
    await expect(import("@/pages/INCWorkSourceDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Finance")).resolves.toBeDefined();
    await expect(import("@/pages/Employees")).resolves.toBeDefined();
    await expect(import("@/pages/EmployeeProfile")).resolves.toBeDefined();
    await expect(import("@/pages/Teams")).resolves.toBeDefined();
    await expect(import("@/pages/TeamDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Agents")).resolves.toBeDefined();
    await expect(import("@/pages/AgentDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Attendance")).resolves.toBeDefined();
    await expect(import("@/pages/Materials")).resolves.toBeDefined();
    await expect(import("@/pages/Tools")).resolves.toBeDefined();
    await expect(import("@/pages/inventory/TemplatesPage")).resolves.toBeDefined();
    await expect(import("@/pages/Analytics")).resolves.toBeDefined();
    await expect(import("@/pages/Notifications")).resolves.toBeDefined();
    await expect(import("@/pages/Settings")).resolves.toBeDefined();
    await expect(import("@/pages/DesignSystem")).resolves.toBeDefined();
    await expect(import("@/pages/NotFound")).resolves.toBeDefined();
  });

  it("imports all audit pages (Phase 4.5 correctness pass targets)", { timeout: 20000 }, async () => {
    await expect(import("@/pages/audit/AuditDashboard")).resolves.toBeDefined();
    await expect(import("@/pages/audit/ChartOfAccounts")).resolves.toBeDefined();
    await expect(import("@/pages/audit/ProfitLoss")).resolves.toBeDefined();
    await expect(import("@/pages/audit/InventoryAudit")).resolves.toBeDefined();
    await expect(import("@/pages/audit/DebtorsCreditors")).resolves.toBeDefined();
    await expect(import("@/pages/audit/GSTCompliance")).resolves.toBeDefined();
    await expect(import("@/pages/audit/CashBankLedger")).resolves.toBeDefined();
    await expect(import("@/pages/audit/ExpenseAudit")).resolves.toBeDefined();
    await expect(import("@/pages/audit/FixedAssets")).resolves.toBeDefined();
    await expect(import("@/pages/audit/AuditLogs")).resolves.toBeDefined();
    await expect(import("@/pages/audit/AuditReports")).resolves.toBeDefined();
    await expect(import("@/pages/audit/AuditDataFlow")).resolves.toBeDefined();
  });
});
