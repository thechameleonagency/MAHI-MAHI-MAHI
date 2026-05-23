import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type {
  DealOrigin,
  PartnerModifier,
  UnifiedProjectWizardState,
} from "@/types/createProjectWizard";
import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import type { Enquiry, Project, Quotation } from "@/types/project";
import type { INCGiverCompany, Partner, VendorshipCompany } from "@/types/finance";

export interface BuildUnifiedProjectContext {
  generateId: (prefix: string) => string;
  partners: Partner[];
  incGiverCompanies: INCGiverCompany[];
  vendorshipCompanies: VendorshipCompany[];
  enquiries: Enquiry[];
  quotations: Quotation[];
}

function deriveProjectKind(state: UnifiedProjectWizardState): ProjectKind {
  switch (state.dealOrigin) {
    case "PARTNER":
      return state.partnerModifier === "FIXED_RATE" ? "FIXED_EPC" : "PARTNER_EPC";
    case "INC_TAKEN":
      return "INC_GIVEN";
    case "VENDORSHIP_ONLY":
      return "VENDORSHIP_ONLY";
    default:
      return state.outsourceEnabled ? "OUTSOURCED_INC" : "SOLO_EPC";
  }
}

function dealOriginForKind(kind: ProjectKind, state: UnifiedProjectWizardState): Project["dealOrigin"] {
  switch (kind) {
    case "PARTNER_EPC":
    case "FIXED_EPC":
      return "PARTNER";
    case "INC_GIVEN":
      return "INC_TAKEN";
    case "VENDORSHIP_ONLY":
      return "VENDORSHIP_ONLY";
    case "OUTSOURCED_INC":
      return "OUTSOURCED_INC";
    default:
      return "DIRECT";
  }
}

