import { buildQuotationPrefillPatch } from "@/lib/createProjectWizardPrefill";
import { syncFlowAndSource } from "@/lib/wizardFlow";
import type { ProjectDraftFromCustomer } from "@/lib/createFromContext";
import type { Customer } from "@/types/finance";
import type { Quotation } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export function buildWizardInitialStateFromCustomerDraft(
  draft: ProjectDraftFromCustomer,
): Partial<CreateProjectWizardState> {
  return syncFlowAndSource({
    flow: "intake",
    source: "new",
    leadPath: "MSS_DIRECT",
    customerMode: "select",
    selectedCustomerId: draft.customerId,
    projectName: `${draft.customerName} – Project`,
    newCustomerName: undefined,
    newCustomerPhone: undefined,
    newCustomerEmail: undefined,
    newCustomerAddress: undefined,
  });
}

export function buildWizardInitialStateFromQuotation(
  quotation: Quotation,
  customer?: Customer,
): Partial<CreateProjectWizardState> {
  return buildQuotationPrefillPatch(quotation, customer);
}

export function buildWizardInitialState(options: {
  prefillQuotationId?: string;
  prefillCustomerDraft?: ProjectDraftFromCustomer;
  quotations?: Quotation[];
  customers?: Customer[];
}): Partial<CreateProjectWizardState> | undefined {
  if (options.prefillQuotationId && options.quotations) {
    const quotation = options.quotations.find((q) => q.id === options.prefillQuotationId);
    if (!quotation) return undefined;
    const customer = quotation.customerId
      ? options.customers?.find((c) => c.id === quotation.customerId)
      : undefined;
    return buildWizardInitialStateFromQuotation(quotation, customer);
  }

  if (options.prefillCustomerDraft) {
    return buildWizardInitialStateFromCustomerDraft(options.prefillCustomerDraft);
  }

  return undefined;
}
