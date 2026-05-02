import { describe, expect, it } from "vitest";
import { UnifiedFinanceValidationService } from "@/application/services/UnifiedFinanceValidationService";
import { RoleDashboardService } from "@/application/services/RoleDashboardService";

describe("Finance validation and dashboard filters", () => {
  it("requires references by expense taxonomy", () => {
    const service = new UnifiedFinanceValidationService();
    const invalid = service.validateExpense("site_project", {});
    const valid = service.validateExpense("site_project", { projectId: "P1" });
    expect(invalid.ok).toBe(false);
    expect(valid.ok).toBe(true);
  });

  it("filters dashboard metrics by role", () => {
    const service = new RoleDashboardService();
    expect(service.getVisibleMetrics("installation_team")).not.toContain("receivables");
    expect(service.getVisibleMetrics("admin")).toContain("receivables");
  });
});