export function buildProjectFromUnifiedWizardState(
  state: UnifiedProjectWizardState,
  ctx: BuildUnifiedProjectContext,
): Project {
  const projectKind = deriveProjectKind(state);
  const legacy = LEGACY_KIND_TO_TYPE[projectKind];
  const partner =
    state.dealOrigin === "PARTNER"
      ? ctx.partners.find((p) => p.id === state.counterpartyId)
      : undefined;
  const incGiver =
    state.dealOrigin === "INC_TAKEN"
      ? ctx.incGiverCompanies.find((c) => c.id === state.counterpartyId)
      : undefined;
  const subcontractor = state.outsourceEnabled
    ? ctx.partners.find((p) => p.id === state.subcontractorId && p.type === "Subcontractor")
    : undefined;
  const vendorshipCo =
    state.vendorshipOwner === "CODE_GIVER"
      ? ctx.vendorshipCompanies.find((c) => c.id === state.vendorshipCompanyId)
      : undefined;

  const enquiry =
    state.soloPipeline === "enquiry"
      ? ctx.enquiries.find((e) => e.id === state.selectedEnquiryId)
      : undefined;
  const quotation =
    state.soloPipeline === "quotation"
      ? ctx.quotations.find((q) => q.id === state.selectedQuotationId)
      : undefined;

  const capacityLabel = `${state.capacityKw} kW`;
  const clientName =
    state.dealOrigin === "INC_TAKEN"
      ? incGiver?.name ?? state.endCustomer.name
      : state.endCustomer.name;

  const vendorshipOwnerEntity =
    state.vendorshipOwner === "MSS"
      ? "MSS"
      : state.dealOrigin === "PARTNER"
        ? "PARTNER"
        : "CLIENT";

  const scope: Project["scope"] = {
    hasMaterial: projectKind !== "INC_GIVEN" && projectKind !== "VENDORSHIP_ONLY" && !state.outsourceEnabled,
    hasInstallation: projectKind !== "VENDORSHIP_ONLY",
    vendorshipOwner: state.vendorshipOwner === "MSS" ? "MSS" : vendorshipOwnerEntity,
    leadSource:
      state.dealOrigin === "PARTNER"
        ? "PARTNER"
        : state.dealOrigin === "INC_TAKEN"
          ? "MSS_DIRECT"
          : "MSS_DIRECT",
    billingParty: "MSS",
    kNumber: state.endCustomer.kNumber,
    vendorshipCompanyId: vendorshipCo?.id,
    vendorshipFeeAmount: state.vendorshipFeeAmount,
    partnerId: partner?.id ?? subcontractor?.id,
    incGiverCompanyId: incGiver?.id,
    profitSharePercent:
      state.dealOrigin === "PARTNER" && state.partnerModifier === "PROFIT_SHARE"
        ? state.partnerProfitSharePct
        : undefined,
    fixedRatePerKw:
      state.dealOrigin === "PARTNER" && state.partnerModifier === "FIXED_RATE"
        ? state.mssBackendFixedRate
        : undefined,
    rateBasis:
      state.dealOrigin === "INC_TAKEN"
        ? state.incRateBasis === "PER_SQFT"
          ? "per_sqft"
          : state.incRateBasis === "FIXED"
            ? "fixed"
            : "per_kw"
        : undefined,
    rateValue: state.dealOrigin === "INC_TAKEN" ? state.incRateValue : undefined,
    installationBy: state.outsourceEnabled ? "Subcontractor" : "MSS",
  };

  const outsource =
    state.outsourceEnabled && subcontractor
      ? {
          partyId: subcontractor.id,
          partyName: subcontractor.name,
          rateBasis: "per_kw" as const,
          rateValue: state.subcontractorPayoutRate ?? 0,
          total: (state.subcontractorPayoutRate ?? 0) * state.capacityKw,
          attachedAt: new Date().toISOString(),
        }
      : null;

  const partners =
    partner && state.dealOrigin === "PARTNER"
      ? [
          {
            partnerId: partner.id,
            partnerName: partner.name,
            partnerType:
              state.partnerModifier === "FIXED_RATE"
                ? ("fixed" as const)
                : ("profit" as const),
            sharePercentage: state.partnerProfitSharePct,
            fixedAmount: state.mssBackendFixedRate,
            calculatedEarning: 0,
            settlementDirection: "company_pays_partner" as const,
          },
        ]
      : undefined;

  const project: Project = {
    id: ctx.generateId("PRJ"),
    name: state.projectName || `${clientName} - ${capacityLabel}`,
    client: clientName,
    customerId: enquiry?.customerId ?? quotation?.customerId,
    enquiryId: enquiry?.id ?? quotation?.enquiryId,
    quotationId: quotation?.id,
    startDate: new Date().toISOString().split("T")[0],
    status: "New",
    lifecycleStatus: "New",
    projectKind,
    projectKindConfigSnapshot: projectKindConfigSnapshot(projectKind),
    projectMode: legacy.projectType,
    vendorshipOwner: state.vendorshipOwner === "MSS" ? "MSS" : legacy.vendorshipOwner,
    partnerRole: legacy.partnerRole,
    executionScope: state.outsourceEnabled ? "service_only" : legacy.executionScope,
    dealOrigin: dealOriginForKind(projectKind, state),
    type: projectKind === "INC_GIVEN" || projectKind === "OUTSOURCED_INC" ? "INC" : "EPC",
    projectType: state.projectType,
    projectCategory: "solar",
    capacity: capacityLabel,
    location: state.endCustomer.address,
    address: state.endCustomer.address,
    clientAddress: state.endCustomer.address,
    contractAmount: state.grossContractValue,
    amountInvoiced: 0,
    amountReceived: 0,
    createdAt: new Date().toISOString(),
    history: [],
    paymentType: "cash",
    scope,
    partners,
    outsource,
    internalCostEstimate: Math.round(state.grossContractValue * 0.65),
    backendPrice: state.mssBackendFixedRate,
    partnerSellPrice: state.dealOrigin === "PARTNER" ? state.grossContractValue : undefined,
    vendorshipFeeReceivable:
      state.dealOrigin === "VENDORSHIP_ONLY" ? state.grossContractValue : state.vendorshipFeeAmount,
    systemNotes: [
      `Roof: ${state.systemDetails.roofType}`,
      `Phase: ${state.systemDetails.phase}`,
      `Connection: ${state.systemDetails.connectionType}`,
      `DISCOM: ${state.systemDetails.discom}`,
      `Panel: ${state.itemDetails.panelQty}x ${state.itemDetails.panelMake} ${state.itemDetails.panelCapacityWp}Wp`,
      `Inverter: ${state.itemDetails.inverterMake} ${state.itemDetails.inverterCapacityKw}kW`,
      `Structure: ${state.itemDetails.structureType}`,
    ].join(" · "),
  };

  return project;
}

