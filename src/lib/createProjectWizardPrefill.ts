import type { ProjectKind } from "@/domain/projectTypes/types";
import { buildQuotationToProjectDraft } from "@/lib/createFromContext";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";
import { isQuotationConverted } from "@/lib/quotationProjectLink";
import { legacyLeadPathFromDealKind, syncFlowAndSource } from "@/lib/wizardFlow";
import type { Customer } from "@/types/finance";
import type { Quotation, Project } from "@/types/project";
import type {
  CreateProjectWizardLeadPath,
  CreateProjectWizardPartnerType,
  CreateProjectWizardSource,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

/** Maps user-facing lead path + partner sub-type to command-layer {@link ProjectKind}. */
export function deriveDealKindFromLeadPath(
  leadPath: CreateProjectWizardLeadPath,
  partnerType?: CreateProjectWizardPartnerType,
): ProjectKind {
  if (leadPath === "MSS_DIRECT") return "SOLO_EPC";
  if (leadPath === "PARTNER") {
    switch (partnerType) {
      case "fixed_rate":
        return "FIXED_EPC";
      case "vendor_channel":
        return "VENDOR_NETWORK";
      case "vendorship_only":
        return "VENDORSHIP_ONLY";
      default:
        return "PARTNER_EPC";
    }
  }
  if (leadPath === "INC_GIVEN") return "INC_GIVEN";
  if (leadPath === "OUTSOURCED_INC") return "OUTSOURCED_INC";
  return "SOLO_EPC";
}

/** Approved quotations not yet linked to a project (wizard source step). */
export function filterEligibleWizardQuotations(quotations: Quotation[]): Quotation[] {
  return quotations.filter((q) => q.status === "approved" && !isQuotationConverted(q));
}

/** Open projects eligible for outsourced INC attach. */
export function filterOpenWizardProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.lifecycleStatus !== "Completed");
}

/** Clears source-specific fields when the user switches origin. */
export function buildSourceSelectionResetPatch(
  source: CreateProjectWizardSource,
): Partial<CreateProjectWizardState> {
  return syncFlowAndSource({
    source,
    selectedQuotationId: undefined,
    directExceptionReason: undefined,
    directExceptionProjectKind: undefined,
    dealKind: undefined,
    attachToProjectId: undefined,
    quotationEditDetails: false,
  });
}

/** Clears kind-specific fields when the user switches deal type. */
export function buildDealKindSelectionResetPatch(
  dealKind: ProjectKind,
): Partial<CreateProjectWizardState> {
  const { leadPath, partnerType } = legacyLeadPathFromDealKind(dealKind);
  return {
    dealKind,
    directExceptionProjectKind: dealKind,
    leadPath,
    partnerType,
    selectedPartnerId: undefined,
    outsourceMode: dealKind === "OUTSOURCED_INC" ? "new" : undefined,
  };
}

/**
 * Pre-fill wizard state from an approved quotation.
 * Fields remain editable — enquiry conversion happens on submit, not here.
 */
export function buildQuotationPrefillPatch(
  quotation: Quotation,
  customer?: Customer,
): Partial<CreateProjectWizardState> {
  const draft = buildQuotationToProjectDraft(quotation, customer);
  const patch: Partial<CreateProjectWizardState> = {
    flow: "quotation",
    source: "quotation",
    dealKind: "SOLO_EPC",
    selectedQuotationId: quotation.id,
    quotationEditDetails: false,
    projectName: `${quotation.clientName} – ${quotation.systemCapacity}kW`,
    capacity: quotation.systemCapacity || draft.capacityText || "",
    contractAmount: resolveContractAmount(quotation),
    paymentType: draft.paymentType,
    selectedAgentId: draft.agentId,
  };

  if (draft.customerId) {
    patch.customerMode = "select";
    patch.selectedCustomerId = draft.customerId;
    patch.newCustomerName = undefined;
    patch.newCustomerPhone = undefined;
    patch.newCustomerEmail = undefined;
    patch.newCustomerAddress = undefined;
  } else {
    patch.customerMode = "add";
    patch.selectedCustomerId = undefined;
    patch.newCustomerName = draft.customerName;
    patch.newCustomerPhone = draft.customerPhone;
    patch.newCustomerEmail = draft.customerEmail;
    patch.newCustomerAddress = draft.customerAddress;
  }

  return patch;
}

/** Clears lead-path-specific fields when the user switches deal structure. */
export function buildLeadPathSelectionResetPatch(
  leadPath: CreateProjectWizardLeadPath,
): Partial<CreateProjectWizardState> {
  const dealKind =
    leadPath === "PARTNER" ? undefined : deriveDealKindFromLeadPath(leadPath);
  return {
    leadPath,
    partnerType: undefined,
    dealKind,
    directExceptionProjectKind: dealKind,
    selectedPartnerId: undefined,
    outsourceMode: leadPath === "OUTSOURCED_INC" ? "new" : undefined,
  };
}

/** Partner sub-type selection — syncs derived project kind. */
export function buildPartnerTypeSelectionPatch(
  partnerType: CreateProjectWizardPartnerType,
): Partial<CreateProjectWizardState> {
  const dealKind = deriveDealKindFromLeadPath("PARTNER", partnerType);
  const patch: Partial<CreateProjectWizardState> = {
    partnerType,
    dealKind,
    directExceptionProjectKind: dealKind,
  };
  if (partnerType !== "profit_share" && partnerType !== "fixed_rate") {
    patch.selectedPartnerId = undefined;
  }
  return patch;
}
