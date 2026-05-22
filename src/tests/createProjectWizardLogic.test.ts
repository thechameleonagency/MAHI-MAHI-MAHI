import { describe, expect, it } from "vitest";
import { PROJECT_KINDS, type ProjectKind } from "@/domain/projectTypes/types";
import {
  deriveProjectKind,
  deriveProjectKindFromPartial,
  getVisibleWizardSteps,
  isLeadPathResolved,
  isStepVisible,
  isVendorshipStepApplicable,
  validateVisibleWizardSteps,
  validateWizardStep,
} from "@/lib/createProjectWizardLogic";
import {
  WIZARD_STEPS,
  createInitialCreateProjectWizardState,
  type CreateProjectWizardState,
  type WizardStep,
} from "@/types/createProjectWizard";

describe("deriveProjectKind", () => {
  it("maps all eight legacy kinds via lead path, partner type, and direct exception", () => {
    const cases: Array<{ label: string; partial: Parameters<typeof createInitialCreateProjectWizardState>[0]; expected: ProjectKind }> = [
      { label: "MSS direct", partial: { source: "new", leadPath: "MSS_DIRECT" }, expected: "SOLO_EPC" },
      { label: "partner profit share", partial: { source: "new", leadPath: "PARTNER", partnerType: "profit_share" }, expected: "PARTNER_EPC" },
      { label: "partner fixed rate", partial: { source: "new", leadPath: "PARTNER", partnerType: "fixed_rate" }, expected: "FIXED_EPC" },
      { label: "vendor channel", partial: { source: "new", leadPath: "PARTNER", partnerType: "vendor_channel" }, expected: "VENDOR_NETWORK" },
      { label: "vendorship only", partial: { source: "new", leadPath: "PARTNER", partnerType: "vendorship_only" }, expected: "VENDORSHIP_ONLY" },
      { label: "INC given", partial: { source: "new", leadPath: "INC_GIVEN" }, expected: "INC_GIVEN" },
      { label: "outsourced INC", partial: { source: "new", leadPath: "OUTSOURCED_INC" }, expected: "OUTSOURCED_INC" },
      { label: "direct exception INC", partial: { source: "direct_exception", directExceptionProjectKind: "INC" }, expected: "INC" },
    ];

    for (const { label, partial, expected } of cases) {
      expect(deriveProjectKindFromPartial(partial), label).toBe(expected);
    }

    const derived = new Set(cases.map((c) => c.expected));
    for (const kind of PROJECT_KINDS) {
      expect(derived.has(kind), `missing coverage for ${kind}`).toBe(true);
    }
  });

  it("returns SOLO_EPC for quotation source regardless of lead path", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          source: "quotation",
          selectedQuotationId: "Q-001",
          leadPath: "PARTNER",
          partnerType: "fixed_rate",
        }),
      ),
    ).toBe("SOLO_EPC");
  });

  it("uses directExceptionProjectKind over lead path when source is direct_exception", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          source: "direct_exception",
          directExceptionReason: "Urgent install",
          directExceptionProjectKind: "VENDOR_NETWORK",
          leadPath: "MSS_DIRECT",
        }),
      ),
    ).toBe("VENDOR_NETWORK");
  });

  it("changes derived kind when partner sub-type changes", () => {
    const base = createInitialCreateProjectWizardState({
      source: "new",
      leadPath: "PARTNER",
    });

    expect(deriveProjectKind({ ...base, partnerType: "profit_share" })).toBe("PARTNER_EPC");
    expect(deriveProjectKind({ ...base, partnerType: "fixed_rate" })).toBe("FIXED_EPC");
    expect(deriveProjectKind({ ...base, partnerType: "vendor_channel" })).toBe("VENDOR_NETWORK");
    expect(deriveProjectKind({ ...base, partnerType: "vendorship_only" })).toBe("VENDORSHIP_ONLY");
  });

  it("defaults partner path to PARTNER_EPC when partnerType is unset", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
        }),
      ),
    ).toBe("PARTNER_EPC");
  });

  it("returns OUTSOURCED_INC for attach_outsourced source", () => {
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          source: "attach_outsourced",
          attachToProjectId: "P-001",
        }),
      ),
    ).toBe("OUTSOURCED_INC");
  });

  it("falls back to SOLO_EPC when no lead path or source-specific kind is set", () => {
    expect(deriveProjectKind(createInitialCreateProjectWizardState())).toBe("SOLO_EPC");
    expect(
      deriveProjectKind(
        createInitialCreateProjectWizardState({
          source: "direct_exception",
          directExceptionReason: "Pending kind selection",
        }),
      ),
    ).toBe("SOLO_EPC");
  });
});