export function buildIntakeFromUnifiedWizardState(
  state: UnifiedProjectWizardState,
  ctx: BuildUnifiedProjectContext,
): ProjectIntakePayload {
  const kind = deriveProjectKind(state);
  const partner = ctx.partners.find((p) => p.id === state.counterpartyId);
  const incGiver = ctx.incGiverCompanies.find((c) => c.id === state.counterpartyId);
  const subcontractor = state.outsourceEnabled
    ? ctx.partners.find((p) => p.id === state.subcontractorId)
    : undefined;
  const vendorshipCo = ctx.vendorshipCompanies.find((c) => c.id === state.vendorshipCompanyId);

  const parties: ProjectIntakePayload["parties"] = {
    customer: state.endCustomer.name,
    partner: partner?.name,
    incGiverCompany: incGiver?.name,
    subcontractor: subcontractor?.name,
    vendorOrDiscom: state.vendorshipOwner === "MSS" ? "MSS" : vendorshipCo?.name,
  };

  return {
    kind,
    parties,
    commercial: {
      contractAmount: state.grossContractValue,
      paymentType: "cash",
      internalCostEstimate: Math.round(state.grossContractValue * 0.65),
      backendPrice: state.mssBackendFixedRate,
      partnerSellPrice: state.dealOrigin === "PARTNER" ? state.grossContractValue : undefined,
      vendorshipFeeReceivable:
        state.dealOrigin === "VENDORSHIP_ONLY" ? state.grossContractValue : state.vendorshipFeeAmount,
    },
  };
}

export function prefillUnifiedWizardFromEnquiry(
  enquiry: Enquiry,
): Partial<UnifiedProjectWizardState> {
  return {
    soloPipeline: "enquiry",
    selectedEnquiryId: enquiry.id,
    endCustomer: {
      name: enquiry.customerName,
      phone: enquiry.customerPhone ?? "",
      address: enquiry.customerAddress ?? "",
      kNumber: "",
    },
    capacityKw: parseFloat(String(enquiry.systemCapacity).replace(/[^\d.]/g, "")) || 0,
    grossContractValue: enquiry.estimatedBudget ?? 0,
    projectName: `${enquiry.customerName} - ${enquiry.systemCapacity}`,
  };
}

export function prefillUnifiedWizardFromQuotation(
  quotation: Quotation,
): Partial<UnifiedProjectWizardState> {
  return {
    soloPipeline: "quotation",
    selectedQuotationId: quotation.id,
    endCustomer: {
      name: quotation.clientName,
      phone: quotation.clientPhone ?? "",
      address: [quotation.clientCity, quotation.clientState].filter(Boolean).join(", "),
      kNumber: "",
    },
    capacityKw: parseFloat(String(quotation.systemCapacity ?? "").replace(/[^\d.]/g, "")) || 0,
    grossContractValue: quotation.commercialAmount ?? quotation.totalAmount ?? 0,
    projectName: quotation.clientName,
  };
}

export function dealOriginLabel(origin: DealOrigin): string {
  switch (origin) {
    case "DIRECT":
      return "Direct Client (Solo EPC)";
    case "PARTNER":
      return "Partner Network";
    case "INC_TAKEN":
      return "INC Taken";
    case "VENDORSHIP_ONLY":
      return "Vendorship Only";
  }
}

export function partnerModifierLabel(mod?: PartnerModifier): string {
  if (mod === "FIXED_RATE") return "Fixed Rate";
  if (mod === "PROFIT_SHARE") return "Profit Share";
  return "—";
}
