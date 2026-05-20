import type {
  BillingDirection,
  ExecutionScope,
  PartnerRole,
  ProjectCapabilities,
  ProjectKindConfig,
  ProjectType,
  VendorshipOwner,
} from "@/domain/projectTypes/types";

/**
 * Shape consumed by {@link resolveProjectCapabilities}. We don't require a full Project type here
 * because we want this to work both on persisted projects and on "in-progress" creation payloads
 * (e.g. inside Create Project sheet before the record is committed).
 */
export interface ProjectCapabilityInput {
  /** Note: field is `projectMode` on the Project entity (because `projectType` is already taken
   *  for residential/commercial/industrial). Same domain semantics as {@link ProjectType}. */
  projectMode: ProjectType;
  vendorshipOwner: VendorshipOwner;
  partnerRole?: PartnerRole;
  executionScope: ExecutionScope;
  outsource?: unknown | null;
}

/**
 * Composes a project's visible tabs / required documents / billing directions / forbidden actions
 * from its type and attribute fields. This replaces the eight inline registry entries that used
 * to live in this file — those entries baked sub-distinctions into the kind name, so adding a
 * new combination needed a new kind. The resolver is rule-based, so new combinations are free.
 */
export function resolveProjectCapabilities(input: ProjectCapabilityInput): ProjectCapabilities {
  const visibleTabs: string[] = ["overview", "commercial", "parties", "billing", "collections", "tasks", "audit"];
  const requiredDocuments: string[] = [];
  const forbiddenActions: string[] = [];
  const allowedBillingDirections: BillingDirection[] = ["company_to_customer"];

  if (input.executionScope !== "none") {
    visibleTabs.push("progress_report", "team_roster", "field_operations");
  } else {
    forbiddenActions.push("work_tracking", "material_dispatch");
  }

  if (input.vendorshipOwner === "MSS") {
    visibleTabs.push("document_creator");
    if (input.executionScope === "full") {
      requiredDocuments.push("proposal", "agreement", "feasibility", "dcr", "wcr", "handover");
    } else if (input.executionScope === "service_only") {
      requiredDocuments.push("site_photo", "work_completion", "handover");
    }
  } else {
    forbiddenActions.push("full_epc_document_set");
  }

  if (input.projectMode === "INC_GIVEN_TO_US") {
    forbiddenActions.push("material_dispatch", "partner_settlement");
    requiredDocuments.push("work_completion", "handover");
  } else if (input.executionScope === "full") {
    visibleTabs.push("materials_sent");
  }

  if (input.projectMode === "PARTNER_NETWORK") {
    visibleTabs.push("partner_economics");
    allowedBillingDirections.push("company_to_partner");
    if (input.partnerRole === "epc") {
      allowedBillingDirections.push("partner_to_customer");
    } else if (input.partnerRole === "vendor_channel") {
      allowedBillingDirections.push("external_to_customer", "external_to_company_commission");
    } else if (input.partnerRole === "vendorship_only") {
      requiredDocuments.push("vendor_code_agreement");
    }
  }

  if (input.outsource) {
    requiredDocuments.push("subcontractor_agreement");
  }

  return {
    visibleTabs: [...new Set(visibleTabs)],
    requiredDocuments: [...new Set(requiredDocuments)],
    forbiddenActions: [...new Set(forbiddenActions)],
    allowedBillingDirections: [...new Set(allowedBillingDirections)],
  };
}

/**
 * @deprecated The 8-kind registry is retained ONLY so untouched consumers (commands, services,
 * tests, ProjectDocumentsStudio) keep compiling during the migration. New code should call
 * {@link resolveProjectCapabilities}. Once all consumers have been ported, this registry will
 * be removed.
 */
