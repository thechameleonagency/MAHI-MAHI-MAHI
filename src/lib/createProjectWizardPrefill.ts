import { buildQuotationToProjectDraft } from "@/lib/createFromContext";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";
import { isQuotationConverted } from "@/lib/quotationProjectLink";
import type { Customer } from "@/types/finance";
import type { Quotation, Project } from "@/types/project";
import type {
  CreateProjectWizardLeadPath,
  CreateProjectWizardSource,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

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
  return {
    source,
    selectedQuotationId: undefined,
    directExceptionReason: undefined,
    directExceptionProjectKind: undefined,
    attachToProjectId: undefined,
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
    source: "quotation",
    selectedQuotationId: quotation.id,
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
  return {
    leadPath,
    partnerType: undefined,
    selectedPartnerId: undefined,
    outsourceMode: leadPath === "OUTSOURCED_INC" ? "new" : undefined,
  };
}
