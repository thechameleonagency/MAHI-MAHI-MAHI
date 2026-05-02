export const PROJECT_KINDS = [
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
  "INC",
] as const;

export type ProjectKind = (typeof PROJECT_KINDS)[number];

export type BillingDirection =
  | "company_to_customer"
  | "company_to_partner"
  | "partner_to_customer"
  | "vendor_to_customer"
  | "external_to_customer"
  | "external_to_company_commission";

export interface ProjectKindConfig {
  kind: ProjectKind;
  label: string;
  requiredParties: Array<"customer" | "partner" | "channelPartner" | "vendorOrDiscom" | "externalNetwork">;
  requiredCommercialFields: Array<
    "contractAmount" | "paymentType" | "internalCostEstimate" | "backendPrice" | "partnerSellPrice" | "commissionRule"
  >;
  allowedBillingDirections: BillingDirection[];
  visibleTabs: string[];
  requiredDocuments: string[];
  forbiddenActions: string[];
}
