import { describe, expect, it } from "vitest";

/**
 * Importing each page module ensures TypeScript compiles AND no top-level statement throws.
 * If any page has a circular import or a top-level error, this surfaces immediately rather
 * than at the user's first navigation.
 */
describe("All routed pages import without throwing", () => {
  it("loads detail pages and key flows", { timeout: 60000 }, async () => {
    await expect(import("@/pages/Dashboard")).resolves.toBeDefined();
    await expect(import("@/pages/Finance")).resolves.toBeDefined();
    await expect(import("@/pages/Customers")).resolves.toBeDefined();
    await expect(import("@/pages/Invoices")).resolves.toBeDefined();
    await expect(import("@/pages/ProjectDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Projects")).resolves.toBeDefined();
    await expect(import("@/pages/Enquiries")).resolves.toBeDefined();
    await expect(import("@/pages/Quotations")).resolves.toBeDefined();
    await expect(import("@/pages/Teams")).resolves.toBeDefined();
    await expect(import("@/pages/TeamDetail")).resolves.toBeDefined();
    await expect(import("@/pages/Partners")).resolves.toBeDefined();
    await expect(import("@/pages/PartnerDetail")).resolves.toBeDefined();
    await expect(import("@/pages/VendorshipCompanies")).resolves.toBeDefined();
    await expect(import("@/pages/VendorshipCompanyDetail")).resolves.toBeDefined();
    await expect(import("@/pages/INCWorkSources")).resolves.toBeDefined();
    await expect(import("@/pages/INCWorkSourceDetail")).resolves.toBeDefined();
    await expect(import("@/pages/ActiveSites")).resolves.toBeDefined();
    await expect(import("@/pages/Timeline")).resolves.toBeDefined();
    await expect(import("@/pages/Materials")).resolves.toBeDefined();
    await expect(import("@/pages/Tools")).resolves.toBeDefined();
    await expect(import("@/pages/Loans")).resolves.toBeDefined();
    await expect(import("@/pages/Agents")).resolves.toBeDefined();
    await expect(import("@/pages/AgentDetail")).resolves.toBeDefined();
    await expect(import("@/pages/inventory/TemplatesPage")).resolves.toBeDefined();
    await expect(import("@/pages/audit/AuditDashboard")).resolves.toBeDefined();
    await expect(import("@/pages/audit/ProfitLoss")).resolves.toBeDefined();
    await expect(import("@/pages/audit/ChartOfAccounts")).resolves.toBeDefined();
    await expect(import("@/pages/Settings")).resolves.toBeDefined();
    await expect(import("@/pages/Notifications")).resolves.toBeDefined();
  });

  it("loads key components used inside ProjectDetail", { timeout: 20000 }, async () => {
    await expect(import("@/components/projects/ProgressReportTab")).resolves.toBeDefined();
    await expect(import("@/components/projects/TeamRosterTab")).resolves.toBeDefined();
    await expect(import("@/components/projects/MaterialsSentTab")).resolves.toBeDefined();
    await expect(import("@/components/projects/CreateProjectWizard")).resolves.toBeDefined();
  });
});
