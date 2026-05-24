import { describe, expect, it } from "vitest";
import { PROJECT_KINDS, type ProjectKind } from "@/domain/projectTypes/types";
import {
  deriveProjectKind,
  deriveProjectKindFromPartial,
  getVisibleWizardSteps,
  isDealKindResolved,
  isQuotationPrefillComplete,
  isStepVisible,
  isVendorshipStepApplicable,
  validateVisibleWizardSteps,
  validateWizardStep,
} from "@/lib/createProjectWizardLogic";
import {
  WIZARD_FLOW_STEPS,
  createInitialCreateProjectWizardState,
  type CreateProjectWizardState,
  type WizardStep,
} from "@/types/createProjectWizard";
import { getWizardFlow } from "@/lib/wizardFlow";

describe("deriveProjectKind", () => {
  it("maps lead path + partner sub-type to internal kinds", () => {
    const cases: Array<{
      label: string;
      partial: Parameters<typeof createInitialCreateProjectWizardState>[0];
      expected: ProjectKind;
    }> = [
      { label: "MSS direct", partial: { leadPath: "MSS_DIRECT" }, expected: "SOLO_EPC" },
      {
        label: "partner profit share",
        partial: { leadPath: "PARTNER", partnerType: "profit_share" },
        expected: "PARTNER_EPC",
      },
      {
        label: "partner fixed rate",
        partial: { leadPath: "PARTNER", partnerType: "fixed_rate" },
        expected: "FIXED_EPC",
      },
      {
        label: "vendor channel",
        partial: { leadPath: "PARTNER", partnerType: "vendor_channel" },
        expected: "VENDOR_NETWORK",
      },
      {
        label: "vendorship only",
        partial: { leadPath: "PARTNER", partnerType: "vendorship_only" },
        expected: "VENDORSHIP_ONLY",
      },
      { label: "INC given", partial: { leadPath: "INC_GIVEN" }, expected: "INC_GIVEN" },
      { label: "outsourced INC", partial: { leadPath: "OUTSOURCED_INC" }, expected: "OUTSOURCED_INC" },
    ];

    for (const { label, partial, expected } of cases) {
      expect(deriveProjectKindFromPartial(partial), label).toBe(expected);
    }

    const derived = new Set(cases.map((c) => c.expected));
    const userFacingKinds: ProjectKind[] = PROJECT_KINDS.filter((k) => k !== "INC");
    for (const kind of userFacingKinds) {
      expect(derived.has(kind), `missing coverage for ${kind}`).toBe(true);
    }
    expect(
      deriveProjectKindFromPartial({
        source: "direct_exception",
        directExceptionProjectKind: "INC",
      }),
    ).toBe("INC");
  });

  it("returns SOLO_EPC for quotation source", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          flow: "quotation",
          source: "quotation",
          selectedQuotationId: "Q-001",
        }),
      ),
    ).toBe("SOLO_EPC");
  });

  it("returns OUTSOURCED_INC for attach flow", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          flow: "attach",
          source: "attach_outsourced",
          attachToProjectId: "P-001",
        }),
      ),
    ).toBe("OUTSOURCED_INC");
  });
});