describe("isStepVisible", () => {
  const visible = (partial: Parameters<typeof createInitialCreateProjectWizardState>[0]) =>
    WIZARD_STEPS.map((step) => (isStepVisible(step, createInitialCreateProjectWizardState(partial)) ? step : null)).filter(
      Boolean,
    ) as WizardStep[];

  it("shows SOURCE only until project selected, then CUSTOMER and COMMERCIAL for attach_outsourced", () => {
    expect(
      getVisibleWizardSteps(createInitialCreateProjectWizardState({ source: "attach_outsourced" })),
    ).toEqual(["SOURCE"]);
    expect(
      getVisibleWizardSteps(
        createInitialCreateProjectWizardState({
          source: "attach_outsourced",
          attachToProjectId: "P-001",
        }),
      ),
    ).toEqual(["SOURCE", "CUSTOMER", "COMMERCIAL"]);
    expect(isLeadPathResolved(createInitialCreateProjectWizardState({ source: "attach_outsourced" }))).toBe(false);
    expect(
      isLeadPathResolved(
        createInitialCreateProjectWizardState({
          source: "attach_outsourced",
          attachToProjectId: "P-001",
        }),
      ),
    ).toBe(true);
  });

  it("hides post-lead steps until lead path is selected on new project flow", () => {
    const unset = createInitialCreateProjectWizardState({ source: "new" });
    expect(visible({ source: "new" })).toEqual(["SOURCE", "LEAD_PATH"]);
    expect(isStepVisible("CUSTOMER", unset)).toBe(false);
    expect(isStepVisible("COMMERCIAL", unset)).toBe(false);
    expect(isStepVisible("VENDORSHIP", unset)).toBe(false);
    expect(isStepVisible("AGENT", unset)).toBe(false);
    expect(isStepVisible("TEAM", unset)).toBe(false);
  });

  it("shows full MSS direct flow including vendorship, agent, and team", () => {
    expect(visible({ source: "new", leadPath: "MSS_DIRECT" })).toEqual([
      "SOURCE",
      "LEAD_PATH",
      "CUSTOMER",
      "COMMERCIAL",
      "VENDORSHIP",
      "AGENT",
      "TEAM",
    ]);
  });

  it("shows partner flow with vendorship for profit_share and fixed_rate", () => {
    for (const partnerType of ["profit_share", "fixed_rate"] as const) {
      expect(visible({ source: "new", leadPath: "PARTNER", partnerType })).toContain("VENDORSHIP");
    }
  });

  it("shows vendorship for vendor_channel (VENDOR_NETWORK kind)", () => {
    expect(
      isVendorshipStepApplicable(
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "vendor_channel",
        }),
      ),
    ).toBe(true);
    expect(visible({ source: "new", leadPath: "PARTNER", partnerType: "vendor_channel" })).toContain("VENDORSHIP");
  });

  it("hides vendorship for INC_GIVEN, OUTSOURCED_INC, and vendorship_only", () => {
    expect(visible({ source: "new", leadPath: "INC_GIVEN" })).toEqual([
      "SOURCE",
      "LEAD_PATH",
      "CUSTOMER",
      "COMMERCIAL",
      "AGENT",
      "TEAM",
    ]);
    expect(visible({ source: "new", leadPath: "OUTSOURCED_INC" })).toEqual([
      "SOURCE",
      "LEAD_PATH",
      "CUSTOMER",
      "COMMERCIAL",
      "AGENT",
      "TEAM",
    ]);
    expect(visible({ source: "new", leadPath: "PARTNER", partnerType: "vendorship_only" })).toEqual([
      "SOURCE",
      "LEAD_PATH",
      "CUSTOMER",
      "COMMERCIAL",
      "AGENT",
      "TEAM",
    ]);
  });

  it("skips LEAD_PATH for quotation source but shows downstream steps", () => {
    expect(visible({ source: "quotation", selectedQuotationId: "Q-001" })).toEqual([
      "SOURCE",
      "CUSTOMER",
      "COMMERCIAL",
      "VENDORSHIP",
      "AGENT",
      "TEAM",
    ]);
  });

  it("skips LEAD_PATH for direct_exception once project kind is chosen", () => {
    expect(
      visible({
        source: "direct_exception",
        directExceptionReason: "Urgent",
        directExceptionProjectKind: "PARTNER_EPC",
      }),
    ).toEqual(["SOURCE", "CUSTOMER", "COMMERCIAL", "VENDORSHIP", "AGENT", "TEAM"]);

    expect(
      visible({
        source: "direct_exception",
        directExceptionReason: "Urgent",
        directExceptionProjectKind: "INC_GIVEN",
      }),
    ).toEqual(["SOURCE", "CUSTOMER", "COMMERCIAL", "AGENT", "TEAM"]);
  });

  it("keeps only SOURCE on direct_exception until project kind is selected", () => {
    expect(
      visible({
        source: "direct_exception",
        directExceptionReason: "Pending kind",
      }),
    ).toEqual(["SOURCE"]);
  });

  it("always shows agent and team when lead path is resolved", () => {
    for (const leadPath of ["MSS_DIRECT", "INC_GIVEN", "OUTSOURCED_INC"] as const) {
      const state = createInitialCreateProjectWizardState({ source: "new", leadPath });
      expect(isStepVisible("AGENT", state)).toBe(true);
      expect(isStepVisible("TEAM", state)).toBe(true);
    }
  });

  it("getVisibleWizardSteps matches isStepVisible for every kind", () => {
    const scenarios: Partial<CreateProjectWizardState>[] = [
      { source: "new" },
      { source: "new", leadPath: "MSS_DIRECT" },
      { source: "new", leadPath: "PARTNER", partnerType: "profit_share" },
      { source: "quotation", selectedQuotationId: "Q-1" },
      { source: "direct_exception", directExceptionProjectKind: "INC" },
      { source: "attach_outsourced", attachToProjectId: "P-1" },
    ];

    for (const partial of scenarios) {
      const state = createInitialCreateProjectWizardState(partial);
      expect(getVisibleWizardSteps(state)).toEqual(WIZARD_STEPS.filter((s) => isStepVisible(s, state)));
    }
  });
});

