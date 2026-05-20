import { describe, expect, it } from "vitest";
import { RoleDashboardService } from "@/application/services/RoleDashboardService";
import {
  isFieldOpsDashboardEmpty,
  isSalesPipelineDashboardEmpty,
  resolveDashboardOnboardingVariant,
  SALES_PIPELINE_METRICS,
} from "@/lib/dashboardOnboarding";

const emptyCounts = {
  openPipelineEnquiries: 0,
  overdueFollowUpEnquiries: 0,
  pendingQuotations: 0,
  activeProjects: 0,
  sitesOnOngoingProjects: 0,
  overdueTasks: 0,
  openOpsBlockages: 0,
  needToGetRows: 0,
};

describe("dashboardOnboarding", () => {
  it("detects empty sales pipeline when all four core metrics are zero", () => {
    const visible = new Set(new RoleDashboardService().getVisibleMetrics("salesperson"));
    expect(isSalesPipelineDashboardEmpty(visible, emptyCounts)).toBe(true);
    expect(resolveDashboardOnboardingVariant(visible, emptyCounts)).toBe("sales_pipeline");
  });

  it("does not treat pipeline as empty when an enquiry exists", () => {
    const visible = new Set(new RoleDashboardService().getVisibleMetrics("salesperson"));
    expect(
      isSalesPipelineDashboardEmpty(visible, {
        ...emptyCounts,
        openPipelineEnquiries: 1,
      }),
    ).toBe(false);
  });

  it("prefers sales onboarding over field ops when both groups are empty for admin", () => {
    const visible = new Set(new RoleDashboardService().getVisibleMetrics("admin"));
    expect(resolveDashboardOnboardingVariant(visible, emptyCounts)).toBe("sales_pipeline");
  });

  it("shows field ops onboarding for installation team when ops tiles are empty", () => {
    const visible = new Set(new RoleDashboardService().getVisibleMetrics("installation_team"));
    expect(isSalesPipelineDashboardEmpty(visible, emptyCounts)).toBe(false);
    expect(isFieldOpsDashboardEmpty(visible, emptyCounts)).toBe(true);
    expect(resolveDashboardOnboardingVariant(visible, emptyCounts)).toBe("field_ops");
  });

  it("returns null when pipeline has data", () => {
    const visible = new Set(new RoleDashboardService().getVisibleMetrics("admin"));
    expect(
      resolveDashboardOnboardingVariant(visible, {
        ...emptyCounts,
        pendingQuotations: 2,
      }),
    ).toBe(null);
  });
});
