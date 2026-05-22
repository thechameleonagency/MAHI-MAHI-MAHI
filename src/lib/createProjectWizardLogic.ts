import type { ProjectKind } from "@/domain/projectTypes/types";
import type {
  CreateProjectWizardLeadPath,
  CreateProjectWizardPartnerType,
  CreateProjectWizardState,
  WizardStep,
  WizardValidationError,
} from "@/types/createProjectWizard";
import { WIZARD_STEPS, createInitialCreateProjectWizardState } from "@/types/createProjectWizard";

/** Optional catalog data for cross-entity validation (quotation eligibility, dates). */
export type ValidateWizardContext = {
  quotations?: Array<{ id: string; status: string; linkedProjectId?: string | null }>;
  /** ISO date `YYYY-MM-DD` — defaults to today when validating TEAM step. */
  today?: string;
};

function pushError(
  errors: WizardValidationError[],
  field: string,
  message: string,
): void {
  errors.push({ field, message });
}

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parsePositive(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePercent(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function isQuotationEligible(quotation: { status: string; linkedProjectId?: string | null }): boolean {
  return quotation.status === "approved" && !trim(quotation.linkedProjectId ?? undefined);
}

/** Lead path used for customer/commercial validation (quotation & direct exception map to equivalents). */
export function effectiveLeadPath(
  state: CreateProjectWizardState,
): CreateProjectWizardLeadPath | undefined {
  if (state.source === "quotation") {
    return "MSS_DIRECT";
  }
  if (state.source === "new") {
    return state.leadPath;
  }
  if (state.source === "direct_exception" && state.directExceptionProjectKind) {
    switch (state.directExceptionProjectKind) {
      case "SOLO_EPC":
      case "INC":
        return "MSS_DIRECT";
      case "PARTNER_EPC":
      case "FIXED_EPC":
      case "VENDOR_NETWORK":
      case "VENDORSHIP_ONLY":
        return "PARTNER";
      case "INC_GIVEN":
        return "INC_GIVEN";
      case "OUTSOURCED_INC":
        return "OUTSOURCED_INC";
      default:
        return undefined;
    }
  }
  return state.leadPath;
}

/** Partner sub-type for validation when deal structure comes from direct-exception kind. */
export function effectivePartnerType(
  state: CreateProjectWizardState,
): CreateProjectWizardPartnerType | undefined {
  if (state.leadPath === "PARTNER" && state.partnerType) {
    return state.partnerType;
  }
  if (state.source === "direct_exception" && state.directExceptionProjectKind) {
    switch (state.directExceptionProjectKind) {
      case "PARTNER_EPC":
        return "profit_share";
      case "FIXED_EPC":
        return "fixed_rate";
      case "VENDOR_NETWORK":
        return "vendor_channel";
      case "VENDORSHIP_ONLY":
        return "vendorship_only";
      default:
        return undefined;
    }
  }
  return state.partnerType;
}

/** INC Given computed contract total (matches legacy create-project rate logic). */
export function computeIncGivenTotal(state: CreateProjectWizardState): number {
  const basis = state.rateBasis ?? "per_kw";
  if (basis === "fixed") {
    return parsePositive(state.incFixedAmount ?? state.rateValue);
  }
  if (basis === "per_kw") {
    return parsePositive(state.rateValue) * parsePositive(state.incCapacity) * 1000;
  }
  if (basis === "per_sqft") {
    return parsePositive(state.rateValue) * parsePositive(state.incArea);
  }
  const fromInputs = state.incRateInputs
    ? Object.values(state.incRateInputs).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
    : 0;
  return fromInputs > 0 ? fromInputs : 0;
}

export function isAttachOutsourcedSource(state: CreateProjectWizardState): boolean {
  return state.source === "attach_outsourced";
}

/** Computed outsource total when attaching INC scope to an existing project. */
export function computeOutsourceAttachTotal(
  state: CreateProjectWizardState,
  targetCapacity?: string,
): number {
  const basis = state.outsourceRateBasis ?? "fixed";
  const rate = parsePositive(state.outsourceRateValue);
  if (rate <= 0) return 0;
  if (basis === "fixed") return rate;
  const qty =
    parsePositive(state.outsourceQuantity) ||
    (basis === "per_kw" && targetCapacity
      ? parsePositive(targetCapacity.replace(/[^\d.]/g, ""))
      : 0);
  return qty > 0 ? rate * qty : 0;
}

function validateSourceStep(
  state: CreateProjectWizardState,
  context?: ValidateWizardContext,
): WizardValidationError[] {
  const errors: WizardValidationError[] = [];

  switch (state.source) {
    case "direct_exception":
      if (!trim(state.directExceptionReason)) {
        pushError(errors, "directExceptionReason", "Direct exception reason is required.");
      }
      if (!state.directExceptionProjectKind) {
        pushError(errors, "directExceptionProjectKind", "Select a deal kind for this exception.");
      }
      break;
    case "quotation":
      if (!trim(state.selectedQuotationId)) {
        pushError(errors, "selectedQuotationId", "Select an approved quotation.");
      } else if (context?.quotations) {
        const quotation = context.quotations.find((q) => q.id === state.selectedQuotationId);
        if (!quotation) {
          pushError(errors, "selectedQuotationId", "Selected quotation was not found.");
        } else if (!isQuotationEligible(quotation)) {
          pushError(
            errors,
            "selectedQuotationId",
            "Quotation must be approved and not already converted to a project.",
          );
        }
      }
      break;
    case "attach_outsourced":
      if (!trim(state.attachToProjectId)) {
        pushError(errors, "attachToProjectId", "Select a project to attach outsourced INC work to.");
      }
      break;
    default:
      break;
  }

  return errors;
}

function validateLeadPathStep(state: CreateProjectWizardState): WizardValidationError[] {
  const errors: WizardValidationError[] = [];

  if (!state.leadPath) {
    pushError(errors, "leadPath", "Select how this project came to you.");
    return errors;
  }

  if (state.leadPath === "PARTNER") {
    if (!state.partnerType) {
      pushError(errors, "partnerType", "Select a partner network type.");
    }
    const partnerType = state.partnerType;
    if (
      partnerType === "profit_share" ||
      partnerType === "fixed_rate"
    ) {
      if (!trim(state.selectedPartnerId)) {
        pushError(errors, "selectedPartnerId", "Select the partner who brought this deal.");
      }
    }
  }

  return errors;
}

function validateCustomerStep(state: CreateProjectWizardState): WizardValidationError[] {
  const errors: WizardValidationError[] = [];

  if (isAttachOutsourcedSource(state)) {
    if (!trim(state.selectedSubcontractorId)) {
      pushError(errors, "selectedSubcontractorId", "Select the installation subcontractor.");
    }
    return errors;
  }

  const lead = effectiveLeadPath(state);

  switch (lead) {
    case "MSS_DIRECT":
      if (!state.customerMode) {
        pushError(errors, "customerMode", "Choose whether to select or add a customer.");
      } else if (state.customerMode === "select") {
        if (!trim(state.selectedCustomerId)) {
          pushError(errors, "selectedCustomerId", "Select an existing customer.");
        }
      } else if (!trim(state.newCustomerName)) {
        pushError(errors, "newCustomerName", "Customer name is required.");
      }
      break;
    case "PARTNER":
      if (!trim(state.partnerCustomerName)) {
        pushError(errors, "partnerCustomerName", "Enter the end-customer name for this partner project.");
      }
      break;
    case "INC_GIVEN":
      if (!trim(state.incGiverCompanyId)) {
        pushError(errors, "incGiverCompanyId", "Select the company giving you this INC work.");
      }
      break;
    case "OUTSOURCED_INC":
      if (!trim(state.selectedCustomerId)) {
        pushError(errors, "selectedCustomerId", "Select the customer for this outsourced INC project.");
      }
      if (!trim(state.selectedSubcontractorId)) {
        pushError(errors, "selectedSubcontractorId", "Select the installation subcontractor.");
      }
      break;
    default:
      break;
  }

  return errors;
}

function validateCommercialStep(state: CreateProjectWizardState): WizardValidationError[] {
  const errors: WizardValidationError[] = [];

  if (isAttachOutsourcedSource(state)) {
    const rate = parsePositive(state.outsourceRateValue);
    if (rate <= 0) {
      pushError(errors, "outsourceRateValue", "Enter a positive outsource rate or amount.");
    }
    const basis = state.outsourceRateBasis ?? "fixed";
    if (basis !== "fixed" && parsePositive(state.outsourceQuantity) <= 0) {
      pushError(errors, "outsourceQuantity", "Enter a positive quantity.");
    }
    return errors;
  }

  const lead = effectiveLeadPath(state);
  const partnerType = effectivePartnerType(state);

  if (lead === "PARTNER") {
    const name = trim(state.partnerProjectName) || trim(state.projectName);
    const capacity = trim(state.partnerCapacity) || trim(state.capacity);
    const amount = parsePositive(state.partnerContractAmount ?? state.contractAmount);

    if (!name) {
      pushError(errors, "partnerProjectName", "Project name is required.");
    }
    if (!capacity) {
      pushError(errors, "partnerCapacity", "Capacity is required.");
    }
    if (amount <= 0) {
      pushError(errors, "partnerContractAmount", "Enter a positive contract amount.");
    }

    if (partnerType === "profit_share") {
      const pct = parsePercent(state.profitSharePercent);
      if (pct === null || pct < 0 || pct > 100) {
        pushError(errors, "profitSharePercent", "Enter a profit share percentage between 0 and 100.");
      }
    }
    if (partnerType === "fixed_rate") {
      const rate = parsePositive(state.fixedRatePerKw);
      if (rate <= 0) {
        pushError(errors, "fixedRatePerKw", "Enter a positive fixed rate per kW.");
      }
    }
  } else if (lead === "INC_GIVEN") {
    if (computeIncGivenTotal(state) <= 0) {
      pushError(
        errors,
        "rateValue",
        "Enter rates and quantities so the computed contract total is positive.",
      );
    }
  } else if (lead === "MSS_DIRECT" || lead === "OUTSOURCED_INC") {
    if (!trim(state.projectName)) {
      pushError(errors, "projectName", "Project name is required.");
    }
    if (!trim(state.capacity)) {
      pushError(errors, "capacity", "Capacity is required.");
    }
    if (parsePositive(state.contractAmount) <= 0) {
      pushError(errors, "contractAmount", "Enter a positive contract amount.");
    }

    if (
      (state.paymentType === "loan" || state.paymentType === "cash-and-loan") &&
      !trim(state.fundingLoanId)
    ) {
      pushError(errors, "fundingLoanId", "Select which loan funds this project.");
    }
  }

  return errors;
}

function validateVendorshipStep(state: CreateProjectWizardState): WizardValidationError[] {
  const errors: WizardValidationError[] = [];
  const lead = effectiveLeadPath(state);

  if (lead === "MSS_DIRECT" || state.source === "quotation") {
    if (state.vendorshipChoice === "THIRD_PARTY") {
      if (!trim(state.vendorshipCompanyId)) {
        pushError(errors, "vendorshipCompanyId", "Select a vendorship company.");
      }
      if (parsePositive(state.vendorshipFeeAmount) <= 0) {
        pushError(errors, "vendorshipFeeAmount", "Enter the vendorship fee amount.");
      }
    }
  }

  if (lead === "PARTNER" && state.partnerVendorshipChoice === "THIRD_PARTY") {
    if (!trim(state.partnerThirdPartyCompanyId)) {
      pushError(errors, "partnerThirdPartyCompanyId", "Select a third-party vendorship company.");
    }
    if (parsePositive(state.partnerVendorshipFeeAmount) <= 0) {
      pushError(errors, "partnerVendorshipFeeAmount", "Enter the partner vendorship fee amount.");
    }
  }

  return errors;
}

function validateAgentStep(state: CreateProjectWizardState): WizardValidationError[] {
  const errors: WizardValidationError[] = [];

  if (trim(state.selectedAgentId) && state.commissionRatePct !== undefined && state.commissionRatePct !== null) {
    const commission =
      typeof state.commissionRatePct === "number"
        ? state.commissionRatePct
        : trim(String(state.commissionRatePct))
          ? Number.parseFloat(String(state.commissionRatePct))
          : null;
    if (commission !== null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
      pushError(errors, "commissionRatePct", "Agent commission must be between 0 and 100.");
    }
  }

  return errors;
}

function validateTeamStep(
  state: CreateProjectWizardState,
  context?: ValidateWizardContext,
): WizardValidationError[] {
  const errors: WizardValidationError[] = [];
  const endDate = trim(state.targetEndDate);
  const assignee = trim(state.primaryAssigneeId);

  if (endDate && assignee) {
    const today = context?.today ?? new Date().toISOString().slice(0, 10);
    if (endDate < today) {
      pushError(errors, "targetEndDate", "Target end date cannot be before today.");
    }
  }

  return errors;
}

/**
 * Validate a single wizard step. Returns inline field errors (empty when valid).
 * Invisible steps short-circuit to no errors.
 */
export function validateWizardStep(
  step: WizardStep,
  state: CreateProjectWizardState,
  context?: ValidateWizardContext,
): WizardValidationError[] {
  if (!isStepVisible(step, state)) {
    return [];
  }

  switch (step) {
    case "SOURCE":
      return validateSourceStep(state, context);
    case "LEAD_PATH":
      return validateLeadPathStep(state);
    case "CUSTOMER":
      return validateCustomerStep(state);
    case "COMMERCIAL":
      return validateCommercialStep(state);
    case "VENDORSHIP":
      return validateVendorshipStep(state);
    case "AGENT":
      return validateAgentStep(state);
    case "TEAM":
      return validateTeamStep(state, context);
    default:
      return [];
  }
}

/** Validate every currently visible step (for final Create gate). */
export function validateVisibleWizardSteps(
  state: CreateProjectWizardState,
  context?: ValidateWizardContext,
): WizardValidationError[] {
  return getVisibleWizardSteps(state).flatMap((step) => validateWizardStep(step, state, context));
}

/**
 * Maps wizard selections to the legacy {@link ProjectKind} used by command handlers.
 *
 * Priority:
 * 1. Quotation source → always SOLO_EPC (quotation conversion path).
 * 2. Direct exception → explicit `directExceptionProjectKind` when set (all 8 kinds).
 * 3. Attach outsourced → OUTSOURCED_INC (subcontract attach / create flow).
 * 4. Lead path + partner sub-type → derived kind.
 */
export function deriveProjectKind(state: CreateProjectWizardState): ProjectKind {
  if (state.source === "quotation") {
    return "SOLO_EPC";
  }

  if (state.source === "direct_exception" && state.directExceptionProjectKind) {
    return state.directExceptionProjectKind;
  }

  if (state.source === "attach_outsourced") {
    return "OUTSOURCED_INC";
  }

  if (state.leadPath === "MSS_DIRECT") {
    return "SOLO_EPC";
  }

  if (state.leadPath === "PARTNER") {
    switch (state.partnerType) {
      case "fixed_rate":
        return "FIXED_EPC";
      case "vendor_channel":
        return "VENDOR_NETWORK";
      case "vendorship_only":
        return "VENDORSHIP_ONLY";
      case "profit_share":
        return "PARTNER_EPC";
      default:
        return "PARTNER_EPC";
    }
  }

  if (state.leadPath === "INC_GIVEN") {
    return "INC_GIVEN";
  }

  if (state.leadPath === "OUTSOURCED_INC") {
    return "OUTSOURCED_INC";
  }

  return "SOLO_EPC";
}

/** Whether deal structure is resolved enough to show steps after lead path. */
export function isLeadPathResolved(state: CreateProjectWizardState): boolean {
  if (state.source === "attach_outsourced") {
    return Boolean(trim(state.attachToProjectId));
  }
  if (state.source === "quotation") {
    return true;
  }
  if (state.source === "direct_exception") {
    return Boolean(state.directExceptionProjectKind);
  }
  return Boolean(state.leadPath);
}

const VENDORSHIP_APPLICABLE_KINDS = new Set<ProjectKind>([
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
]);

/** Step 5 — vendorship & GST (not shown for INC-only or vendorship-only fee paths). */
export function isVendorshipStepApplicable(state: CreateProjectWizardState): boolean {
  if (!isLeadPathResolved(state)) {
    return false;
  }
  return VENDORSHIP_APPLICABLE_KINDS.has(deriveProjectKind(state));
}

/**
 * Whether a wizard step should appear in the linear flow for the current selections.
 */
export function isStepVisible(step: WizardStep, state: CreateProjectWizardState): boolean {
  if (state.source === "attach_outsourced") {
    if (step === "SOURCE") return true;
    if (step === "CUSTOMER" || step === "COMMERCIAL") {
      return isLeadPathResolved(state);
    }
    return false;
  }

  switch (step) {
    case "SOURCE":
      return true;

    case "LEAD_PATH":
      return state.source === "new";

    case "CUSTOMER":
    case "COMMERCIAL":
      return isLeadPathResolved(state);

    case "VENDORSHIP":
      return isVendorshipStepApplicable(state);

    case "AGENT":
    case "TEAM":
      return isLeadPathResolved(state);

    default:
      return false;
  }
}

/** Ordered list of steps visible for the current wizard state. */
export function getVisibleWizardSteps(state: CreateProjectWizardState): WizardStep[] {
  return WIZARD_STEPS.filter((step) => isStepVisible(step, state));
}

/** Convenience helper for tests and review panel — merges partial state onto defaults. */
export function deriveProjectKindFromPartial(
  partial: Partial<CreateProjectWizardState>,
): ProjectKind {
  return deriveProjectKind(createInitialCreateProjectWizardState(partial));
}

export type WizardReviewCatalog = {
  customers?: Array<{ id: string; name: string }>;
  incGiverCompanies?: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string; client?: string; capacity?: string }>;
  partners?: Array<{ id: string; name: string }>;
};

function resolveWizardProjectName(state: CreateProjectWizardState): string {
  return (
    trim(state.projectName) ||
    trim(state.partnerProjectName) ||
    trim(state.incProjectName) ||
    "Untitled"
  );
}

function resolveWizardCapacity(state: CreateProjectWizardState): string {
  return trim(state.partnerCapacity) || trim(state.capacity) || trim(state.incCapacity) || "—";
}

function resolveWizardContractAmount(state: CreateProjectWizardState): number | undefined {
  const amount = state.partnerContractAmount ?? state.contractAmount;
  if (amount === undefined || amount === null) return undefined;
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/** Live review-panel client label from wizard state + optional catalogs. */
export function resolveWizardReviewClientLabel(
  state: CreateProjectWizardState,
  catalog?: WizardReviewCatalog,
): string {
  const lead = effectiveLeadPath(state);
  if (lead === "PARTNER" && trim(state.partnerCustomerName)) {
    return trim(state.partnerCustomerName);
  }
  if (lead === "INC_GIVEN" && trim(state.incGiverCompanyId)) {
    const giver = catalog?.incGiverCompanies?.find((c) => c.id === state.incGiverCompanyId);
    return giver?.name ?? "INC giver";
  }
  if (trim(state.newCustomerName)) {
    return trim(state.newCustomerName);
  }
  if (trim(state.selectedCustomerId)) {
    const customer = catalog?.customers?.find((c) => c.id === state.selectedCustomerId);
    return customer?.name ?? "Customer";
  }
  return "—";
}

export interface WizardReviewSummary {
  projectName: string;
  projectKind: ProjectKind;
  clientLabel: string;
  capacity: string;
  contractAmount?: number;
}

export function buildWizardReviewSummary(
  state: CreateProjectWizardState,
  catalog?: WizardReviewCatalog,
): WizardReviewSummary {
  if (isAttachOutsourcedSource(state) && trim(state.attachToProjectId)) {
    const target = catalog?.projects?.find((p) => p.id === state.attachToProjectId);
    const subcontractor = catalog?.partners?.find((p) => p.id === state.selectedSubcontractorId);
    return {
      projectName: target?.name ?? state.attachToProjectId ?? "Attach outsource",
      projectKind: deriveProjectKind(state),
      clientLabel: subcontractor?.name ?? target?.client ?? "—",
      capacity: target?.capacity ?? "—",
      contractAmount: computeOutsourceAttachTotal(state, target?.capacity) || undefined,
    };
  }

  return {
    projectName: resolveWizardProjectName(state),
    projectKind: deriveProjectKind(state),
    clientLabel: resolveWizardReviewClientLabel(state, catalog),
    capacity: resolveWizardCapacity(state),
    contractAmount: resolveWizardContractAmount(state),
  };
}
