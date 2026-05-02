import type { ProjectKindConfig } from "@/domain/projectTypes/types";

/**
 * Party / commercial / module visibility. MSS→customer invoices and sale bills are always permitted for valid projects (see BillingDirectionGuardService); `allowedBillingDirections` documents supplementary flows (settlements, channel), not MSS invoice blocking.
 */
export const projectKindConfigs: Record<string, ProjectKindConfig> = {
  SOLO_EPC: {
    kind: "SOLO_EPC",
    label: "Solo EPC",
    requiredParties: ["customer", "vendorOrDiscom"],
    requiredCommercialFields: ["contractAmount", "paymentType", "internalCostEstimate"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "materials", "documents", "billing", "collections", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "meter_application", "dcr", "wcr", "handover"],
    forbiddenActions: ["partner_settlement", "channel_fee"],
  },
  PARTNER_EPC: {
    kind: "PARTNER_EPC",
    label: "Partner EPC",
    requiredParties: ["customer", "partner"],
    requiredCommercialFields: ["contractAmount", "paymentType", "internalCostEstimate"],
    allowedBillingDirections: ["company_to_customer", "company_to_partner", "partner_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "materials", "documents", "billing", "collections", "partner_economics", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "dcr", "wcr", "handover"],
    forbiddenActions: [],
  },
  FIXED_EPC: {
    kind: "FIXED_EPC",
    label: "Fixed EPC",
    requiredParties: ["customer", "partner"],
    requiredCommercialFields: ["contractAmount", "backendPrice", "partnerSellPrice"],
    allowedBillingDirections: ["company_to_customer", "company_to_partner"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "materials", "documents", "billing", "collections", "fixed_margin", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "dcr", "wcr", "handover"],
    forbiddenActions: [],
  },
  VENDOR_NETWORK: {
    kind: "VENDOR_NETWORK",
    label: "Vendor Network",
    requiredParties: ["channelPartner", "externalNetwork"],
    requiredCommercialFields: ["contractAmount", "commissionRule"],
    /** Billing is always MSS→customer invoices; commission / channel receipts are modeled in collections & income. */
    allowedBillingDirections: ["company_to_customer", "external_to_customer", "external_to_company_commission"],
    visibleTabs: ["overview", "commercial", "parties", "work", "materials", "documents", "billing", "collections", "channel_fee", "tasks", "audit"],
    requiredDocuments: ["external_invoice_ref", "commission_doc", "handover"],
    forbiddenActions: [],
  },
  INC: {
    kind: "INC",
    label: "INC Service",
    requiredParties: ["customer"],
    requiredCommercialFields: ["contractAmount", "paymentType"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "work", "materials", "documents", "billing", "collections", "tasks", "audit"],
    requiredDocuments: ["site_photo", "work_completion", "handover"],
    forbiddenActions: ["full_epc_document_set"],
  },
};
