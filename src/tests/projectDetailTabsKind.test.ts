import { describe, expect, it } from "vitest";
import { getVisibleUnifiedWizardSteps, skipVendorshipStep } from "@/lib/unifiedProjectWizardFlow";
import { createInitialUnifiedWizardState } from "@/types/createProjectWizard";
import { SHOWCASE_PROJECT_KINDS } from "@/lib/data-engine/smartGeneratorScenarios";
import { filterWorkTabsBySnapshot, defaultProjectDetailTab } from "@/lib/projectDetailTabs";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

describe("unified project wizard flow", () => {
  it("includes source step for direct deals", () => {
    const state = createInitialUnifiedWizardState();
    expect(state.dealOrigin).toBe("DIRECT");
    expect(getVisibleUnifiedWizardSteps(state)).toContain("source");
    expect(getVisibleUnifiedWizardSteps(state)).not.toContain("parties");
  });

  it("always includes vendorship for INC taken", () => {
    const state = createInitialUnifiedWizardState({
      dealOrigin: "INC_TAKEN",
    });
    expect(skipVendorshipStep(state)).toBe(false);
    expect(getVisibleUnifiedWizardSteps(state)).toContain("vendorship");
    expect(getVisibleUnifiedWizardSteps(state)).toContain("parties");
  });

  it("skips vendorship for VENDORSHIP_ONLY deals", () => {
    const state = createInitialUnifiedWizardState({
      dealOrigin: "VENDORSHIP_ONLY",
    });

    expect(skipVendorshipStep(state)).toBe(true);
    expect(getVisibleUnifiedWizardSteps(state)).not.toContain("vendorship");
    expect(getVisibleUnifiedWizardSteps(state)).toEqual(["deal", "details", "commercials", "review"]);
  });
});

describe("project detail tab visibility by kind", () => {
  function baseProject(overrides: Partial<Project>): Project {
    return normalizeProject({
      id: "P-1",
      name: "Test",
      client: "Client",
      customerId: "C-1",
      projectType: "Residential",
      projectCategory: "solar",
      lifecycleStatus: "New",
      capacity: "5 kW",
      location: "Mumbai",
      contractAmount: 100000,
      amountReceived: 0,
      startDate: "2026-01-01",
      createdAt: "2026-01-01",
      ...overrides,
    } as Project);
  }

  it("SOLO_EPC shows materials and client invoices", () => {
    const project = baseProject({ projectKind: "SOLO_EPC", vendorshipOwner: "MSS" });
    const tabs = filterWorkTabsBySnapshot(project, "Document Creator").map((t) => t.value);
    expect(tabs).toContain("materials-sent");
    expect(tabs).toContain("financials");
  });

  it("INC_GIVEN hides materials until enabled", () => {
    const project = baseProject({
      projectKind: "INC_GIVEN",
      scope: { hasMaterial: false, hasInstallation: true, materialSupplyPending: true, vendorshipOwner: "MSS", leadSource: "MSS_DIRECT", billingParty: "MSS" },
    });
    const tabs = filterWorkTabsBySnapshot(project, "Document Vault").map((t) => t.value);
    expect(tabs).not.toContain("materials-sent");
    expect(tabs).toContain("field-operations");
  });

  it("VENDORSHIP_ONLY hides field operations and materials", () => {
    const project = baseProject({ projectKind: "VENDORSHIP_ONLY", vendorshipOwner: "MSS" });
    const tabs = filterWorkTabsBySnapshot(project, "Document Creator").map((t) => t.value);
    expect(tabs).not.toContain("field-operations");
    expect(tabs).not.toContain("materials-sent");
    expect(tabs).toContain("vendorship");
  });

  it("partner external code shows materials not document creator", () => {
    const project = baseProject({
      projectKind: "PARTNER_EPC",
      vendorshipOwner: "PARTNER",
      projectMode: "PARTNER_NETWORK",
      partnerRole: "epc",
      scope: { hasMaterial: true, hasInstallation: true, vendorshipOwner: "PARTNER", leadSource: "PARTNER", billingParty: "MSS" },
    });
    const tabs = filterWorkTabsBySnapshot(project, "Document Vault").map((t) => t.value);
    expect(tabs).toContain("materials-sent");
    expect(tabs).not.toContain("document-creator");
  });

  it("default tab prefers financials for vendorship-only", () => {
    const project = baseProject({ projectKind: "VENDORSHIP_ONLY", vendorshipOwner: "MSS" });
    const tabs = filterWorkTabsBySnapshot(project, "Document Creator");
    expect(defaultProjectDetailTab("VENDORSHIP_ONLY", tabs)).toBe("financials");
  });

  it("each showcase project kind exposes at least one work tab", () => {
    for (const kind of SHOWCASE_PROJECT_KINDS) {
      const project = baseProject({
        projectKind: kind,
        vendorshipOwner: kind === "VENDORSHIP_ONLY" || kind === "INC_GIVEN" ? "MSS" : "PARTNER",
        lifecycleStatus: kind === "VENDORSHIP_ONLY" ? "Completed" : "In Progress",
        scope:
          kind === "INC_GIVEN"
            ? { hasMaterial: false, hasInstallation: true, materialSupplyPending: true, vendorshipOwner: "MSS", leadSource: "MSS_DIRECT", billingParty: "MSS" }
            : kind === "OUTSOURCED_INC"
              ? { hasMaterial: false, hasInstallation: true, vendorshipOwner: "MSS", leadSource: "MSS_DIRECT", billingParty: "MSS" }
              : { hasMaterial: true, hasInstallation: true, vendorshipOwner: "MSS", leadSource: "MSS_DIRECT", billingParty: "MSS" },
      });
      const tabs = filterWorkTabsBySnapshot(project, "Document Creator");
      expect(tabs.length).toBeGreaterThan(0);
      expect(defaultProjectDetailTab(kind, tabs)).toBeTruthy();
    }
  });
});
