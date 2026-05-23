import { describe, expect, it } from "vitest";
import { getVisibleUnifiedWizardSteps, skipVendorshipStep } from "@/lib/unifiedProjectWizardFlow";
import { createInitialUnifiedWizardState } from "@/types/createProjectWizard";
import { filterWorkTabsBySnapshot } from "@/lib/projectDetailTabs";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

describe("unified project wizard flow", () => {
  it("excludes OUTSOURCED_INC as a deal origin step option", () => {
    const state = createInitialUnifiedWizardState();
    expect(state.dealOrigin).toBe("DIRECT");
    expect(getVisibleUnifiedWizardSteps(state)).toContain("source");
    expect(getVisibleUnifiedWizardSteps(state)).not.toContain("parties");
  });

  it("supports outsource toggle on direct deals without a parties step", () => {
    const state = createInitialUnifiedWizardState({
      outsourceEnabled: true,
      subcontractorId: "SUB-1",
    });
    const steps = getVisibleUnifiedWizardSteps(state);
    expect(steps[0]).toBe("deal");
    expect(steps).toContain("commercials");
  });

  it("skips vendorship for labor-only INC taken", () => {
    const state = createInitialUnifiedWizardState({
      dealOrigin: "INC_TAKEN",
      incModifier: "LABOR_ONLY",
    });
    expect(skipVendorshipStep(state)).toBe(true);
    expect(getVisibleUnifiedWizardSteps(state)).not.toContain("vendorship");
    expect(getVisibleUnifiedWizardSteps(state)).toContain("parties");
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

  it("INC_GIVEN hides materials tab", () => {
    const project = baseProject({ projectKind: "INC_GIVEN" });
    const tabs = filterWorkTabsBySnapshot(project, "Document Vault").map((t) => t.value);
    expect(tabs).not.toContain("materials-sent");
    expect(tabs).toContain("field-operations");
  });

  it("VENDORSHIP_ONLY hides field operations and materials", () => {
    const project = baseProject({ projectKind: "VENDORSHIP_ONLY" });
    const tabs = filterWorkTabsBySnapshot(project, "Document Creator").map((t) => t.value);
    expect(tabs).not.toContain("field-operations");
    expect(tabs).not.toContain("materials-sent");
    expect(tabs).toContain("vendorship");
  });

  it("OUTSOURCED_INC hides materials dispatch tab", () => {
    const project = baseProject({
      projectKind: "OUTSOURCED_INC",
      outsource: {
        partyId: "SUB-1",
        partyName: "Sub Co",
        rateBasis: "fixed",
        rateValue: 50000,
        total: 50000,
        attachedAt: "2026-01-01",
      },
    });
    const tabs = filterWorkTabsBySnapshot(project, "Document Creator").map((t) => t.value);
    expect(tabs).not.toContain("materials-sent");
    expect(tabs).toContain("field-operations");
  });
});
