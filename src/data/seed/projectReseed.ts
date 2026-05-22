import type { AppState } from "@/contexts/AppDataContext";
import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { LEGACY_KIND_TO_TYPE } from "@/domain/projectTypes/types";
import { legacyStatusFromLifecycle } from "@/domain/stateMachines/projectStateMachine";
import type { Customer } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { SeedProfile } from "./seedLayerOrder";
import type { CapabilityProjectSpec } from "./seedCapabilityAxis";
import { capabilityProjectSpecs } from "./seedCapabilityAxis";
import { SeedProjectCommandRunner } from "./seedProjectCommandRunner";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { addressAt, companyName } from "./seedNames";
import { applyLegacyTaxonomy, contractForCapacity, roundInr } from "./seedHelpers";

export interface ReseedProjectEntry {
  projectId: string;
  spec: CapabilityProjectSpec;
  globalIndex: number;
}

export class ProjectReseedError extends Error {
  constructor(
    message: string,
    readonly detail: { kind: ProjectKind; globalIndex: number; errorCode?: string },
  ) {
    super(message);
    this.name = "ProjectReseedError";
  }
}

function projectTypeFromCategory(category: CapabilityProjectSpec["category"]): Project["projectType"] {
  if (category === "commercial") return "Commercial";
  if (category === "industrial") return "Industrial";
  return "Residential";
}

function formatCapacity(kw: number): string {
  if (kw <= 0) return "1 kW";
  return `${kw} kW`;
}

function reserveApprovedQuotations(state: AppState, needed: number): Quotation[] {
  const linked = new Set(state.quotations.filter((q) => q.linkedProjectId).map((q) => q.id));
  const pool: Quotation[] = state.quotations.filter((q) => !linked.has(q.id));
  const pipelinePool = pool.filter((q) => q.enquiryId?.trim());
  const reseedPool = pool.filter((q) => !q.enquiryId?.trim());

  const reserved: Quotation[] = [];

  const takeApproved = (source: Quotation[]) => {
    for (const q of source) {
      if (reserved.length >= needed) break;
      if (q.status === "approved") reserved.push(q);
    }
  };

  const promoteSentDraft = (source: Quotation[]) => {
    for (const q of source) {
      if (reserved.length >= needed) break;
      if (q.status !== "sent" && q.status !== "draft") continue;
      q.status = "approved";
      q.approvedAt = q.approvedAt ?? seedDateAt(0.12);
      if (!q.customerId?.trim()) {
        const match = state.customers.find(
          (c) => c.name.trim().toLowerCase() === q.clientName.trim().toLowerCase(),
        );
        const fallback = state.customers[reserved.length % Math.max(state.customers.length, 1)];
        q.customerId = match?.id ?? fallback?.id;
      }
      reserved.push(q);
    }
  };

  takeApproved(reseedPool);
  promoteSentDraft(reseedPool);

  while (reserved.length < needed) {
    const i = reserved.length;
    const customer = state.customers[i % Math.max(state.customers.length, 1)];
    const q: Quotation = {
      id: seedId(SEED_ID_PREFIX.quotation),
      quotationNumber: `Q-RESEED-${2000 + i}`,
      status: "approved",
      quotationType: "solar",
      customerId: customer?.id,
      salesOwnerMemberId: i % 2 === 0 ? "SAL-001" : undefined,
      agentId: state.agents[i % Math.max(state.agents.length, 1)]?.id,
      clientName: customer?.name ?? `Reseed Client ${i}`,
      clientPhone: customer?.phone ?? "9999999999",
      clientEmail: customer?.email ?? `reseed${i}@seed.local`,
      clientCity: "Hyderabad",
      clientState: "Telangana",
      systemCategory: (["residential", "commercial", "industrial"] as const)[i % 3],
      systemCapacity: String(5 + (i % 5) * 2),
      paymentType: (["cash", "loan", "cash-and-loan"] as const)[i % 3],
      totalAmount: contractForCapacity(5 + (i % 5) * 2, "residential"),
      createdAt: seedDayAt(0.11 + i * 0.001),
      approvedAt: seedDateAt(0.12 + i * 0.001),
    };
    state.quotations.push(q);
    reserved.push(q);
  }

  if (reserved.length < needed) {
    takeApproved(pipelinePool);
    promoteSentDraft(pipelinePool);
  }

  return reserved.slice(0, needed);
}

