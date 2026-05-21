import type { AppState } from "@/contexts/AppDataContext";
import type { Project, SiteRecord } from "@/types/project";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { legacyStatusFromLifecycle } from "@/domain/stateMachines/projectStateMachine";
import type { SeedProfile } from "./seedLayerOrder";
import { capabilityProjectSpecs } from "./seedCapabilityAxis";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { addressAt, companyName } from "./seedNames";
import {
  applyLegacyTaxonomy, contractForCapacity, pushAudit, roundInr,
} from "./seedHelpers";
import { attachProjectBundle } from "./seedProjectBundles";

function partnerForKind(state: AppState, kind: ProjectKind, index: number) {
  const partners = state.partners;
  if (!partners.length) return undefined;
  if (["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(kind)) {
    return partners[index % partners.length];
  }
  if (kind === "VENDORSHIP_ONLY") return undefined;
  return undefined;
}

function buildProjectFromSpec(
  state: AppState,
  spec: ReturnType<typeof capabilityProjectSpecs>[0],
  index: number,
  globalIndex: number,
): { project: Project; site: SiteRecord } {
  const customer = state.customers[globalIndex % state.customers.length];
  const quotation = state.quotations.find((q) => q.status === "approved" || q.status === "converted_to_project") ?? state.quotations[globalIndex % state.quotations.length];
  const fraction = 0.2 + globalIndex * 0.015;
  const contract = spec.kind === "VENDORSHIP_ONLY"
    ? roundInr(85000 + index * 10000)
    : contractForCapacity(spec.capacityKw || 5, spec.category);
  const projectId = seedId(SEED_ID_PREFIX.project);
  const addr = addressAt(globalIndex);
  const partner = partnerForKind(state, spec.kind, globalIndex);

  let project: Project = {
    id: projectId,
    name: `${customer?.name ?? companyName(globalIndex)} ${spec.capacityKw || 5}kW ${spec.category}`,
    projectType: spec.category === "residential" ? "Residential" : spec.category === "commercial" ? "Commercial" : "Industrial",
    projectCategory: "solar",
    type: spec.kind === "INC" || spec.kind === "INC_GIVEN" ? "INC" : "EPC",
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
    client: customer?.name ?? companyName(globalIndex),
    clientAddress: customer?.address ?? addr.line,
    state: addr.state,
    clientPhone: customer?.phone,
    clientEmail: customer?.email,
    clientGstin: customer?.gstin,
    customerId: customer?.id,
    capacity: `${spec.capacityKw || 5} kW`,
    location: addr.line,
    contractAmount: contract,
    amountReceived: 0,
    amountInvoiced: 0,
    paymentType: spec.paymentType,
    bankDocumentationAmount: spec.paymentType !== "cash" ? roundInr(contract * 1.08) : undefined,
    quotationId: spec.edgeTag === "direct-exception" ? undefined : quotation?.id,
    agentId: spec.withAgent ? state.agents[globalIndex % state.agents.length]?.id : quotation?.agentId,
    commissionRate: spec.withAgent ? 800 : undefined,
    commissionRateType: "per-kw",
    startDate: seedDayAt(fraction),
    createdAt: seedDayAt(fraction - 0.01),
    endDate: spec.lifecycle === "Completed" || spec.lifecycle === "Closed" ? seedDayAt(fraction + 0.4) : undefined,
    archivedAt: spec.edgeTag === "archived-project" ? seedDateAt(fraction + 0.5) : undefined,
    archivedReason: spec.edgeTag === "archived-project" ? "Legacy archive after handover audit" : undefined,
    directCreationReason: spec.edgeTag === "direct-exception" ? "Urgent hospital backup power — executive approved direct intake" : undefined,
  };

  project = applyLegacyTaxonomy(project, spec.kind, {
    outsource: spec.withOutsource ? {
      partyId: state.vendors[globalIndex % state.vendors.length]?.id,
      partyName: state.vendors[globalIndex % state.vendors.length]?.name,
      rateBasis: "per_kw",
      rateValue: 3500,
      quantity: spec.capacityKw,
      total: roundInr(3500 * (spec.capacityKw || 5)),
      attachedAt: seedDateAt(fraction),
      notes: "Subcontracted civil + wiring scope",
    } : null,
  });

  if (partner && ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(spec.kind)) {
    project.partners = [{
      partnerId: partner.id,
      partnerName: partner.name,
      partnerType: spec.kind === "FIXED_EPC" ? "fixed" : spec.kind === "VENDOR_NETWORK" ? "profit" : "profit",
      sharePercentage: 30,
      calculatedEarning: roundInr(contract * 0.12),
      settlementDirection: "company_pays_partner",
    }];
    project.totalPartnerInvestment = roundInr(contract * 0.15);
  }

  if (spec.kind === "FIXED_EPC") {
    project.mssBackendAmount = roundInr(contract * 0.72);
    project.partnerCustomerSellAmount = contract;
    project.partnershipModel = "fixed_backend";
  }

  if (spec.kind === "VENDOR_NETWORK") {
    project.vendorNetworkCommissionType = "per_kw";
    project.vendorNetworkFeePerKw = 1200;
    project.channelPartnerIdRef = partner?.id;
    project.loanReceiptHandling = "channel";
  }

  if (spec.kind === "VENDORSHIP_ONLY") {
    project.vendorshipFeeReceivable = contract;
    project.vendorshipCodeOwner = "self";
    project.externalVendorshipEntity = state.vendorshipCompanies[0]?.name;
  }

  if (spec.kind === "INC_GIVEN") {
    const giver = state.incGiverCompanies[globalIndex % Math.max(state.incGiverCompanies.length, 1)];
    if (giver) {
      project.customerId = `inc-${giver.id}`;
      project.client = giver.name;
      project.scope = {
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
    project.additionalWorkLines = [{
      id: seedId("AWL"),
      description: "Extra conduit routing on east wing",
      basis: "fixed",
      rate: 8500,
      total: 8500,
      addedAt: seedDateAt(fraction + 0.05),
    }];
  }

  if (spec.kind === "INC") {
    project.incScope = "labour_and_materials";
  }

  if (quotation && spec.edgeTag !== "direct-exception") {
    quotation.linkedProjectId = projectId;
    if (quotation.status === "approved") quotation.status = "converted_to_project";
  }

  const site: SiteRecord = {
    id: seedId(SEED_ID_PREFIX.site),
    name: `${project.name} — Main Site`,
    projectId: project.id,
    projectName: project.name,
    status: spec.lifecycle === "Completed" ? "completed" : spec.lifecycle === "On Hold" ? "on-hold" : "active",
    workStartDate: seedDayAt(fraction + 0.02),
  };
  state.sites.push(site);

  if (spec.multiSite) {
    const site2: SiteRecord = {
      id: seedId(SEED_ID_PREFIX.site),
      name: `${project.name} — Block B`,
      projectId: project.id,
      projectName: project.name,
      status: "active",
      workStartDate: seedDayAt(fraction + 0.03),
    };
    state.sites.push(site2);
  }

  return { project, site };
}

/** L5 — projects, sites, timelines via bundles. */
export function buildL5ProjectsSites(state: AppState, profile: SeedProfile): AppState {
  const specs = capabilityProjectSpecs(profile === "full");
  let globalIndex = 0;

  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      const { project, site } = buildProjectFromSpec(state, spec, i, globalIndex);
      state.projects.push(project);
      attachProjectBundle({
        state,
        project,
        site,
        fraction: 0.2 + globalIndex * 0.015,
        index: globalIndex,
        richTimeline: spec.richTimeline,
      });
      globalIndex++;
    }
  }

  pushAudit(state, {
    action: "create",
    entityType: "Project",
    entityId: state.projects[0]?.id ?? "",
    entityName: state.projects[0]?.name ?? "",
    fraction: 0.21,
    role: "admin",
  });

  return state;
}
