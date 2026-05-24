import type { ProjectKind } from "@/domain/projectTypes/types";
import type {
  CreateProjectWizardLeadPath,
  CreateProjectWizardPartnerType,
  CreateProjectWizardSource,
  CreateProjectWizardState,
  WizardFlow,
  WizardStep,
} from "@/types/createProjectWizard";
import { WIZARD_FLOW_STEPS, WIZARD_STEP_LABELS } from "@/types/createProjectWizard";

export function flowFromSource(source: CreateProjectWizardSource): WizardFlow {
  switch (source) {
    case "quotation":
      return "quotation";
    case "direct_exception":
      return "direct_exception";
    case "attach_outsourced":
      return "attach";
    default:
      return "intake";
  }
}

export function sourceFromFlow(flow: WizardFlow): CreateProjectWizardSource {
  switch (flow) {
    case "quotation":
      return "quotation";
    case "direct_exception":
      return "direct_exception";
    case "attach":
      return "attach_outsourced";
    default:
      return "new";
  }
}

export function getWizardFlow(state: CreateProjectWizardState): WizardFlow {
  return state.flow ?? flowFromSource(state.source);
}

export function syncFlowAndSource(
  patch: Partial<CreateProjectWizardState>,
): Partial<CreateProjectWizardState> {
  const next = { ...patch };
  if (next.flow && !next.source) {
    next.source = sourceFromFlow(next.flow);
  }
  if (next.source && !next.flow) {
    next.flow = flowFromSource(next.source);
  }
  return next;
}

export function getInitialWizardStep(flow: WizardFlow): WizardStep {
  return WIZARD_FLOW_STEPS[flow][0]!;
}

/** Map {@link ProjectKind} to legacy lead path + partner sub-type for submit builders. */
export function legacyLeadPathFromDealKind(kind: ProjectKind): {
  leadPath: CreateProjectWizardLeadPath;
  partnerType?: CreateProjectWizardPartnerType;
} {
  switch (kind) {
    case "SOLO_EPC":
    case "INC":
      return { leadPath: "MSS_DIRECT" };
    case "PARTNER_EPC":
      return { leadPath: "PARTNER", partnerType: "profit_share" };
    case "FIXED_EPC":
      return { leadPath: "PARTNER", partnerType: "fixed_rate" };
    case "VENDOR_NETWORK":
      return { leadPath: "PARTNER", partnerType: "vendor_channel" };
    case "VENDORSHIP_ONLY":
      return { leadPath: "PARTNER", partnerType: "vendorship_only" };
    case "INC_GIVEN":
      return { leadPath: "INC_GIVEN" };
    case "OUTSOURCED_INC":
      return { leadPath: "OUTSOURCED_INC" };
    default:
      return { leadPath: "MSS_DIRECT" };
  }
}

export function getWizardStepLabel(step: WizardStep, state: CreateProjectWizardState): string {
  const flow = getWizardFlow(state);
  if (flow === "attach" && step === "ATTACH_PARTIES") {
    return "Project & subcontractor";
  }
  if (flow === "attach" && step === "OUTSOURCE_TERMS") {
    return "Outsource terms";
  }
  if (step === "PARTIES" && flow === "attach") {
    return "Subcontractor";
  }
  if (step === "PARTIES" && flow !== "attach") {
    return "Parties & site";
  }
  return WIZARD_STEP_LABELS[step];
}

export function getWizardFlowSubtitle(state: CreateProjectWizardState): string | undefined {
  const flow = getWizardFlow(state);
  switch (flow) {
    case "quotation":
      return state.selectedQuotationId
        ? `From approved quotation`
        : "Convert quotation to project";
    case "direct_exception":
      return "Direct exception — no quotation required";
    case "attach":
      return "Attach outsourced INC to an existing project";
    default:
      return "New project intake";
  }
}