function countSoloQuotationCreates(specs: CapabilityProjectSpec[]): number {
  return specs.reduce((sum, spec) => {
    if (spec.kind !== "SOLO_EPC" || spec.edgeTag === "direct-exception") return sum;
    return sum + spec.count;
  }, 0);
}

function partnerForKind(state: AppState, kind: ProjectKind, index: number) {
  const partners = state.partners;
  if (!partners.length) return undefined;
  if (kind === "PARTNER_EPC") {
    return partners.find((p) => p.type === "Profit-Share") ?? partners[index % partners.length];
  }
  if (kind === "FIXED_EPC") {
    return partners.find((p) => p.type === "Fixed-Rate") ?? partners[index % partners.length];
  }
  if (kind === "VENDOR_NETWORK") {
    return partners.find((p) => p.type === "Channel") ?? partners[index % partners.length];
  }
  if (kind === "OUTSOURCED_INC") {
    return partners.find((p) => p.type === "Subcontractor") ?? partners[index % partners.length];
  }
  return undefined;
}

function addSeedCustomer(
  runner: SeedProjectCommandRunner,
  params: { id: string; name: string; index: number },
): Customer {
  const addr = addressAt(params.index);
  const customer: Customer = {
    id: params.id,
    name: params.name,
    phone: `98${String(10000000 + params.index).slice(-8)}`,
    email: `customer${params.index}@seed.local`,
    address: addr.line,
    type: params.index % 3 === 0 ? "company" : "individual",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: seedDayAt(0.06 + params.index * 0.001),
  };
  runner.addCustomer(customer);
  return customer;
}

function buildBaseProjectShell(params: {
  id: string;
  name: string;
  kind: ProjectKind;
  customerId?: string;
  client: string;
  capacity: string;
  location: string;
  contractAmount: number;
  paymentType: CapabilityProjectSpec["paymentType"];
  projectType: Project["projectType"];
  fraction: number;
  quotationId?: string;
}): Project {
  const legacy = LEGACY_KIND_TO_TYPE[params.kind];
  const today = seedDayAt(params.fraction);
  return {
    id: params.id,
    name: params.name,
    projectKind: params.kind,
    projectKindConfigSnapshot: projectKindConfigSnapshot(params.kind),
    projectMode: legacy.projectType,
    vendorshipOwner: legacy.vendorshipOwner,
    partnerRole: legacy.partnerRole,
    executionScope: legacy.executionScope,
    type: params.kind === "INC_GIVEN" || params.kind === "INC" ? "INC" : "EPC",
    projectType: params.projectType,
    projectCategory: "solar",
    ownerType: ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(params.kind) ? "partnership" : "solo",
    lifecycleStatus: "New",
    progressStage: "new",
    client: params.client,
    customerId: params.customerId,
    clientAddress: params.location,
    location: params.location,
    capacity: formatCapacity(Number.parseFloat(params.capacity) || 0),
    contractAmount: params.contractAmount,
    totalCost: roundInr(params.contractAmount * 0.65),
    amountReceived: 0,
    amountInvoiced: 0,
    paymentType: params.paymentType,
    assignees: [],
    onSite: 0,
    photos: 0,
    startDate: today,
    endDate: null,
    createdAt: today,
    quotationId: params.quotationId,
  };
}

