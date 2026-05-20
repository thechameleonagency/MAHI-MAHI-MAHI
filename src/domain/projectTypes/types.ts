/**
 * Canonical project taxonomy.
 *
 * Historically the codebase had 8 fine-grained `ProjectKind` values that smushed several axes
 * (lead path, vendorship owner, partner role, execution scope) into a single enum. That made it
 * painful to add new combinations and easy to forget cases.
 *
 * The new model has THREE project types, plus first-class attribute fields on the project
 * (`vendorshipOwner`, `partnerRole`, `executionScope`, `outsource`) that capture every other
 * axis. `resolveProjectCapabilities(project)` (see ./config.ts) composes the visible tabs,
 * required documents, allowed billing directions, and forbidden actions from this combination.
 *
 * `ProjectKind` and the legacy 8-value list are kept as type aliases for the migration window —
 * `normalizeProject` translates legacy records to the new shape on read, and seed data has been
 * rewritten to use the new fields directly.
 */

export const PROJECT_TYPES = ["DIRECT_CLIENT", "PARTNER_NETWORK", "INC_GIVEN_TO_US"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export type VendorshipOwner = "MSS" | "partner" | "none";
export type PartnerRole = "epc" | "fixed_margin" | "vendor_channel" | "vendorship_only";
export type ExecutionScope = "full" | "service_only" | "none";

/** Legacy 8-value kind — retained so untouched seed rows and persisted records keep compiling
 *  while the migration is in progress. New code should use {@link ProjectType}. */
export const PROJECT_KINDS = [
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
  "INC",
  "INC_GIVEN",
  "OUTSOURCED_INC",
  "VENDORSHIP_ONLY",
] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export type BillingDirection =
  | "company_to_customer"
  | "company_to_partner"
  | "partner_to_customer"
  | "vendor_to_customer"
  | "external_to_customer"
  | "external_to_company_commission";

/** Computed capabilities for a project — derived from type + attributes via
 *  {@link resolveProjectCapabilities}. */
export interface ProjectCapabilities {
  visibleTabs: string[];
  requiredDocuments: string[];
  forbiddenActions: string[];
  allowedBillingDirections: BillingDirection[];
}

/** Legacy snapshot shape — retained on the {@link Project} as `projectKindConfigSnapshot`
 *  for backwards compatibility. The fields match what consumers read today. */
export interface ProjectKindConfig {
  kind: ProjectKind;
  label: string;
  requiredParties: Array<"customer" | "partner" | "channelPartner" | "vendorOrDiscom" | "externalNetwork" | "incGiverCompany" | "subcontractor">;
  requiredCommercialFields: Array<
    "contractAmount" | "paymentType" | "internalCostEstimate" | "backendPrice" | "partnerSellPrice" | "commissionRule" | "vendorshipFeeReceivable"
  >;
  allowedBillingDirections: BillingDirection[];
  visibleTabs: string[];
  requiredDocuments: string[];
  forbiddenActions: string[];
  /** When false, project completion does not require MSS client invoices / sale bills. */
  requiresClientInvoice: boolean;
}

/** Static legacy-kind → new-type mapping. Used by {@link normalizeProject} to migrate persisted
 *  records that still carry `projectKind` but not the new attribute fields. */
export const LEGACY_KIND_TO_TYPE: Record<ProjectKind, {
  projectType: ProjectType;
  vendorshipOwner: VendorshipOwner;
  partnerRole?: PartnerRole;
  executionScope: ExecutionScope;
}> = {
  SOLO_EPC: { projectType: "DIRECT_CLIENT", vendorshipOwner: "MSS", executionScope: "full" },
  INC: { projectType: "DIRECT_CLIENT", vendorshipOwner: "MSS", executionScope: "service_only" },
  PARTNER_EPC: { projectType: "PARTNER_NETWORK", vendorshipOwner: "partner", partnerRole: "epc", executionScope: "full" },
  FIXED_EPC: { projectType: "PARTNER_NETWORK", vendorshipOwner: "partner", partnerRole: "fixed_margin", executionScope: "full" },
  VENDOR_NETWORK: { projectType: "PARTNER_NETWORK", vendorshipOwner: "partner", partnerRole: "vendor_channel", executionScope: "full" },
  VENDORSHIP_ONLY: { projectType: "PARTNER_NETWORK", vendorshipOwner: "MSS", partnerRole: "vendorship_only", executionScope: "none" },
  INC_GIVEN: { projectType: "INC_GIVEN_TO_US", vendorshipOwner: "none", executionScope: "full" },
  // Outsourced isn't a type any more — it's an attachment. We default the underlying type to
  // DIRECT_CLIENT for legacy rows; the actual outsource block must be filled in separately.
  OUTSOURCED_INC: { projectType: "DIRECT_CLIENT", vendorshipOwner: "MSS", executionScope: "full" },
};

/** User-facing labels for the new 3-value enum. */
export const projectTypeLabels: Record<ProjectType, string> = {
  DIRECT_CLIENT: "Direct Client",
  PARTNER_NETWORK: "Partner Network",
  INC_GIVEN_TO_US: "INC Given to Us",
};
