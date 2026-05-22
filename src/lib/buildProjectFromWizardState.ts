import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import {
  computeIncGivenTotal,
  deriveProjectKind,
  effectiveLeadPath,
  effectivePartnerType,
} from "@/lib/createProjectWizardLogic";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { Agent, Customer, INCGiverCompany, Partner, VendorshipCompany } from "@/types/finance";
import type { Project, ProjectScopeConfig, Quotation } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface BuildProjectFromWizardContext {
  generateId: (prefix: string) => string;
  customers: Customer[];
  partners: Partner[];
  incGiverCompanies: INCGiverCompany[];
  vendorshipCompanies: VendorshipCompany[];
  agents: Agent[];
  quotations: Quotation[];
  /** Customer row to use after wizard-side resolution (select / add / enquiry link). */
  customer: { id: string; name: string; address?: string };
}

export interface BuildProjectFromWizardSideEffects {
  vendorshipExpense?: {
    amount: number;
    vendorshipCompanyId: string;
    companyName?: string;
    partnerId?: string;
    partnerName?: string;
  };
}

export interface BuildProjectFromWizardResult {
  project: Project;
  intake: ProjectIntakePayload;
  quotationId?: string;
  sideEffects: BuildProjectFromWizardSideEffects;
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

function formatCapacity(capacity: string): string {
  const text = trim(capacity);
  if (!text) return "";
  return text.toLowerCase().includes("kw") ? text : `${text} kW`;
}

function resolveProjectName(state: CreateProjectWizardState, lead: ReturnType<typeof effectiveLeadPath>): string {
  if (lead === "PARTNER") {
    return trim(state.partnerProjectName) || trim(state.projectName) || "Partner project";
  }
  if (lead === "INC_GIVEN") {
    return trim(state.incProjectName) || trim(state.projectName) || "INC project";
  }
  return trim(state.projectName) || "Untitled project";
}

function resolveCapacity(state: CreateProjectWizardState, lead: ReturnType<typeof effectiveLeadPath>): string {
  if (lead === "PARTNER") {
    return formatCapacity(state.partnerCapacity || state.capacity || "");
  }
  if (lead === "INC_GIVEN") {
    return formatCapacity(state.incCapacity || state.capacity || "0");
  }
  return formatCapacity(state.capacity || "");
}

function resolveContractAmount(state: CreateProjectWizardState, lead: ReturnType<typeof effectiveLeadPath>): number {
  if (lead === "PARTNER") {
    return parsePositive(state.partnerContractAmount ?? state.contractAmount);
  }
  if (lead === "INC_GIVEN") {
    return computeIncGivenTotal(state);
  }
  return parsePositive(state.contractAmount);
}

function resolveLocation(state: CreateProjectWizardState, customerAddress?: string): string {
  return trim(state.location) || trim(state.newCustomerAddress) || trim(customerAddress) || "";
}

function buildScopeConfig(
  state: CreateProjectWizardState,
  projectKind: ProjectKind,
  lead: ReturnType<typeof effectiveLeadPath>,
  ctx: BuildProjectFromWizardContext,
): ProjectScopeConfig {
  const partner =
    lead === "PARTNER" && state.selectedPartnerId
      ? ctx.partners.find((p) => p.id === state.selectedPartnerId)
      : undefined;
  const subcontractor =
    lead === "OUTSOURCED_INC" && state.selectedSubcontractorId
      ? ctx.partners.find((p) => p.id === state.selectedSubcontractorId)
      : undefined;

  if (lead === "OUTSOURCED_INC") {
    return {
      hasMaterial: false,
      hasInstallation: true,
      vendorshipOwner: "CLIENT",
      leadSource: "MSS_DIRECT",
      billingParty: "MSS",
      partnerId: subcontractor?.id,
      installationBy: "Subcontractor",
      kNumber: trim(state.kNumber) || undefined,
    };
  }

  if (lead === "INC_GIVEN") {
    return {
      hasMaterial: false,
      hasInstallation: true,
      vendorshipOwner: "CLIENT",
      leadSource: "MSS_DIRECT",
      billingParty: "MSS",
      incGiverCompanyId: state.incGiverCompanyId,
      rateBasis: state.rateBasis ?? "per_kw",
      rateValue: parsePositive(state.rateValue) || undefined,
    };
  }

  if (lead === "PARTNER") {
    const partnerType = effectivePartnerType(state);
    return {
      hasMaterial: true,
      hasInstallation: true,
      vendorshipOwner: state.partnerVendorshipChoice === "OUR_CODE" ? "MSS" : "PARTNER",
      vendorshipFeeAmount:
        state.partnerVendorshipChoice === "OUR_CODE"
          ? parsePositive(state.partnerVendorshipFeeAmount) || undefined
          : state.partnerVendorshipChoice === "THIRD_PARTY"
            ? parsePositive(state.partnerVendorshipFeeAmount) || undefined
            : undefined,
      leadSource: "PARTNER",
      partnerId: partner?.id,
      billingParty: state.billingParty ?? "MSS",
      partnerBillingFeePercentage: state.partnerGstInvoice === "no" ? 9 : undefined,
      vendorshipCompanyId:
        state.partnerVendorshipChoice === "THIRD_PARTY"
          ? trim(state.partnerThirdPartyCompanyId) || undefined
          : undefined,
      profitSharePercent:
        partnerType === "profit_share" ? parsePositive(state.profitSharePercent) || undefined : undefined,
      fixedRatePerKw:
        partnerType === "fixed_rate" ? parsePositive(state.fixedRatePerKw) || undefined : undefined,
    };
  }

  return {
    hasMaterial: true,
    hasInstallation: true,
    vendorshipOwner: state.vendorshipChoice === "THIRD_PARTY" ? "PARTNER" : "MSS",
    vendorshipFeeAmount:
      state.vendorshipChoice === "THIRD_PARTY"
        ? parsePositive(state.vendorshipFeeAmount) || undefined
        : undefined,
    leadSource: "MSS_DIRECT",
    billingParty: "MSS",
    kNumber: trim(state.kNumber) || undefined,
    agentId: trim(state.selectedAgentId) || undefined,
    vendorshipCompanyId:
      state.vendorshipChoice === "THIRD_PARTY" ? trim(state.vendorshipCompanyId) || undefined : undefined,
  };
}

function buildIntakePayload(
  state: CreateProjectWizardState,
  projectKind: ProjectKind,
  lead: ReturnType<typeof effectiveLeadPath>,
  ctx: BuildProjectFromWizardContext,
  commercial: {
    contractAmount: number;
    paymentType: string;
    internalCostEstimate: number;
  },
): ProjectIntakePayload {
  const parties: ProjectIntakePayload["parties"] = {};
  const partner = state.selectedPartnerId
    ? ctx.partners.find((p) => p.id === state.selectedPartnerId)
    : undefined;
  const subcontractor = state.selectedSubcontractorId
    ? ctx.partners.find((p) => p.id === state.selectedSubcontractorId)
    : undefined;
  const incGiver = state.incGiverCompanyId
    ? ctx.incGiverCompanies.find((c) => c.id === state.incGiverCompanyId)
    : undefined;
  const vendorshipCompany =
    state.vendorshipChoice === "THIRD_PARTY" && state.vendorshipCompanyId
      ? ctx.vendorshipCompanies.find((c) => c.id === state.vendorshipCompanyId)
      : undefined;

  if (lead === "PARTNER") {
    parties.customer = trim(state.partnerCustomerName) || ctx.customer.name;
    if (partner) parties.partner = partner.name;
  } else if (lead === "INC_GIVEN") {
    parties.incGiverCompany = incGiver?.name;
    parties.customer = incGiver?.name;
  } else if (lead === "OUTSOURCED_INC") {
    parties.customer = ctx.customer.name;
    if (subcontractor) parties.subcontractor = subcontractor.name;
  } else {
    parties.customer = ctx.customer.name;
    if (state.vendorshipChoice === "THIRD_PARTY") {
      parties.vendorOrDiscom = vendorshipCompany?.name;
    } else if (trim(state.kNumber)) {
      parties.vendorOrDiscom = `MSS own DISCOM code for ${trim(state.kNumber)}`;
    } else {
      parties.vendorOrDiscom = "MSS own DISCOM code";
    }
  }

  if (projectKind === "VENDOR_NETWORK") {
    if (trim(state.channelPartnerName)) parties.channelPartner = trim(state.channelPartnerName);
    if (trim(state.externalNetworkName)) parties.externalNetwork = trim(state.externalNetworkName);
  }

  const intakeCommercial: ProjectIntakePayload["commercial"] = {
    contractAmount: commercial.contractAmount,
    paymentType: commercial.paymentType,
    internalCostEstimate: commercial.internalCostEstimate,
  };

  if (projectKind === "FIXED_EPC") {
    intakeCommercial.backendPrice =
      parsePositive(state.fixedRatePerKw) * parsePositive(state.partnerCapacity || state.capacity);
    intakeCommercial.partnerSellPrice = commercial.contractAmount;
  }

  const payload: ProjectIntakePayload = {
    kind: projectKind,
    parties,
    commercial: intakeCommercial,
  };

  if (state.source === "direct_exception") {
    payload.site = {
      projectType: state.projectType ?? "Residential",
      projectCategory: state.projectCategory ?? "solar",
      capacity: resolveCapacity(state, lead),
      location: resolveLocation(state, ctx.customer.address),
    };
  }

  return payload;
}

export function buildProjectFromWizardState(
  state: CreateProjectWizardState,
  ctx: BuildProjectFromWizardContext,
): BuildProjectFromWizardResult {
  const lead = effectiveLeadPath(state);
  if (!lead) {
    throw new Error("Deal structure is not resolved.");
  }

  const projectKind = deriveProjectKind(state);
  const legacyTypeMap = LEGACY_KIND_TO_TYPE[projectKind];
  const projectId = ctx.generateId("P");
  const contractAmount = resolveContractAmount(state, lead);
  const paymentType = state.paymentType ?? "cash";
  const internalCostEstimate = parsePositive(state.internalCostEstimate);
  const scope = buildScopeConfig(state, projectKind, lead, ctx);
  const selectedAgent = state.selectedAgentId
    ? ctx.agents.find((a) => a.id === state.selectedAgentId)
    : undefined;
  const subcontractor =
    lead === "OUTSOURCED_INC" && state.selectedSubcontractorId
      ? ctx.partners.find((p) => p.id === state.selectedSubcontractorId)
      : undefined;

  const derivedOutsource: Project["outsource"] =
    lead === "OUTSOURCED_INC" && subcontractor
      ? {
          partyId: subcontractor.id,
          partyName: subcontractor.name,
          rateBasis: "fixed",
          rateValue: contractAmount,
          total: contractAmount,
          attachedAt: new Date().toISOString(),
        }
      : null;

  const project: Project = {
    id: projectId,
    name: resolveProjectName(state, lead),
    projectKind,
    projectKindConfigSnapshot: projectKindConfigSnapshot(projectKind),
    projectMode: legacyTypeMap.projectType,
    vendorshipOwner:
      lead === "MSS_DIRECT"
        ? state.vendorshipChoice === "THIRD_PARTY"
          ? "partner"
          : "MSS"
        : lead === "INC_GIVEN"
          ? "none"
          : lead === "OUTSOURCED_INC"
            ? "MSS"
            : legacyTypeMap.vendorshipOwner,
    executionScope: legacyTypeMap.executionScope,
    partnerRole: legacyTypeMap.partnerRole,
    outsource: derivedOutsource,
    type: projectKind === "INC_GIVEN" ? "INC" : "EPC",
    projectType:
      lead === "PARTNER"
        ? state.partnerProjectType ?? "Residential"
        : state.projectType ?? "Residential",
    projectCategory: state.projectCategory ?? "solar",
    lifecycleStatus: "New",
    client: lead === "PARTNER" ? trim(state.partnerCustomerName) || ctx.customer.name : ctx.customer.name,
    customerId: ctx.customer.id,
    capacity: resolveCapacity(state, lead),
    location: resolveLocation(state, ctx.customer.address),
    contractAmount,
    totalCost: internalCostEstimate || undefined,
    amountReceived: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
    createdAt: new Date().toISOString(),
    assignees: [],
    onSite: 0,
    photos: 0,
    quotationId: state.source === "quotation" ? state.selectedQuotationId : undefined,
    scope,
    paymentType,
    fundingLoanId:
      (paymentType === "loan" || paymentType === "cash-and-loan") && trim(state.fundingLoanId)
        ? trim(state.fundingLoanId)
        : undefined,
    agentId: trim(state.selectedAgentId) || undefined,
    agentName: selectedAgent?.name,
    commissionRate:
      state.commissionRatePct != null && Number.isFinite(state.commissionRatePct)
        ? state.commissionRatePct
        : undefined,
    incScope:
      (projectKind === "OUTSOURCED_INC" || projectKind === "INC_GIVEN") && state.incScope
        ? state.incScope
        : undefined,
  };

  const sideEffects: BuildProjectFromWizardSideEffects = {};

  if (lead === "MSS_DIRECT" && state.vendorshipChoice === "THIRD_PARTY" && state.vendorshipCompanyId) {
    const fee = parsePositive(state.vendorshipFeeAmount);
    if (fee > 0) {
      sideEffects.vendorshipExpense = {
        amount: fee,
        vendorshipCompanyId: state.vendorshipCompanyId,
        companyName: ctx.vendorshipCompanies.find((c) => c.id === state.vendorshipCompanyId)?.name,
      };
    }
  }

  if (
    lead === "PARTNER" &&
    state.partnerVendorshipChoice === "THIRD_PARTY" &&
    state.partnerThirdPartyCompanyId
  ) {
    const fee = parsePositive(state.partnerVendorshipFeeAmount);
    if (fee > 0) {
      sideEffects.vendorshipExpense = {
        amount: fee,
        vendorshipCompanyId: state.partnerThirdPartyCompanyId,
        companyName: ctx.vendorshipCompanies.find((c) => c.id === state.partnerThirdPartyCompanyId)?.name,
        partnerId: state.selectedPartnerId,
        partnerName: ctx.partners.find((p) => p.id === state.selectedPartnerId)?.name,
      };
    }
  }

  return {
    project,
    intake: buildIntakePayload(state, projectKind, lead, ctx, {
      contractAmount,
      paymentType,
      internalCostEstimate,
    }),
    quotationId: state.source === "quotation" ? state.selectedQuotationId : undefined,
    sideEffects,
  };
}