function buildIntakePayload(
  spec: CapabilityProjectSpec,
  ctx: {
    customerName: string;
    partnerName?: string;
    subcontractorName?: string;
    incGiverName?: string;
    contractAmount: number;
  },
): ProjectIntakePayload {
  const commercial: ProjectIntakePayload["commercial"] = {
    contractAmount: ctx.contractAmount,
    paymentType: spec.paymentType,
    internalCostEstimate: roundInr(ctx.contractAmount * 0.65),
  };
  const parties: ProjectIntakePayload["parties"] = {};

  switch (spec.kind) {
    case "PARTNER_EPC":
      parties.customer = ctx.customerName;
      parties.partner = ctx.partnerName;
      break;
    case "FIXED_EPC":
      parties.customer = ctx.customerName;
      parties.partner = ctx.partnerName;
      commercial.backendPrice = roundInr(ctx.contractAmount * 0.72);
      commercial.partnerSellPrice = ctx.contractAmount;
      break;
    case "OUTSOURCED_INC":
      parties.customer = ctx.customerName;
      parties.subcontractor = ctx.subcontractorName;
      break;
    case "INC_GIVEN":
      parties.incGiverCompany = ctx.incGiverName;
      break;
    case "INC":
      parties.customer = ctx.customerName;
      break;
    default:
      parties.customer = ctx.customerName;
      break;
  }

  return { kind: spec.kind, parties, commercial };
}

function buildDirectExceptionIntake(
  spec: CapabilityProjectSpec,
  ctx: {
    state: AppState;
    customerName?: string;
    partnerName?: string;
    subcontractorName?: string;
    incGiverName?: string;
    channelName?: string;
    externalNetwork?: string;
    contractAmount: number;
    location: string;
  },
): ProjectIntakePayload {
  const parties: ProjectIntakePayload["parties"] = {};
  const commercial: ProjectIntakePayload["commercial"] = {
    contractAmount: ctx.contractAmount,
    internalCostEstimate: roundInr(ctx.contractAmount * 0.65),
  };

  switch (spec.kind) {
    case "SOLO_EPC":
      parties.customer = ctx.customerName;
      parties.vendorOrDiscom = "MSS own DISCOM code (seed)";
      commercial.paymentType = spec.paymentType;
      break;
    case "VENDOR_NETWORK":
      parties.customer = ctx.customerName;
      parties.channelPartner = ctx.channelName ?? "Channel Partner";
      parties.externalNetwork = ctx.externalNetwork ?? "External Solar Network";
      commercial.commissionRule = "per_kw:1200";
      break;
    case "VENDORSHIP_ONLY":
      parties.customer = ctx.customerName;
      parties.externalNetwork = ctx.externalNetwork ?? ctx.state.vendorshipCompanies[0]?.name ?? "External Network";
      commercial.vendorshipFeeReceivable = ctx.contractAmount;
      break;
    default:
      if (ctx.customerName) parties.customer = ctx.customerName;
      if (ctx.partnerName) parties.partner = ctx.partnerName;
      if (ctx.subcontractorName) parties.subcontractor = ctx.subcontractorName;
      if (ctx.incGiverName) parties.incGiverCompany = ctx.incGiverName;
      commercial.paymentType = spec.paymentType;
      break;
  }

  return {
    kind: spec.kind,
    parties,
    commercial,
    site: {
      projectType: projectTypeFromCategory(spec.category),
      projectCategory: "solar",
      capacity: formatCapacity(spec.capacityKw),
      location: ctx.location,
    },
  };
}