export const projectKindConfigs: Record<string, ProjectKindConfig> = {
  SOLO_EPC: {
    kind: "SOLO_EPC",
    label: "Solo EPC",
    requiredParties: ["customer", "vendorOrDiscom"],
    requiredCommercialFields: ["contractAmount", "paymentType", "internalCostEstimate"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "team_roster", "materials", "documents", "billing", "collections", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "meter_application", "dcr", "wcr", "handover"],
    forbiddenActions: ["partner_settlement", "channel_fee"],
  },
  PARTNER_EPC: {
    kind: "PARTNER_EPC",
    label: "Partner EPC",
    requiredParties: ["customer", "partner"],
    requiredCommercialFields: ["contractAmount", "paymentType", "internalCostEstimate"],
    allowedBillingDirections: ["company_to_customer", "company_to_partner", "partner_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "team_roster", "materials", "documents", "billing", "collections", "partner_economics", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "dcr", "wcr", "handover"],
    forbiddenActions: [],
  },
  FIXED_EPC: {
    kind: "FIXED_EPC",
    label: "Fixed EPC",
    requiredParties: ["customer", "partner"],
    requiredCommercialFields: ["contractAmount", "backendPrice", "partnerSellPrice"],
    allowedBillingDirections: ["company_to_customer", "company_to_partner"],
    visibleTabs: ["overview", "commercial", "parties", "sites", "work", "team_roster", "materials", "documents", "billing", "collections", "fixed_margin", "tasks", "audit"],
    requiredDocuments: ["proposal", "agreement", "feasibility", "dcr", "wcr", "handover"],
    forbiddenActions: [],
  },
  VENDOR_NETWORK: {
    kind: "VENDOR_NETWORK",
    label: "Vendor Network",
    requiredParties: ["channelPartner", "externalNetwork"],
    requiredCommercialFields: ["contractAmount", "commissionRule"],
    allowedBillingDirections: ["company_to_customer", "external_to_customer", "external_to_company_commission"],
    visibleTabs: ["overview", "commercial", "parties", "work", "team_roster", "materials", "documents", "billing", "collections", "channel_fee", "tasks", "audit"],
    requiredDocuments: ["external_invoice_ref", "commission_doc", "handover"],
    forbiddenActions: [],
  },
  INC: {
    kind: "INC",
    label: "INC Service",
    requiredParties: ["customer"],
    requiredCommercialFields: ["contractAmount", "paymentType"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "work", "team_roster", "materials", "documents", "billing", "collections", "tasks", "audit"],
    requiredDocuments: ["site_photo", "work_completion", "handover"],
    forbiddenActions: ["full_epc_document_set"],
  },
  OUTSOURCED_INC: {
    kind: "OUTSOURCED_INC",
    label: "Outsourced INC",
    requiredParties: ["customer", "subcontractor"],
    requiredCommercialFields: ["contractAmount", "paymentType"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "work", "team_roster", "billing", "collections", "tasks", "audit"],
    requiredDocuments: ["site_photo", "work_completion", "handover", "subcontractor_agreement"],
    forbiddenActions: ["full_epc_document_set", "material_dispatch"],
  },
  INC_GIVEN: {
    kind: "INC_GIVEN",
    label: "INC Work Given to Us",
    requiredParties: ["incGiverCompany"],
    requiredCommercialFields: ["contractAmount"],
    allowedBillingDirections: ["company_to_customer"],
    visibleTabs: ["overview", "commercial", "parties", "work", "team_roster", "collections", "tasks", "audit"],
    requiredDocuments: ["work_completion", "handover"],
    forbiddenActions: ["full_epc_document_set", "material_dispatch", "partner_settlement"],
  },
  VENDORSHIP_ONLY: {
    kind: "VENDORSHIP_ONLY",
    label: "Vendorship Only",
    requiredParties: ["externalNetwork"],
    requiredCommercialFields: ["vendorshipFeeReceivable"],
    allowedBillingDirections: ["company_to_partner"],
    visibleTabs: ["overview", "parties", "billing", "collections", "team_roster", "tasks", "audit"],
    requiredDocuments: ["vendor_code_agreement"],
    forbiddenActions: ["material_dispatch", "work_tracking", "full_epc_document_set"],
  },
};
