import type { ProjectKind } from "@/domain/projectTypes/types";

/** Step 1 — how the project enters the wizard. */
export type CreateProjectWizardSource =
  | "new"
  | "quotation"
  | "direct_exception"
  | "attach_outsourced";

/** Step 2 — deal structure (maps to {@link ProjectKind} via derivation). */
export type CreateProjectWizardLeadPath =
  | "MSS_DIRECT"
  | "PARTNER"
  | "INC_GIVEN"
  | "OUTSOURCED_INC";

/** Partner-network sub-type when {@link CreateProjectWizardLeadPath} is `PARTNER`. */
export type CreateProjectWizardPartnerType =
  | "profit_share"
  | "fixed_rate"
  | "vendor_channel"
  | "vendorship_only";

export type CreateProjectWizardProjectType = "Residential" | "Commercial" | "Industrial";
export type CreateProjectWizardProjectCategory = "solar" | "other";
export type CreateProjectWizardPaymentType = "cash" | "loan" | "cash-and-loan";
export type CreateProjectWizardCustomerMode = "select" | "add";
export type CreateProjectWizardVendorshipChoice = "OUR_CODE" | "THIRD_PARTY";
export type CreateProjectWizardBillingParty = "MSS" | "PARTNER";
export type CreateProjectWizardIncScope = "labour" | "labour_and_materials";
export type CreateProjectWizardRateBasis = "per_kw" | "per_sqft" | "fixed";
export type CreateProjectWizardOutsourceMode = "existing" | "new";

/** Ordered wizard steps (Issue 1.1). */
export const WIZARD_STEPS = [
  "SOURCE",
  "LEAD_PATH",
  "CUSTOMER",
  "COMMERCIAL",
  "VENDORSHIP",
  "AGENT",
  "TEAM",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

/** Human-readable step labels for the wizard chrome. */
export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  SOURCE: "Source",
  LEAD_PATH: "Deal structure",
  CUSTOMER: "Customer",
  COMMERCIAL: "Commercial",
  VENDORSHIP: "Vendorship & GST",
  AGENT: "Agent",
  TEAM: "Team",
};

/**
 * Unified create-project wizard state — single source of truth for all entry paths.
 */
export interface CreateProjectWizardState {
  // --- Step 1: Source ---
  source: CreateProjectWizardSource;
  selectedQuotationId?: string;
  directExceptionReason?: string;
  /** Direct-exception dialog allows explicit kind selection (all 8 kinds). */
  directExceptionProjectKind?: ProjectKind;
  /** Outsourced INC — attach subcontract scope to an existing project. */
  attachToProjectId?: string;
  outsourceMode?: CreateProjectWizardOutsourceMode;

  // --- Step 2: Lead / deal structure ---
  leadPath?: CreateProjectWizardLeadPath;
  partnerType?: CreateProjectWizardPartnerType;

  // --- Step 3: Customer & location ---
  customerMode?: CreateProjectWizardCustomerMode;
  selectedCustomerId?: string;
  newCustomerName?: string;
  newCustomerPhone?: string;
  newCustomerEmail?: string;
  newCustomerAddress?: string;
  /** Site / service location (distinct from CRM address on direct-exception path). */
  location?: string;
  kNumber?: string;

  /** Partner-path end customer label (may differ from CRM customer row). */
  partnerCustomerName?: string;

  incGiverCompanyId?: string;
  incAddress?: string;

  selectedSubcontractorId?: string;
  outsourceRateBasis?: CreateProjectWizardRateBasis;
  outsourceRateValue?: number;
  outsourceQuantity?: number;
  outsourceNotes?: string;

  // --- Step 4: Commercial ---
  projectName?: string;
  /** Partner lead path may capture a separate display name before merge. */
  partnerProjectName?: string;
  incProjectName?: string;
  projectType?: CreateProjectWizardProjectType;
  partnerProjectType?: CreateProjectWizardProjectType;
  projectCategory?: CreateProjectWizardProjectCategory;
  capacity?: string;
  partnerCapacity?: string;
  incCapacity?: string;
  incArea?: string;
  contractAmount?: number;
  partnerContractAmount?: number;
  internalCostEstimate?: number;
  paymentType?: CreateProjectWizardPaymentType;
  fundingLoanId?: string;

  selectedPartnerId?: string;
  profitSharePercent?: number;
  fixedRatePerKw?: number;
  backendPrice?: number;
  partnerSellPrice?: number;
  commissionRule?: string;
  /** SOLO / direct-exception vendor or DISCOM of record. */
  vendorOrDiscom?: string;
  /** Vendor-channel free-text parties (direct-exception dialog). */
  channelPartnerName?: string;
  externalNetworkName?: string;

  rateBasis?: CreateProjectWizardRateBasis;
  /** Primary INC rate input (per-kW, per-sqft, or fixed lump sum). */
  rateValue?: number;
  /** Additional INC rate inputs keyed by basis-specific field id. */
  incRateInputs?: Record<string, number>;
  incFixedAmount?: number;
  incScope?: CreateProjectWizardIncScope;

  // --- Step 5: Vendorship & GST ---
  vendorshipChoice?: CreateProjectWizardVendorshipChoice;
  vendorshipCompanyId?: string;
  vendorshipFeeAmount?: number;
  partnerVendorshipChoice?: CreateProjectWizardVendorshipChoice;
  partnerThirdPartyCompanyId?: string;
  partnerVendorshipFeeAmount?: number;
  billingParty?: CreateProjectWizardBillingParty;
  partnerGstInvoice?: "yes" | "no";

  // --- Step 6: Agent ---
  selectedAgentId?: string;
  commissionRatePct?: number;

  // --- Step 7: Team ---
  primaryAssigneeId?: string;
  targetEndDate?: string;
}

/** Whether a wizard field should render for the current selections. */
export type WizardFieldVisibilityPredicate = (
  state: CreateProjectWizardState,
) => boolean;

/** Registry of field visibility predicates keyed by wizard state field. */
export type WizardVisibility = Partial<
  Record<keyof CreateProjectWizardState, WizardFieldVisibilityPredicate>
>;

export interface WizardValidationError {
  field: string;
  message: string;
}

/** Validates one wizard step; returns inline field errors (Issue 1.2 implements). */
export type WizardStepValidator = (
  state: CreateProjectWizardState,
) => WizardValidationError[];

/** Per-step validation registry. */
export type WizardValidation = Record<WizardStep, WizardStepValidator>;

/** Default wizard state — `source: "new"`, no lead path selected yet. */
export function createInitialCreateProjectWizardState(
  overrides?: Partial<CreateProjectWizardState>,
): CreateProjectWizardState {
  return {
    source: "new",
    customerMode: "select",
    vendorshipChoice: "OUR_CODE",
    partnerVendorshipChoice: "OUR_CODE",
    billingParty: "MSS",
    partnerGstInvoice: "yes",
    outsourceMode: "existing",
    projectCategory: "solar",
    projectType: "Residential",
    partnerProjectType: "Residential",
    rateBasis: "per_kw",
    outsourceRateBasis: "fixed",
    ...overrides,
  };
}