function applySpecLifecyclePatch(
  project: Project,
  spec: CapabilityProjectSpec,
  globalIndex: number,
  state: AppState,
): Partial<Project> {
  const fraction = 0.2 + globalIndex * 0.015;
  const contract =
    spec.kind === "VENDORSHIP_ONLY"
      ? roundInr(85000 + globalIndex * 10000)
      : contractForCapacity(spec.capacityKw || 5, spec.category);
  const partner = partnerForKind(state, spec.kind, globalIndex);

  const patch: Partial<Project> = {
    lifecycleStatus: spec.lifecycle,
    status: legacyStatusFromLifecycle(spec.lifecycle),
    progressStage:
      spec.lifecycle === "Completed"
        ? "completed"
        : spec.lifecycle === "In Progress"
          ? "work-in-progress"
          : spec.lifecycle === "New"
            ? "new"
            : "quotation-sent",
    executionPhase:
      spec.lifecycle === "In Progress"
        ? "Panel installation"
        : spec.lifecycle === "New"
          ? "Intake"
          : undefined,
    executionNotes: globalIndex % 3 === 0 ? "Client prefers weekend-only work" : undefined,
    endDate: spec.lifecycle === "Completed" || spec.lifecycle === "Closed" ? seedDayAt(fraction + 0.4) : undefined,
    archivedAt: spec.edgeTag === "archived-project" ? seedDateAt(fraction + 0.5) : undefined,
    archivedReason: spec.edgeTag === "archived-project" ? "Legacy archive after handover audit" : undefined,
    directCreationReason:
      spec.edgeTag === "direct-exception"
        ? "Urgent hospital backup power — executive approved direct intake"
        : undefined,
    contractAmount: contract,
    bankDocumentationAmount: spec.paymentType !== "cash" ? roundInr(contract * 1.08) : undefined,
    agentId: spec.withAgent ? state.agents[globalIndex % state.agents.length]?.id : project.agentId,
    commissionRate: spec.withAgent ? 800 : undefined,
    commissionRateType: spec.withAgent ? "per-kw" : undefined,
  };

  if (partner && ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(spec.kind)) {
    patch.partners = [{
      partnerId: partner.id,
      partnerName: partner.name,
      partnerType: spec.kind === "FIXED_EPC" ? "fixed" : "profit",
      sharePercentage: 30,
      calculatedEarning: roundInr(contract * 0.12),
      settlementDirection: "company_pays_partner",
    }];
    patch.totalPartnerInvestment = roundInr(contract * 0.15);
  }

  if (spec.kind === "FIXED_EPC") {
    patch.mssBackendAmount = roundInr(contract * 0.72);
    patch.partnerCustomerSellAmount = contract;
    patch.partnershipModel = "fixed_backend";
  }

  if (spec.kind === "VENDOR_NETWORK") {
    patch.vendorNetworkCommissionType = "per_kw";
    patch.vendorNetworkFeePerKw = 1200;
    patch.channelPartnerIdRef = partner?.id;
    patch.loanReceiptHandling = "channel";
  }

  if (spec.kind === "VENDORSHIP_ONLY") {
    const channel = partnerForKind(state, "VENDOR_NETWORK", globalIndex);
    patch.vendorshipFeeReceivable = contract;
    patch.vendorshipCodeOwner = "self";
    patch.externalVendorshipEntity = state.vendorshipCompanies[0]?.name;
    if (channel) {
      patch.partners = [{
        partnerId: channel.id,
        partnerName: channel.name,
        partnerType: "vendorship",
        feeAmount: contract,
        settlementDirection: "partner_pays_company",
        calculatedEarning: roundInr(contract * 0.85),
      }];
      patch.channelPartnerIdRef = channel.id;
    }
  }

  if (spec.kind === "INC_GIVEN") {
    const giver = state.incGiverCompanies[globalIndex % Math.max(state.incGiverCompanies.length, 1)];
    if (giver) {
      patch.customerId = `inc-${giver.id}`;
      patch.client = giver.name;
      patch.scope = {
        hasMaterial: false,
        hasInstallation: true,
        vendorshipOwner: "CLIENT",
        leadSource: "MSS_DIRECT",
        billingParty: "MSS",
        incGiverCompanyId: giver.id,
        rateBasis: "per_kw",
        rateValue: 1200,
      };
    }
    patch.additionalWorkLines = [{
      id: seedId("AWL"),
      description: "Extra conduit routing on east wing",
      basis: "fixed",
      rate: 8500,
      total: 8500,
      addedAt: seedDateAt(fraction + 0.05),
    }];
  }

  if (spec.kind === "INC") {
    patch.incScope = "labour_and_materials";
  }

  if (spec.withOutsource && spec.kind === "OUTSOURCED_INC") {
    const sub = partnerForKind(state, "OUTSOURCED_INC", globalIndex);
    const vendor = state.vendors[globalIndex % state.vendors.length];
    patch.outsource = {
      partyId: sub?.id ?? vendor?.id ?? "",
      partyName: sub?.name ?? vendor?.name ?? "Subcontractor",
      rateBasis: "per_kw",
      rateValue: 3500,
      quantity: spec.capacityKw,
      total: roundInr(3500 * (spec.capacityKw || 5)),
      attachedAt: seedDateAt(fraction),
      notes: "Subcontracted civil + wiring scope",
    };
  }

  return patch;
}