describe("validateWizardStep", () => {
  const errFields = (
    step: WizardStep,
    state: CreateProjectWizardState,
    context?: Parameters<typeof validateWizardStep>[2],
  ) => validateWizardStep(step, state, context).map((e) => e.field);

  it("returns no errors for a valid MSS direct flow", () => {
    const state = createInitialCreateProjectWizardState({
      source: "new",
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

  it("SOURCE: requires direct exception reason and deal kind", () => {
    expect(errFields("SOURCE", createInitialCreateProjectWizardState({ source: "direct_exception" }))).toEqual(
      expect.arrayContaining(["directExceptionReason", "directExceptionProjectKind"]),
    );
  });

  it("SOURCE: requires quotation id and eligibility", () => {
    expect(
      errFields("SOURCE", createInitialCreateProjectWizardState({ source: "quotation" })),
    ).toContain("selectedQuotationId");

    expect(
      errFields(
        "SOURCE",
        createInitialCreateProjectWizardState({ source: "quotation", selectedQuotationId: "Q-1" }),
        { quotations: [{ id: "Q-1", status: "sent" }] },
      ),
    ).toContain("selectedQuotationId");

    expect(
      validateWizardStep(
        "SOURCE",
        createInitialCreateProjectWizardState({ source: "quotation", selectedQuotationId: "Q-1" }),
        { quotations: [{ id: "Q-1", status: "approved" }] },
      ),
    ).toEqual([]);
  });

  it("SOURCE: requires attach target project", () => {
    expect(
      errFields("SOURCE", createInitialCreateProjectWizardState({ source: "attach_outsourced" })),
    ).toContain("attachToProjectId");
  });

  it("LEAD_PATH: requires lead path and partner fields", () => {
    expect(errFields("LEAD_PATH", createInitialCreateProjectWizardState({ source: "new" }))).toContain("leadPath");

    expect(
      errFields(
        "LEAD_PATH",
        createInitialCreateProjectWizardState({ source: "new", leadPath: "PARTNER" }),
      ),
    ).toContain("partnerType");

    expect(
      errFields(
        "LEAD_PATH",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        }),
      ),
    ).toContain("selectedPartnerId");
  });

  it("CUSTOMER: validates per effective lead path", () => {
    expect(
      errFields(
        "CUSTOMER",
        createInitialCreateProjectWizardState({ source: "new", leadPath: "MSS_DIRECT", customerMode: "select" }),
      ),
    ).toContain("selectedCustomerId");

    expect(
      errFields(
        "CUSTOMER",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        }),
      ),
    ).toContain("partnerCustomerName");

    expect(
      errFields(
        "CUSTOMER",
        createInitialCreateProjectWizardState({ source: "new", leadPath: "INC_GIVEN" }),
      ),
    ).toContain("incGiverCompanyId");

    expect(
      errFields(
        "CUSTOMER",
        createInitialCreateProjectWizardState({ source: "new", leadPath: "OUTSOURCED_INC" }),
      ),
    ).toEqual(expect.arrayContaining(["selectedCustomerId", "selectedSubcontractorId"]));
  });

  it("COMMERCIAL: validates contract, capacity, payment loan, and partner economics", () => {
    expect(
      errFields(
        "COMMERCIAL",
        createInitialCreateProjectWizardState({ source: "new", leadPath: "MSS_DIRECT" }),
      ),
    ).toEqual(expect.arrayContaining(["projectName", "capacity", "contractAmount"]));

    expect(
      errFields(
        "COMMERCIAL",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          projectName: "Test",
          capacity: "5 kW",
          contractAmount: 100,
          paymentType: "loan",
        }),
      ),
    ).toContain("fundingLoanId");

    expect(
      errFields(
        "COMMERCIAL",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          partnerProjectName: "Deal",
          partnerCapacity: "10 kW",
          partnerContractAmount: 500000,
          profitSharePercent: 150,
        }),
      ),
    ).toContain("profitSharePercent");

    expect(
      errFields(
        "COMMERCIAL",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "fixed_rate",
          partnerProjectName: "Deal",
          partnerCapacity: "10 kW",
          partnerContractAmount: 500000,
          fixedRatePerKw: 0,
        }),
      ),
    ).toContain("fixedRatePerKw");

    expect(
      errFields(
        "COMMERCIAL",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "INC_GIVEN",
          rateBasis: "per_kw",
          rateValue: 0,
          incCapacity: "5",
        }),
      ),
    ).toContain("rateValue");
  });

  it("VENDORSHIP: requires third-party company and fee", () => {
    expect(
      errFields(
        "VENDORSHIP",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          vendorshipChoice: "THIRD_PARTY",
        }),
      ),
    ).toEqual(expect.arrayContaining(["vendorshipCompanyId", "vendorshipFeeAmount"]));

    expect(
      errFields(
        "VENDORSHIP",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          partnerVendorshipChoice: "THIRD_PARTY",
        }),
      ),
    ).toEqual(expect.arrayContaining(["partnerThirdPartyCompanyId", "partnerVendorshipFeeAmount"]));
  });

  it("AGENT: validates commission range when agent is selected", () => {
    expect(
      errFields(
        "AGENT",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          selectedAgentId: "A-1",
          commissionRatePct: 120,
        }),
      ),
    ).toContain("commissionRatePct");
  });

  it("TEAM: rejects end date before today when assignee is set", () => {
    expect(
      errFields(
        "TEAM",
        createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          primaryAssigneeId: "EMP-1",
          targetEndDate: "2020-01-01",
        }),
        { today: "2026-05-22" },
      ),
    ).toContain("targetEndDate");
  });

  it("skips validation for invisible steps", () => {
    expect(validateWizardStep("LEAD_PATH", createInitialCreateProjectWizardState({ source: "quotation" }))).toEqual(
      [],
    );
    expect(
      validateWizardStep("VENDORSHIP", createInitialCreateProjectWizardState({ source: "new", leadPath: "INC_GIVEN" })),
    ).toEqual([]);
  });
});