describe("wizard flows — isStepVisible", () => {
  it("intake flow: deal structure only until lead path resolved", () => {
    expect(getVisibleWizardSteps(createInitialCreateProjectWizardState({ flow: "intake" }))).toEqual([
      "DEAL_TYPE",
    ]);
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "MSS_DIRECT",
        }),
      ),
    ).toEqual(["DEAL_TYPE", "PARTIES", "COMMERCIAL", "REVIEW"]);
  });

  it("intake partner flow requires partner type before downstream steps", () => {
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({ flow: "intake", leadPath: "PARTNER" }),
      ),
    ).toEqual(["DEAL_TYPE"]);
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "vendor_channel",
        }),
      ),
    ).toEqual(["DEAL_TYPE", "PARTIES", "COMMERCIAL", "REVIEW"]);
  });

  it("quotation flow: quotation + review when prefill complete", () => {
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "quotation",
          source: "quotation",
          selectedQuotationId: "Q-1",
        }),
      ),
    ).toEqual(["QUOTATION", "REVIEW"]);

    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "quotation",
          source: "quotation",
          selectedQuotationId: "Q-1",
          quotationEditDetails: true,
        }),
      ),
    ).toEqual(["QUOTATION", "PARTIES", "COMMERCIAL", "REVIEW"]);
  });

  it("direct_exception flow: exception then downstream when structure resolved", () => {
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "direct_exception",
          source: "direct_exception",
          directExceptionReason: "Urgent",
        }),
      ),
    ).toEqual(["EXCEPTION"]);

    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "direct_exception",
          source: "direct_exception",
          directExceptionReason: "Urgent",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          selectedPartnerId: "P-1",
        }),
      ),
    ).toEqual(["EXCEPTION", "PARTIES", "COMMERCIAL", "REVIEW"]);
  });

  it("attach flow: parties then outsource terms when subcontractor selected", () => {
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({ flow: "attach", source: "attach_outsourced" }),
      ),
    ).toEqual(["ATTACH_PARTIES"]);

    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          flow: "attach",
          source: "attach_outsourced",
          attachToProjectId: "P-001",
          selectedSubcontractorId: "SUB-1",
        }),
      ),
    ).toEqual(["ATTACH_PARTIES", "OUTSOURCE_TERMS"]);
  });

  it("getVisibleWizardSteps matches isStepVisible", () => {
    const scenarios: Partial<CreateProjectWizardState>[] = [
      { flow: "intake" },
      { flow: "intake", leadPath: "MSS_DIRECT" },
      { flow: "quotation", selectedQuotationId: "Q-1" },
      {
        flow: "direct_exception",
        directExceptionReason: "x",
        leadPath: "INC_GIVEN",
      },
      {
        flow: "attach",
        attachToProjectId: "P-1",
        selectedSubcontractorId: "SUB-1",
      },
    ];

    for (const partial of scenarios) {
      const state = createInitialCreateProjectWizardState(partial);
      const flow = getWizardFlow(state);
      const ordered = [...WIZARD_FLOW_STEPS[flow]];
      if (flow === "quotation" && state.quotationEditDetails) {
        for (const step of ["PARTIES", "COMMERCIAL"] as WizardStep[]) {
          if (!ordered.includes(step)) {
            const reviewIndex = ordered.indexOf("REVIEW");
            if (reviewIndex >= 0) ordered.splice(reviewIndex, 0, step);
            else ordered.push(step);
          }
        }
      }
      expect(getVisibleWizardSteps(state)).toEqual(
        ordered.filter((s) => isStepVisible(s, state)),
      );
    }
  });
});

describe("validateWizardStep", () => {
  const errFields = (
    step: WizardStep,
    state: CreateProjectWizardState,
    context?: Parameters<typeof validateWizardStep>[2],
  ) => validateWizardStep(step, state, context).map((e) => e.field);

  it("returns no errors for a valid intake MSS direct draft", () => {
    const state = createInitialCreateProjectWizardState({
      flow: "intake",
      leadPath: "MSS_DIRECT",
      customerMode: "select",
      selectedCustomerId: "C-001",
      projectName: "Sharma 5kW",
      capacity: "5 kW",
      contractAmount: 250000,
      paymentType: "cash",
    });
    for (const step of getVisibleWizardSteps(state)) {
      expect(validateWizardStep(step, state)).toEqual([]);
    }
    expect(validateVisibleWizardSteps(state)).toEqual([]);
  });

  it("DEAL_TYPE: requires lead path and partner fields", () => {
    expect(errFields("DEAL_TYPE", createInitialCreateProjectWizardState({ flow: "intake" }))).toContain(
      "leadPath",
    );

    expect(
      errFields(
        "DEAL_TYPE",
        createInitialCreateProjectWizardState({ flow: "intake", leadPath: "PARTNER" }),
      ),
    ).toContain("partnerType");

    expect(
      errFields(
        "DEAL_TYPE",
        createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        }),
      ),
    ).toContain("selectedPartnerId");
  });

  it("EXCEPTION: requires reason and deal structure", () => {
    expect(
      errFields(
        "EXCEPTION",
        createInitialCreateProjectWizardState({ flow: "direct_exception", source: "direct_exception" }),
      ),
    ).toEqual(expect.arrayContaining(["directExceptionReason", "leadPath"]));
  });

  it("EXCEPTION: requires partner for direct_exception partner profit share", () => {
    expect(
      errFields(
        "EXCEPTION",
        createInitialCreateProjectWizardState({
          flow: "direct_exception",
          source: "direct_exception",
          directExceptionReason: "Partner deal",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        }),
      ),
    ).toContain("selectedPartnerId");
  });

  it("isDealKindResolved for partner profit share requires partner id on deal structure step", () => {
    expect(
      isDealKindResolved(
        createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        }),
      ),
    ).toBe(false);
    expect(
      isDealKindResolved(
        createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          selectedPartnerId: "P-1",
        }),
      ),
    ).toBe(true);
  });
});