function directExceptionNeedsCustomer(kind: ProjectKind): boolean {
  return kind === "SOLO_EPC" || kind === "VENDOR_NETWORK" || kind === "VENDORSHIP_ONLY";
}

function ensureQuotationCustomerId(quotation: Quotation, customer: Customer | undefined, state: AppState): void {
  if (quotation.customerId?.trim()) return;
  const match = customer?.id
    ?? state.customers.find(
      (c) => c.name.trim().toLowerCase() === quotation.clientName.trim().toLowerCase(),
    )?.id;
  if (match) quotation.customerId = match;
}

function usesDirectExceptionCommand(spec: CapabilityProjectSpec): boolean {
  if (spec.edgeTag === "direct-exception") return true;
  return spec.kind === "VENDOR_NETWORK" || spec.kind === "VENDORSHIP_ONLY";
}

function usesQuotationCommand(spec: CapabilityProjectSpec): boolean {
  return spec.kind === "SOLO_EPC" && spec.edgeTag !== "direct-exception";
}

/** Create all capability-axis projects via command handlers (Issue 0.3). */
export function reseedProjectsViaCommands(state: AppState, profile: SeedProfile): {
  state: AppState;
  entries: ReseedProjectEntry[];
} {
  const specs = capabilityProjectSpecs(profile === "full");
  const runner = new SeedProjectCommandRunner(state);
  const entries: ReseedProjectEntry[] = [];
  let globalIndex = 0;

  const soloQuoteNeed = countSoloQuotationCreates(specs);
  const quotePool = reserveApprovedQuotations(runner.getState(), soloQuoteNeed);
  let quoteIndex = 0;

  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      const fraction = 0.2 + globalIndex * 0.015;
      const addr = addressAt(globalIndex);
      const customer = runner.getState().customers[globalIndex % Math.max(runner.getState().customers.length, 1)];
      const contract =
        spec.kind === "VENDORSHIP_ONLY"
          ? roundInr(85000 + globalIndex * 10000)
          : contractForCapacity(spec.capacityKw || 5, spec.category);
      const partner = partnerForKind(runner.getState(), spec.kind, globalIndex);
      const giver = runner.getState().incGiverCompanies[globalIndex % Math.max(runner.getState().incGiverCompanies.length, 1)];
      const projectName = `${customer?.name ?? companyName(globalIndex)} ${spec.capacityKw || 5}kW ${spec.category}`;

      let result;

      if (usesQuotationCommand(spec)) {
        const quotation = quotePool[quoteIndex++];
        if (!quotation) {
          throw new ProjectReseedError("Insufficient approved quotations for SOLO_EPC reseed", {
            kind: spec.kind,
            globalIndex,
          });
        }
        ensureQuotationCustomerId(quotation, customer, runner.getState());
        result = runner.runCreateFromQuotation({
          quotationId: quotation.id,
          projectName,
          intake: {
            kind: "SOLO_EPC",
            parties: {
              customer: customer?.name ?? quotation.clientName,
              vendorOrDiscom: runner.getState().vendorshipCompanies[0]?.name ?? "MSS DISCOM code",
            },
            commercial: {
              contractAmount: contract,
              paymentType: spec.paymentType,
              internalCostEstimate: roundInr(contract * 0.65),
            },
          },
        });
      } else if (usesDirectExceptionCommand(spec)) {
        const cust =
          customer ??
          addSeedCustomer(runner, {
            id: seedId(SEED_ID_PREFIX.customer),
            name: companyName(globalIndex),
            index: globalIndex,
          });
        result = runner.runCreateDirectException({
          projectName,
          reason:
            spec.edgeTag === "direct-exception"
              ? "Urgent hospital backup power — executive approved direct intake"
              : `Seed direct exception — ${spec.kind}`,
          customerId: directExceptionNeedsCustomer(spec.kind) ? cust.id : undefined,
          intake: buildDirectExceptionIntake(spec, {
            state: runner.getState(),
            customerName: cust.name,
            partnerName: partner?.name,
            channelName: partner?.name,
            externalNetwork: runner.getState().vendorshipCompanies[globalIndex % Math.max(runner.getState().vendorshipCompanies.length, 1)]?.name,
            contractAmount: contract,
            location: addr.line,
          }),
        });
      } else {
        let activeCustomer = customer;
        if (!activeCustomer || spec.kind === "PARTNER_EPC" || spec.kind === "FIXED_EPC") {
          activeCustomer = addSeedCustomer(runner, {
            id: seedId(SEED_ID_PREFIX.customer),
            name: `${partner?.name ?? "Partner"} — ${companyName(globalIndex)}`,
            index: globalIndex,
          });
        }
        const shell = applyLegacyTaxonomy(
          buildBaseProjectShell({
            id: seedId(SEED_ID_PREFIX.project),
            name: projectName,
            kind: spec.kind,
            customerId: spec.kind === "INC_GIVEN" ? `inc-${giver?.id ?? "unknown"}` : activeCustomer?.id,
            client: spec.kind === "INC_GIVEN" ? giver?.name ?? "INC Giver" : activeCustomer?.name ?? companyName(globalIndex),
            capacity: formatCapacity(spec.capacityKw),
            location: addr.line,
            contractAmount: contract,
            paymentType: spec.paymentType,
            projectType: projectTypeFromCategory(spec.category),
            fraction,
          }),
          spec.kind,
          spec.withOutsource
            ? {
                outsource: {
                  partyId: partnerForKind(runner.getState(), "OUTSOURCED_INC", globalIndex)?.id ?? "",
                  partyName: partnerForKind(runner.getState(), "OUTSOURCED_INC", globalIndex)?.name ?? "Subcontractor",
                  rateBasis: "per_kw",
                  rateValue: 3500,
                  quantity: spec.capacityKw,
                  total: roundInr(3500 * (spec.capacityKw || 5)),
                  attachedAt: seedDateAt(fraction),
                  notes: "Subcontracted civil + wiring scope",
                },
              }
            : undefined,
        );
        result = runner.runCreateIntake({
          project: shell,
          intake: buildIntakePayload(spec, {
            customerName: activeCustomer?.name ?? companyName(globalIndex),
            partnerName: partner?.name,
            subcontractorName: partnerForKind(runner.getState(), "OUTSOURCED_INC", globalIndex)?.name,
            incGiverName: giver?.name,
            contractAmount: contract,
          }),
        });
      }

      if (!result.ok) {
        throw new ProjectReseedError(
          `Command failed for ${spec.kind} (#${globalIndex}): ${result.message}`,
          { kind: spec.kind, globalIndex, errorCode: result.errorCode },
        );
      }

      const projectId = result.result!.projectId;
      const created = runner.getState().projects.find((p) => p.id === projectId);
      if (created) {
        runner.patchProject(projectId, applySpecLifecyclePatch(created, spec, globalIndex, runner.getState()));
      }
      entries.push({ projectId, spec, globalIndex });
      globalIndex++;
    }
  }

  return { state: runner.getState(), entries };
}
