import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import { createId } from "@/lib/idFactory";
import { MATERIAL_CATEGORY_OPTIONS } from "@/lib/formCategories";
import type { Enquiry, Project, ProjectSiteChecklistItem, Quotation, Task } from "@/types/project";
import type {
  Agent,
  Invoice,
  Loan,
  Partner,
  PartnerType,
  Subcontractor,
  VendorshipCompany,
  INCGiverCompany,
} from "@/types/finance";
import type { VendorBill, InventoryItem } from "@/types/inventory";
import type { SiteChecklistTemplate, QuotationTemplate } from "@/types/templates";
import type { useDataEngineStore } from "./useDataEngineStore";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { projectSiteChecklistToSiteChecklistItems } from "@/lib/siteChecklistNeedToGetSync";
import type { SiteRecord } from "@/types/project";
import {
  SHOWCASE_SCENARIOS,
  PIPELINE_EXTRA_STEPS,
  lifecycleToStage,
  lifecycleStageIndex,
  getShowcaseScenarioCount,
  getPipelineExtraCount,
  SHOWCASE_PROJECT_KINDS,
  type ShowcaseLifecycle,
  type ShowcaseScenario,
} from "./smartGeneratorScenarios";

export { getShowcaseScenarioCount, getPipelineExtraCount } from "./smartGeneratorScenarios";
import { addDays, subDays } from "date-fns";

const REALISTIC_FIRST_NAMES = [
  "Rajesh", "Amit", "Priya", "Sneha", "Vikram", "Neha", "Rahul", "Pooja", "Suresh", "Kavita",
];
const REALISTIC_LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Deshmukh", "Joshi", "Iyer", "Chauhan",
];
const REALISTIC_VENDOR_TYPES = ["Cables", "Electronics", "Logistics", "Hardware", "Steel", "Fabrication"];

/** Curated master-data counts — depth over volume. */
export const GENERATOR_ENTITY_LIMITS = {
  employees: 5,
  agents: 5,
  partnersPerType: 1,
  vendors: 4,
  teams: 3,
  inventoryItems: 20,
  tools: 11,
  loans: 2,
  vendorshipCompanies: 2,
  incGiverCompanies: 2,
  subcontractors: 2,
  siteChecklistTemplates: 2,
  quotationTemplates: 2,
  attendanceRecords: 10,
  loanRepayments: 2,
  toolMovements: 2,
} as const;

const PARTNER_TYPES: PartnerType[] = ["Profit-Share", "Fixed-Rate", "Channel"];

/** @deprecated Use SHOWCASE_PROJECT_KINDS — kept for tests importing PROJECT_TYPES. */
export const PROJECT_TYPES = SHOWCASE_PROJECT_KINDS;

function getRandomName(idx: number) {
  return `${REALISTIC_FIRST_NAMES[idx % REALISTIC_FIRST_NAMES.length]} ${REALISTIC_LAST_NAMES[idx % REALISTIC_LAST_NAMES.length]}`;
}

function getRandomVendor(idx: number) {
  return `${REALISTIC_LAST_NAMES[idx % REALISTIC_LAST_NAMES.length]} ${REALISTIC_VENDOR_TYPES[idx % REALISTIC_VENDOR_TYPES.length]}`;
}

function getRandomCompany(idx: number) {
  return `${REALISTIC_LAST_NAMES[idx % REALISTIC_LAST_NAMES.length]} Solar ${idx + 1}`;
}

function partnerTypeForKind(kind: ProjectKind): PartnerType {
  switch (kind) {
    case "FIXED_EPC":
      return "Fixed-Rate";
    case "VENDOR_NETWORK":
      return "Channel";
    default:
      return "Profit-Share";
  }
}

function dealOriginForKind(kind: ProjectKind): Project["dealOrigin"] {
  switch (kind) {
    case "PARTNER_EPC":
    case "FIXED_EPC":
    case "VENDOR_NETWORK":
      return "PARTNER";
    case "INC_GIVEN":
      return "INC_TAKEN";
    case "OUTSOURCED_INC":
      return "OUTSOURCED_INC";
    case "VENDORSHIP_ONLY":
      return "VENDORSHIP_ONLY";
    default:
      return "DIRECT";
  }
}

function pickPartner(ctx: () => Record<string, unknown>, kind: ProjectKind, idx: number): Partner | undefined {
  const type = partnerTypeForKind(kind);
  const matches = (ctx().partners as Partner[]).filter((p) => p.type === type);
  return matches[idx % Math.max(1, matches.length)];
}

function pickSubcontractor(ctx: () => Record<string, unknown>, idx: number): Subcontractor | undefined {
  const rows = (ctx().subcontractors as Subcontractor[]) ?? [];
  return rows[idx % Math.max(1, rows.length)];
}

function pickAgent(ctx: () => Record<string, unknown>, idx: number): Agent | undefined {
  const agents = ctx().agents as Agent[];
  return agents[idx % Math.max(1, agents.length)];
}

function pickIncGiver(ctx: () => Record<string, unknown>, idx: number): INCGiverCompany | undefined {
  const rows = ctx().incGiverCompanies as INCGiverCompany[];
  return rows[idx % Math.max(1, rows.length)];
}

function pickVendorshipCompany(ctx: () => Record<string, unknown>, idx: number): VendorshipCompany | undefined {
  const rows = ctx().vendorshipCompanies as VendorshipCompany[];
  return rows[idx % Math.max(1, rows.length)];
}

/** Low-stock SKUs (bootstrap sets stock 2–4 on first items) — required qty exceeds stock for Need-to-Get. */
const NEED_TO_GET_MATERIAL_COUNT = 6;

function buildSiteChecklist(
  inventory: InventoryItem[],
  lifecycle: ShowcaseLifecycle,
  scenarioIndex: number,
): ProjectSiteChecklistItem[] {
  const materials = inventory.slice(0, NEED_TO_GET_MATERIAL_COUNT);
  return materials.map((item, i) => {
    const planned = 18 + i * 4 + (scenarioIndex % 3) * 2;
    const sent = lifecycle === "completed" ? planned : 0;
    return {
      id: createId("CL"),
      name: item.name,
      category: item.category,
      unit: item.unit || "pcs",
      qtyPlanned: planned,
      qtySent: sent,
      qtyReturned: 0,
      qtyConsumed: lifecycle === "completed" ? sent : 0,
      unitPrice: item.buyPrice,
      source: "template" as const,
    };
  });
}

function buildProjectDraft(
  ctx: () => Record<string, unknown>,
  scenario: ShowcaseScenario,
  idx: number,
  customerId: string,
  enquiryId: string,
  quotationId: string,
  dateNow: string,
): Project {
  const pType = scenario.projectKind;
  const stage = lifecycleToStage(scenario.lifecycle);
  const legacy = LEGACY_KIND_TO_TYPE[pType];
  const partner = pickPartner(ctx, pType, idx);
  const subcontractor = pickSubcontractor(ctx, idx);
  const agent = pickAgent(ctx, idx);
  const incGiver = pickIncGiver(ctx, idx);
  const vendorshipCo = pickVendorshipCompany(ctx, idx);
  const contractAmount = 250000 + idx * 15000;
  const inventory = ctx().inventoryItems as InventoryItem[];
  const isFresh = scenario.lifecycle === "fresh";
  const isCompleted = scenario.lifecycle === "completed";
  const siteChecklist =
    pType !== "VENDORSHIP_ONLY" && !isFresh
      ? buildSiteChecklist(inventory, scenario.lifecycle, idx)
      : undefined;

  const scope: Project["scope"] =
    pType === "INC_GIVEN"
      ? {
          hasMaterial: false,
          hasInstallation: true,
          vendorshipOwner: "CLIENT",
          leadSource: "MSS_DIRECT",
          billingParty: "MSS",
          incGiverCompanyId: incGiver?.id,
          rateBasis: "per_kw",
          rateValue: 1200,
        }
      : pType === "OUTSOURCED_INC"
        ? {
            hasMaterial: false,
            hasInstallation: true,
            vendorshipOwner: "CLIENT",
            leadSource: "MSS_DIRECT",
            billingParty: "MSS",
            installationBy: "Subcontractor",
          }
        : pType === "VENDORSHIP_ONLY"
          ? {
              hasMaterial: false,
              hasInstallation: false,
              vendorshipOwner: "MSS",
              leadSource: "PARTNER",
              billingParty: "MSS",
              vendorshipCompanyId: vendorshipCo?.id,
              vendorshipFeeAmount: 3500,
            }
          : ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(pType)
            ? {
                hasMaterial: pType !== "VENDOR_NETWORK",
                hasInstallation: true,
                vendorshipOwner: "PARTNER",
                leadSource: "PARTNER",
                partnerId: partner?.id,
                billingParty: "MSS",
                partnerBillingFeePercentage: pType === "VENDOR_NETWORK" ? 9 : undefined,
                profitSharePercent: pType === "PARTNER_EPC" ? 20 : undefined,
                fixedRatePerKw: pType === "FIXED_EPC" ? 800 : undefined,
              }
            : {
                hasMaterial: true,
                hasInstallation: true,
                vendorshipOwner: "MSS",
                leadSource: agent ? "AGENT" : "MSS_DIRECT",
                billingParty: "MSS",
                agentId: agent?.id,
                kNumber: `K${1000 + idx}`,
              };

  const partners =
    partner && ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(pType)
      ? [
          {
            partnerId: partner.id,
            partnerName: partner.name,
            partnerType:
              pType === "FIXED_EPC" ? ("fixed" as const) : pType === "VENDOR_NETWORK" ? ("vendorship" as const) : ("profit" as const),
            sharePercentage: pType === "PARTNER_EPC" ? 20 : undefined,
            fixedAmount: pType === "FIXED_EPC" ? 4000 : undefined,
            feeAmount: pType === "VENDOR_NETWORK" ? 2500 : undefined,
            calculatedEarning: isCompleted ? 5000 : 0,
            settlementDirection: "company_pays_partner" as const,
          },
        ]
      : undefined;

  const outsource =
    pType === "OUTSOURCED_INC" && subcontractor
      ? {
          partyId: subcontractor.id,
          partyName: subcontractor.name,
          rateBasis: "fixed" as const,
          rateValue: contractAmount,
          total: contractAmount,
          attachedAt: dateNow,
        }
      : null;

  const clientName = pType === "INC_GIVEN" ? (incGiver?.name ?? "INC Giver Co") : scenario.customerName;
  const teams = ctx().teams as { id: string }[];
  const teamId = teams[idx % Math.max(1, teams.length)]?.id;

  const draft: Project = {
    id: createId("PRJ"),
    name: `${clientName} — ${scenario.label}`,
    client: clientName,
    customerId,
    quotationId,
    enquiryId,
    startDate: dateNow.split("T")[0],
    endDate: isCompleted ? dateNow.split("T")[0] : undefined,
    status: stage,
    lifecycleStatus: stage,
    projectKind: pType,
    projectKindConfigSnapshot: projectKindConfigSnapshot(pType),
    projectMode: legacy.projectType,
    vendorshipOwner:
      pType === "INC_GIVEN"
        ? "none"
        : pType === "VENDORSHIP_ONLY"
          ? "MSS"
          : legacy.vendorshipOwner === "partner"
            ? "PARTNER"
            : "MSS",
    partnerRole: legacy.partnerRole,
    executionScope: legacy.executionScope,
    dealOrigin: dealOriginForKind(pType),
    type: pType === "INC_GIVEN" || pType === "OUTSOURCED_INC" ? "INC" : "EPC",
    projectType: "Residential",
    projectCategory: "solar",
    capacity: "5 kW",
    location: "Mumbai",
    contractAmount,
    amountInvoiced: isCompleted ? contractAmount : isFresh ? 0 : Math.floor(contractAmount * 0.4),
    amountReceived: isCompleted ? contractAmount : isFresh ? 0 : Math.floor(contractAmount * 0.2),
    createdAt: dateNow,
    history: [],
    paymentType: "cash",
    scope,
    partners,
    outsource,
    agentId: agent?.id,
    agentName: agent?.name,
    teamId,
    siteChecklist,
    vendorshipFeeReceivable: pType === "VENDORSHIP_ONLY" ? 3500 : undefined,
    internalCostEstimate: 90000,
    backendPrice: pType === "FIXED_EPC" ? 40000 : undefined,
    partnerSellPrice: pType === "FIXED_EPC" ? contractAmount : undefined,
    commissionRule: pType === "VENDOR_NETWORK" ? "9% channel fee" : undefined,
    incScope: pType === "OUTSOURCED_INC" ? "installation_commissioning" : undefined,
  };

  Object.assign(draft, {
    partner: partner?.name,
    channelPartner: pType === "VENDOR_NETWORK" ? partner?.name : undefined,
    externalNetwork: pType === "VENDOR_NETWORK" ? "Regional Solar Network" : undefined,
    subcontractor: subcontractor?.name,
    incGiverCompany: incGiver?.name,
    vendorOrDiscom: vendorshipCo?.name ?? "MSS DISCOM Code",
  });

  return draft;
}

let generatorStateIndex = 0;
let pipelineExtraIndex = 0;
let bootstrapEmployeesCreated = 0;
let bootstrapAgentsCreated = 0;
let bootstrapPartnersCreated: Partial<Record<PartnerType, number>> = {};
let bootstrapVendorsCreated = 0;
let bootstrapTeamsCreated = 0;
let bootstrapInventoryCreated = 0;
let bootstrapToolsCreated = 0;
let bootstrapLoansCreated = 0;
let bootstrapVendorshipCosCreated = 0;
let bootstrapIncGiversCreated = 0;
let bootstrapSubcontractorsCreated = 0;
let bootstrapSiteTemplatesCreated = 0;
let bootstrapQuotationTemplatesCreated = 0;
let bootstrapAttendanceCreated = 0;
let bootstrapLoanRepaymentsCreated = 0;
let bootstrapToolMovementsCreated = 0;

type PendingScenario = {
  scenarioIndex: number;
  scenario: ShowcaseScenario;
  step: "customer" | "enquiry" | "quotation" | "project" | "artifacts";
  stageIndex: number;
  customerId: string;
  enquiryId?: string;
  quotationId?: string;
  projectId?: string;
};

let pendingScenario: PendingScenario | null = null;

function bootstrapStepCount(): number {
  return (
    GENERATOR_ENTITY_LIMITS.employees +
    GENERATOR_ENTITY_LIMITS.agents +
    PARTNER_TYPES.length * GENERATOR_ENTITY_LIMITS.partnersPerType +
    GENERATOR_ENTITY_LIMITS.vendors +
    GENERATOR_ENTITY_LIMITS.teams +
    GENERATOR_ENTITY_LIMITS.inventoryItems +
    GENERATOR_ENTITY_LIMITS.tools +
    GENERATOR_ENTITY_LIMITS.loans +
    GENERATOR_ENTITY_LIMITS.vendorshipCompanies +
    GENERATOR_ENTITY_LIMITS.incGiverCompanies +
    GENERATOR_ENTITY_LIMITS.subcontractors +
    GENERATOR_ENTITY_LIMITS.siteChecklistTemplates +
    GENERATOR_ENTITY_LIMITS.quotationTemplates +
    GENERATOR_ENTITY_LIMITS.attendanceRecords +
    GENERATOR_ENTITY_LIMITS.loanRepayments +
    GENERATOR_ENTITY_LIMITS.toolMovements
  );
}

function bootstrapDoneCount(): number {
  return (
    bootstrapEmployeesCreated +
    bootstrapAgentsCreated +
    Object.values(bootstrapPartnersCreated).reduce((s, n) => s + n, 0) +
    bootstrapVendorsCreated +
    bootstrapTeamsCreated +
    bootstrapInventoryCreated +
    bootstrapToolsCreated +
    bootstrapLoansCreated +
    bootstrapVendorshipCosCreated +
    bootstrapIncGiversCreated +
    bootstrapSubcontractorsCreated +
    bootstrapSiteTemplatesCreated +
    bootstrapQuotationTemplatesCreated +
    bootstrapAttendanceCreated +
    bootstrapLoanRepaymentsCreated +
    bootstrapToolMovementsCreated
  );
}

/** After showcase run: guarantee dashboard Need-to-Get shortfalls (low-stock SKUs vs active site BOQ). */
export function ensureProcurementShortfallShowcase(ctx: () => Record<string, unknown>): void {
  const inventory = (ctx().inventoryItems as InventoryItem[]) ?? [];
  const projects = (ctx().projects as Project[]) ?? [];
  const sites = (ctx().sites as SiteRecord[]) ?? [];
  const vendorBills = (ctx().vendorBills as VendorBill[]) ?? [];
  const reservations =
    (ctx().materialReservations as { itemId: string; qty: number; projectId?: string; releasedAt?: string }[]) ??
    [];

  const svc = new NeedToGetService();
  const existing = svc.buildRows(
    sites,
    projects,
    inventory,
    vendorBills,
    reservations,
    (ctx().materialDamageRecords as never[]) ?? [],
  );
  if (existing.length > 0) return;

  for (let idx = 0; idx < Math.min(NEED_TO_GET_MATERIAL_COUNT, inventory.length); idx++) {
    const item = inventory[idx];
    if ((item.stock ?? 0) > 0) {
      ctx().updateInventoryItem(String(item.id), { stock: 0 });
    }
  }

  const inProgress = projects.filter((p) => lifecycleToStage("active") === (p.lifecycleStatus ?? p.status));
  for (const project of inProgress) {
    if (!project.siteChecklist?.length) continue;
    const siteExists = sites.some((s) => s.projectId === project.id);
    if (siteExists) continue;
    const siteChecklistItems = projectSiteChecklistToSiteChecklistItems(
      project.siteChecklist,
      inventory,
    );
    ctx().addSite({
      id: String(2000 + sites.length),
      name: "Main Site",
      projectId: project.id,
      projectName: project.name,
      workStartDate: addDays(new Date(), 7).toISOString().split("T")[0],
      status: "active",
      checklistItems: siteChecklistItems,
    });
  }
}

export function resetExhaustiveGeneratorState() {
  generatorStateIndex = 0;
  pipelineExtraIndex = 0;
  pendingScenario = null;
  bootstrapEmployeesCreated = 0;
  bootstrapAgentsCreated = 0;
  bootstrapPartnersCreated = {};
  bootstrapVendorsCreated = 0;
  bootstrapTeamsCreated = 0;
  bootstrapInventoryCreated = 0;
  bootstrapToolsCreated = 0;
  bootstrapLoansCreated = 0;
  bootstrapVendorshipCosCreated = 0;
  bootstrapIncGiversCreated = 0;
  bootstrapSubcontractorsCreated = 0;
  bootstrapSiteTemplatesCreated = 0;
  bootstrapQuotationTemplatesCreated = 0;
  bootstrapAttendanceCreated = 0;
  bootstrapLoanRepaymentsCreated = 0;
  bootstrapToolMovementsCreated = 0;
}

export function getExhaustiveGeneratorIndex() {
  return generatorStateIndex;
}

export function getExhaustiveTotalPermutations(): number {
  return getShowcaseScenarioCount() + getPipelineExtraCount();
}

export function isExhaustiveGenerationComplete(): boolean {
  const total = getExhaustiveTotalPermutations();
  return (
    generatorStateIndex >= getShowcaseScenarioCount() &&
    pipelineExtraIndex >= getPipelineExtraCount() &&
    pendingScenario === null &&
    bootstrapComplete()
  );
}

export function getExhaustiveGenerationProgressPercent(): number {
  if (!bootstrapComplete()) {
    const steps = bootstrapStepCount();
    const done = bootstrapDoneCount();
    return Math.min(35, Math.round((done / steps) * 35));
  }
  const scenarioTotal = getShowcaseScenarioCount();
  const pipelineTotal = getPipelineExtraCount();
  const scenarioProgress = scenarioTotal > 0 ? (generatorStateIndex / scenarioTotal) * 60 : 60;
  const pipelineProgress = pipelineTotal > 0 ? (pipelineExtraIndex / pipelineTotal) * 5 : 5;
  return Math.min(100, Math.round(35 + scenarioProgress + pipelineProgress));
}

function bootstrapComplete(): boolean {
  const partnersDone = PARTNER_TYPES.every(
    (t) => (bootstrapPartnersCreated[t] ?? 0) >= GENERATOR_ENTITY_LIMITS.partnersPerType,
  );
  return (
    bootstrapEmployeesCreated >= GENERATOR_ENTITY_LIMITS.employees &&
    bootstrapAgentsCreated >= GENERATOR_ENTITY_LIMITS.agents &&
    partnersDone &&
    bootstrapVendorsCreated >= GENERATOR_ENTITY_LIMITS.vendors &&
    bootstrapTeamsCreated >= GENERATOR_ENTITY_LIMITS.teams &&
    bootstrapInventoryCreated >= GENERATOR_ENTITY_LIMITS.inventoryItems &&
    bootstrapToolsCreated >= GENERATOR_ENTITY_LIMITS.tools &&
    bootstrapLoansCreated >= GENERATOR_ENTITY_LIMITS.loans &&
    bootstrapVendorshipCosCreated >= GENERATOR_ENTITY_LIMITS.vendorshipCompanies &&
    bootstrapIncGiversCreated >= GENERATOR_ENTITY_LIMITS.incGiverCompanies &&
    bootstrapSubcontractorsCreated >= GENERATOR_ENTITY_LIMITS.subcontractors &&
    bootstrapSiteTemplatesCreated >= GENERATOR_ENTITY_LIMITS.siteChecklistTemplates &&
    bootstrapQuotationTemplatesCreated >= GENERATOR_ENTITY_LIMITS.quotationTemplates &&
    bootstrapAttendanceCreated >= GENERATOR_ENTITY_LIMITS.attendanceRecords &&
    bootstrapLoanRepaymentsCreated >= GENERATOR_ENTITY_LIMITS.loanRepayments &&
    bootstrapToolMovementsCreated >= GENERATOR_ENTITY_LIMITS.toolMovements
  );
}

async function runScenarioArtifacts(
  ctx: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
  flow: PendingScenario,
  dateNow: string,
) {
  const { scenario, stageIndex, projectId, customerId } = flow;
  const customerName = scenario.customerName;
  const pType = scenario.projectKind;
  if (!projectId) return;

  if (scenario.lifecycle === "fresh") {
    store.addLog("info", `Skipped execution artifacts for fresh project ${projectId}`, "scenario");
    return;
  }

  const completed = scenario.lifecycle === "completed";
  const active = scenario.lifecycle === "active";
  const inventory = ctx().inventoryItems as InventoryItem[];
  const projects = ctx().projects as Project[];
  const project = projects.find((p) => p.id === projectId);
  const contractAmount = project?.contractAmount ?? 250000;

  if (pType !== "VENDORSHIP_ONLY") {
    const siteNumericId = 1000 + flow.scenarioIndex;
    const siteId = String(siteNumericId);
    const siteChecklist = buildSiteChecklist(inventory, scenario.lifecycle, flow.scenarioIndex);
    const siteChecklistItems = projectSiteChecklistToSiteChecklistItems(siteChecklist, inventory);

    const existingSites = (ctx().sites as { id: string; projectId: string }[]) ?? [];
    if (!existingSites.some((s) => s.projectId === projectId)) {
      ctx().addSite({
        id: siteId,
        name: "Main Site",
        projectId,
        projectName: project?.name ?? scenario.label,
        workStartDate: subDays(new Date(), completed ? 30 : 7).toISOString().split("T")[0],
        status: completed ? "completed" : "active",
        checklistItems: siteChecklistItems,
      });
    }

    ctx().updateProject(projectId, {
      siteChecklist,
      teamId: project?.teamId,
      lifecycleStatus: lifecycleToStage(scenario.lifecycle),
      status: lifecycleToStage(scenario.lifecycle),
      amountReceived: completed ? contractAmount : active ? Math.floor(contractAmount * 0.2) : 0,
      amountInvoiced: completed ? contractAmount : active ? Math.floor(contractAmount * 0.4) : 0,
    });

    const teams = ctx().teams as { id: string }[];
    const scheduledDate = completed
      ? subDays(new Date(), 5).toISOString().split("T")[0]
      : addDays(new Date(), 3).toISOString().split("T")[0];
    const today = dateNow.split("T")[0];
    const installId = ctx().addScheduledInstallation({
      id: createId("INST"),
      projectId,
      scheduledDate,
      teamId: teams[flow.scenarioIndex % Math.max(1, teams.length)]?.id,
      status: completed ? "completed" : "scheduled",
      notes: `Showcase install — ${scenario.label}`,
      createdAt: dateNow,
      ...(scheduledDate < today
        ? { pastDateOverrideReason: "Showcase completed install backdated for autonomous demo data" }
        : {}),
    });
    if (installId) {
      store.incrementCounter("schedules");
      store.addLog("success", `Scheduled installation: ${installId} on ${scheduledDate}`, "entity");
    } else {
      store.addLog("warn", `Skipped installation schedule for ${projectId} (validation)`, "entity");
    }

    if (completed) {
      ctx().addSiteVisit({
        id: createId("SV"),
        projectId,
        visitedBy: "Field Lead",
        visitDate: subDays(new Date(), 3).toISOString().split("T")[0],
        items: siteChecklist.slice(0, 2).map((line) => ({
          name: line.name,
          requiredQty: line.qtyPlanned,
          unit: line.unit,
        })),
        reconciledChecklistAt: dateNow,
        createdAt: dateNow,
      });
      store.incrementCounter("siteVisits");
    }

    const employees = ctx().employees as { id: string }[];
    const emp = employees[flow.scenarioIndex % Math.max(1, employees.length)];
    if (emp && active) {
      ctx().addAttendanceRecord({
        id: createId("ATT"),
        employeeId: emp.id,
        date: dateNow.split("T")[0],
        status: "present",
        sites: [projectId],
        notes: `On site — ${scenario.label}`,
      });
      store.incrementCounter("attendanceLogs");
    }

    const targetEmp = employees[flow.scenarioIndex % Math.max(1, employees.length)];
    if (targetEmp) {
      await ctx().addTask({
        id: createId("TSK"),
        projectId,
        siteId,
        siteName: "Main Site",
        workType: completed ? "Commissioning" : "Installation",
        notes: `Showcase task — ${scenario.label}`,
        createdDate: dateNow,
        employeeId: targetEmp.id,
        workDate: dateNow.split("T")[0],
        status: completed ? "done" : "started",
        createdBy: "Data Engine",
      } as Task);
    }
  }

  const targetVendor = (ctx().vendors as { id: string }[])[flow.scenarioIndex % GENERATOR_ENTITY_LIMITS.vendors];
  const billStockItems = inventory.slice(NEED_TO_GET_MATERIAL_COUNT, NEED_TO_GET_MATERIAL_COUNT + 2);
  if (
    completed &&
    targetVendor &&
    billStockItems.length > 0 &&
    !["INC_GIVEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"].includes(pType)
  ) {
    const bill: VendorBill = {
      id: createId("VB"),
      vendorId: targetVendor.id,
      billNumber: `VB-${flow.scenarioIndex}`,
      billDate: dateNow.split("T")[0],
      dueDate: addDays(new Date(), 15).toISOString().split("T")[0],
      status: "paid",
      subtotal: 50000,
      total: 59000,
      amountPaid: 59000,
      items: billStockItems.map((item) => ({
        name: item.name,
        description: item.name,
        quantity: 5,
        rate: item.buyPrice,
        amount: item.buyPrice * 5,
        inventoryItemId: String(item.id),
      })),
      projectId,
      notes: `Vendor bill — ${scenario.label}`,
    };
    await ctx().addVendorBill(bill);
    store.incrementCounter("vendorBills");

    await ctx().addVendorPayment({
      id: createId("VP"),
      vendorId: targetVendor.id,
      billId: bill.id,
      date: dateNow.split("T")[0],
      amount: 59000,
      paymentMode: "Bank Transfer",
      reference: "REF-SHOWCASE",
      status: "completed",
    });
    store.incrementCounter("vendorPayments");
  }

  try {
    await ctx().addExpense({
      id: createId("EXP"),
      date: dateNow.split("T")[0],
      category: pType === "OUTSOURCED_INC" ? "Labour" : "Transport",
      amount: 2500,
      projectId,
      paymentMethod: "Bank",
      status: "paid",
      createdAt: dateNow,
      reimbursementRequested: false,
      paidBy: { type: "company" },
    });
    store.incrementCounter("expenses");
  } catch (e: unknown) {
    console.warn("Ignoring expense error:", e instanceof Error ? e.message : e);
  }

  await ctx().addBlockage({
    projectId,
    severity: "medium",
    category: "client",
    description: completed ? "Resolved client delay" : "Pending client clearance",
    status: completed ? "resolved" : "open",
    reportedAt: dateNow,
    reportedBy: "SYSTEM",
    reportedByName: "Data Engine",
    impactDays: completed ? 0 : 2,
    history: [],
  });
  store.incrementCounter("blockages");

  if (pType !== "VENDORSHIP_ONLY") {
    await ctx().addOperationalTicket({
      id: createId("TKT"),
      title: completed ? "Closed site punch item" : "Open site issue",
      description: `Field ticket — ${scenario.label}`,
      projectId,
      status: completed ? "closed" : "open",
      priority: "medium",
      assignedTo: "unassigned",
      createdBy: "Engine",
      createdAt: dateNow,
    });
    store.incrementCounter("tickets");
  }

  const agent = pickAgent(ctx, flow.scenarioIndex);
  if (agent && pType === "SOLO_EPC") {
    await ctx().addAgentCommissionAccrual({
      id: createId("COMM"),
      agentId: agent.id,
      agentName: agent.name,
      projectId,
      clientName: customerName,
      amount: 8000,
      status: completed ? "paid" : "pending",
      date: dateNow,
      notes: "Showcase commission",
      history: [],
    });
  }

  const partner = pickPartner(ctx, pType, flow.scenarioIndex);
  if (partner && ["PARTNER_EPC", "FIXED_EPC", "VENDOR_NETWORK"].includes(pType) && completed) {
    ctx().addPartnerTransaction({
      id: createId("PTRTX"),
      partnerId: partner.id,
      projectId,
      projectName: project?.name,
      date: dateNow.split("T")[0],
      amount: pType === "VENDOR_NETWORK" ? 4500 : 12000,
      type: "payment",
      notes: `Partner settlement — ${scenario.label}`,
    });
  }

  const vendorshipCo = pickVendorshipCompany(ctx, flow.scenarioIndex);
  if (vendorshipCo && (pType === "VENDORSHIP_ONLY" || pType === "VENDOR_NETWORK") && completed) {
    ctx().addVendorshipCompanyTransaction({
      id: createId("VSTX"),
      vendorshipCompanyId: vendorshipCo.id,
      projectId,
      projectName: project?.name,
      date: dateNow.split("T")[0],
      amount: 3500,
      type: "collection",
      notes: `Vendorship fee — ${scenario.label}`,
    });
  }

  const subcontractor = pickSubcontractor(ctx, flow.scenarioIndex);
  if (subcontractor && pType === "OUTSOURCED_INC" && completed) {
    ctx().addSubcontractorTransaction({
      id: createId("SUBTX"),
      subcontractorId: subcontractor.id,
      projectId,
      projectName: project?.name,
      date: dateNow.split("T")[0],
      amount: 45000,
      type: "payment",
      notes: `Subcontractor payment — ${scenario.label}`,
    });
  }

  const showsClientInvoices = !["INC_GIVEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"].includes(pType);
  if (showsClientInvoices) {
    const invoice: Invoice = {
      id: createId("INV"),
      invoiceNumber: `INV-${flow.scenarioIndex}`,
      type: "invoice",
      documentTypeSource: "user",
      customerId,
      customerName,
      projectId,
      projectName: project?.name ?? scenario.label,
      items: [],
      services: [{ description: "Solar EPC Milestone", sac: "9983", rate: contractAmount * 0.85, gstRate: 18 }],
      subtotal: Math.round(contractAmount * 0.85),
      cgst: Math.round(contractAmount * 0.085),
      sgst: Math.round(contractAmount * 0.085),
      igst: 0,
      total: contractAmount,
      status: completed ? "paid" : "sent",
      invoiceDate: dateNow.split("T")[0],
      dueDate: addDays(new Date(), completed ? 0 : 30).toISOString().split("T")[0],
      createdAt: dateNow,
    };
    try {
      await ctx().addInvoice(invoice);
      store.incrementCounter("invoices");
      if (completed || stageIndex >= 1) {
        await ctx().addPayment({
          id: createId("PAY"),
          date: dateNow.split("T")[0],
          amount: completed ? contractAmount : Math.floor(contractAmount * 0.2),
          paymentMode: "Bank",
          direction: "in",
          counterpartyType: "customer",
          counterpartyId: customerId,
          counterpartyName: customerName,
          projectId,
          invoiceId: invoice.id,
          createdAt: dateNow,
        });
        store.incrementCounter("payments");
      }
    } catch (e: unknown) {
      console.warn("Ignoring invoice error:", e instanceof Error ? e.message : e);
    }
  }
}

async function runPipelineExtra(
  ctx: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
  extraIndex: number,
  dateNow: string,
) {
  const extra = PIPELINE_EXTRA_STEPS[extraIndex];
  if (!extra) return;

  const customerId = createId("CUST");
  ctx().addCustomer({
    id: customerId,
    name: extra.customerName,
    phone: "9888877776",
    email: "pipeline@example.com",
    address: "Pipeline Street",
    type: "individual",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: dateNow,
  });

  if (extra.type === "enquiry") {
    const isMeetingDemo = extra.id === "enquiry_open_1";
    const demoMeetingDate = addDays(new Date(), 3).toISOString().slice(0, 10);
    const enquiry: Enquiry = {
      id: createId("ENQ"),
      date: dateNow,
      customerName: extra.customerName,
      customerPhone: "9888877776",
      customerEmail: "pipeline@example.com",
      customerAddress: "Pipeline Street",
      customerType: "individual",
      systemCapacity: "3kW",
      estimatedBudget: 180000,
      requirements: "Pipeline-only enquiry",
      priority: "medium",
      assignedTo: "Sales",
      status: isMeetingDemo ? "meeting_scheduled" : "new",
      source: "walk-in",
      followUpDate: addDays(new Date(), 7).toISOString(),
      meetingDate: isMeetingDemo ? demoMeetingDate : undefined,
      meetingNotes: isMeetingDemo ? "Site visit — roof assessment and consumption review." : undefined,
      customerId,
    };
    const res = await ctx().addEnquiry(enquiry);
    if (res && !res.ok) throw new Error(`Pipeline enquiry failed: ${res.error}`);
    store.incrementCounter("enquiries");
    return;
  }

  const enquiryId = createId("ENQ");
  const enquiry: Enquiry = {
    id: enquiryId,
    date: dateNow,
    customerName: extra.customerName,
    customerPhone: "9888877776",
    customerEmail: "pipeline@example.com",
    customerAddress: "Pipeline Street",
    customerType: "individual",
    systemCapacity: "8kW",
    estimatedBudget: 420000,
    requirements: "Draft quotation pipeline",
    priority: "high",
    assignedTo: "Sales",
    status: "new",
    source: "referral",
    followUpDate: addDays(new Date(), 5).toISOString(),
    customerId,
  };
  const resEnq = await ctx().addEnquiry(enquiry);
  if (resEnq && !resEnq.ok) throw new Error(`Pipeline enquiry failed: ${resEnq.error}`);
  store.incrementCounter("enquiries");

  const quotation: Quotation = {
    id: createId("QTN"),
    enquiryId,
    quotationNumber: `QTN-DRAFT-${extraIndex}`,
    quotationType: "solar",
    customerId,
    clientName: extra.customerName,
    clientPhone: "9888877776",
    clientEmail: "pipeline@example.com",
    clientCity: "Pune",
    clientState: "Maharashtra",
    totalAmount: 420000,
    createdAt: dateNow,
    date: dateNow,
    validUntil: addDays(new Date(), 20).toISOString(),
    status: "draft",
    customItems: [],
    sections: [],
    paymentTerms: "50% advance",
    notes: "Pipeline draft quotation",
    history: [],
    version: 1,
    shareHistory: [],
    commercialAmount: 420000,
    amount: 420000,
    paymentType: "cash",
  };
  const resQtn = await ctx().addQuotation(quotation);
  if (resQtn && !resQtn.ok) throw new Error(`Pipeline quotation failed: ${resQtn.error}`);
  store.incrementCounter("quotations");
}

export async function runExhaustiveIteration(
  getContext: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
) {
  const dateNow = new Date().toISOString();
  const ctx = () => getContext();

  try {
    if (bootstrapEmployeesCreated < GENERATOR_ENTITY_LIMITS.employees) {
      store.setActiveFlow("Initializing Employees");
      const idx = bootstrapEmployeesCreated;
      ctx().addEmployee({
        id: createId("EMP"),
        name: getRandomName(idx),
        initial: "E",
        role: idx < 2 ? "salesperson" : "technician",
        status: "Active",
        phone: "9998887776",
        site: "Main Office",
        salary: 20000,
        wallet: 0,
        joiningDate: dateNow.split("T")[0],
        daysPresent: 0,
        daysAbsent: 0,
        holidays: 0,
        advancePaid: 0,
        pendingAmount: 0,
      });
      bootstrapEmployeesCreated++;
      store.incrementCounter("employees");
      return;
    }

    if (bootstrapAgentsCreated < GENERATOR_ENTITY_LIMITS.agents) {
      store.setActiveFlow("Initializing Agents");
      const idx = bootstrapAgentsCreated;
      ctx().addAgent({
        id: createId("AGT"),
        name: getRandomName(idx + 3),
        phone: "9887766554",
        email: `agent${idx}@example.com`,
        address: "Mumbai",
        ratePerKw: 500 + idx * 50,
        rateType: "per-kw",
        status: "active",
        totalReferrals: idx,
        createdAt: dateNow,
      } as Agent);
      bootstrapAgentsCreated++;
      store.incrementCounter("agents");
      return;
    }

    for (const partnerType of PARTNER_TYPES) {
      const existing = bootstrapPartnersCreated[partnerType] ?? 0;
      if (existing < GENERATOR_ENTITY_LIMITS.partnersPerType) {
        store.setActiveFlow(`Initializing Partners (${partnerType})`);
        ctx().addPartner({
          id: createId("PTR"),
          name: `${getRandomName(PARTNER_TYPES.indexOf(partnerType) + existing)} (${partnerType})`,
          phone: "9876543210",
          type: partnerType,
          defaultRatePerKw: partnerType === "Fixed-Rate" ? 750 : undefined,
          email: `partner-${partnerType.toLowerCase()}${existing}@example.com`,
          createdAt: dateNow,
        } as Partner);
        bootstrapPartnersCreated[partnerType] = existing + 1;
        store.incrementCounter("partners");
        return;
      }
    }

    if (bootstrapVendorsCreated < GENERATOR_ENTITY_LIMITS.vendors) {
      store.setActiveFlow("Initializing Vendors");
      const idx = bootstrapVendorsCreated;
      ctx().addVendor({
        id: createId("VEND"),
        name: getRandomVendor(idx),
        contact: "1231231231",
        category: ["supplier"],
        outstandingAmount: 0,
        purchaseHistory: [],
        email: `vendor${idx}@example.com`,
        address: "123 Vendor St",
        status: "active",
      });
      bootstrapVendorsCreated++;
      store.incrementCounter("vendors");
      return;
    }

    if (bootstrapTeamsCreated < GENERATOR_ENTITY_LIMITS.teams) {
      store.setActiveFlow("Initializing Teams");
      const idx = bootstrapTeamsCreated;
      const employees = ctx().employees as { id: string }[];
      ctx().addTeam({
        id: createId("TEAM"),
        name: `Field Squad ${idx + 1}`,
        memberIds: employees.slice(idx, idx + 2).map((e) => e.id).filter(Boolean),
        status: "Active",
        createdAt: dateNow,
        description: "Showcase field team",
      });
      bootstrapTeamsCreated++;
      store.incrementCounter("teams");
      return;
    }

    if (bootstrapInventoryCreated < GENERATOR_ENTITY_LIMITS.inventoryItems) {
      store.setActiveFlow("Initializing Materials");
      const idx = bootstrapInventoryCreated;
      const category = MATERIAL_CATEGORY_OPTIONS[idx % MATERIAL_CATEGORY_OPTIONS.length];
      ctx().addInventoryItem({
        id: createId("INVITEM"),
        name: `${category} SKU ${idx + 1}`,
        category,
        stock: idx < NEED_TO_GET_MATERIAL_COUNT ? 0 : 40 + idx,
        unit: "pcs",
        value: 50000,
        buyPrice: 4000 + idx * 100,
        salePrice: 5000 + idx * 100,
        hsn: "8541",
        minStock: 5,
      } as InventoryItem);
      bootstrapInventoryCreated++;
      store.incrementCounter("inventoryLogs");
      return;
    }

    if (bootstrapToolsCreated < GENERATOR_ENTITY_LIMITS.tools) {
      store.setActiveFlow("Initializing Tools");
      const idx = bootstrapToolsCreated;
      const employees = ctx().employees as { id: string; name: string }[];
      const emp = employees[idx % Math.max(1, employees.length)];
      ctx().addTool({
        id: createId("TOOL"),
        name: `Field Tool ${idx + 1}`,
        assignedTo: emp?.name ?? "Warehouse",
        assignedToEmployeeId: emp?.id,
        site: "Main Office",
        status: idx % 2 === 0 ? "In Use" : "Available",
        lastUpdated: dateNow,
        condition: "Good",
        category: "Hand Tools",
        purchaseRate: 1500,
        purchaseDate: dateNow.split("T")[0],
      });
      bootstrapToolsCreated++;
      store.incrementCounter("tools");
      return;
    }

    if (bootstrapLoansCreated < GENERATOR_ENTITY_LIMITS.loans) {
      store.setActiveFlow("Initializing Loans");
      const idx = bootstrapLoansCreated;
      ctx().addLoan({
        id: createId("LOAN"),
        source: idx === 0 ? "Working Capital NBFC" : "Director Personal",
        sourceType: idx === 0 ? "nbfc" : "person",
        principal: 500000,
        interestRate: 12,
        paymentType: "emi",
        emiAmount: 15000,
        tenure: 36,
        startDate: dateNow.split("T")[0],
        outstanding: 450000,
        status: "Active",
      } as Loan);
      bootstrapLoansCreated++;
      store.incrementCounter("loans");
      return;
    }

    if (bootstrapVendorshipCosCreated < GENERATOR_ENTITY_LIMITS.vendorshipCompanies) {
      store.setActiveFlow("Initializing Vendorship Companies");
      const idx = bootstrapVendorshipCosCreated;
      ctx().addVendorshipCompany({
        id: createId("VSHIP"),
        name: getRandomCompany(idx),
        phone: "9123456780",
        email: `vship${idx}@example.com`,
        registrationCode: `DISCOM-${100 + idx}`,
        createdAt: dateNow,
      } as VendorshipCompany);
      bootstrapVendorshipCosCreated++;
      return;
    }

    if (bootstrapIncGiversCreated < GENERATOR_ENTITY_LIMITS.incGiverCompanies) {
      store.setActiveFlow("Initializing INC Giver Companies");
      const idx = bootstrapIncGiversCreated;
      ctx().addINCGiverCompany({
        id: createId("INCG"),
        name: `${getRandomCompany(idx + 2)} INC Contractor`,
        phone: "9234567890",
        email: `incgiver${idx}@example.com`,
        createdAt: dateNow,
      } as INCGiverCompany);
      bootstrapIncGiversCreated++;
      return;
    }

    if (bootstrapSubcontractorsCreated < GENERATOR_ENTITY_LIMITS.subcontractors) {
      store.setActiveFlow("Initializing Subcontractors");
      const idx = bootstrapSubcontractorsCreated;
      ctx().addSubcontractor({
        id: createId("SUB"),
        name: `${getRandomName(idx + 5)} Installations`,
        phone: "9345678901",
        email: `sub${idx}@example.com`,
        defaultRatePerKw: 600 + idx * 50,
        createdAt: dateNow,
      });
      bootstrapSubcontractorsCreated++;
      store.incrementCounter("subcontractors");
      return;
    }

    if (bootstrapSiteTemplatesCreated < GENERATOR_ENTITY_LIMITS.siteChecklistTemplates) {
      store.setActiveFlow("Initializing Site Checklist Templates");
      const idx = bootstrapSiteTemplatesCreated;
      const inventory = ctx().inventoryItems as InventoryItem[];
      const template: SiteChecklistTemplate = {
        id: createId("TMPL"),
        name: idx === 0 ? "5kW Residential Package" : "10kW Commercial Package",
        segment: idx === 0 ? "residential" : "commercial",
        items: inventory.slice(0, 4).map((item) => ({
          inventoryItemId: item.id,
          name: item.name,
          quantity: 10,
          unit: item.unit || "pcs",
        })),
        createdAt: dateNow,
        subtype: "solar_package",
        capacityKW: idx === 0 ? 5 : 10,
      };
      ctx().addSiteChecklistTemplate(template);
      bootstrapSiteTemplatesCreated++;
      store.incrementCounter("siteChecklistTemplates");
      store.addLog("success", `Site checklist template created: ${template.name}`, "bootstrap");
      return;
    }

    if (bootstrapQuotationTemplatesCreated < GENERATOR_ENTITY_LIMITS.quotationTemplates) {
      store.setActiveFlow("Initializing Quotation Templates");
      const idx = bootstrapQuotationTemplatesCreated;
      const inventory = ctx().inventoryItems as InventoryItem[];
      const template: QuotationTemplate = {
        id: createId("QTPL"),
        name: idx === 0 ? "5kW Residential Quotation Package" : "10kW Commercial Quotation Package",
        segment: idx === 0 ? "residential" : "commercial",
        panelBrand: "Waaree",
        panelWattage: idx === 0 ? 540 : 550,
        inverterCapacity: idx === 0 ? "5 kW" : "10 kW",
        structureType: idx === 0 ? "RCC" : "MS",
        materialItems: inventory.slice(0, 3).map((item) => ({
          inventoryItemId: item.id,
          name: item.name,
          quantity: 10,
          unit: item.unit || "pcs",
        })),
        services: [
          {
            description: "Solar EPC installation",
            sac: "9954",
            rate: idx === 0 ? 45000 : 42000,
            gstRate: 13.8,
          },
        ],
        createdAt: dateNow,
      };
      ctx().addQuotationTemplate(template);
      bootstrapQuotationTemplatesCreated++;
      store.incrementCounter("quotationTemplates");
      store.addLog("success", `Quotation template created: ${template.name}`, "bootstrap");
      return;
    }

    if (bootstrapAttendanceCreated < GENERATOR_ENTITY_LIMITS.attendanceRecords) {
      store.setActiveFlow("Initializing Attendance");
      const idx = bootstrapAttendanceCreated;
      const employees = ctx().employees as { id: string }[];
      const emp = employees[idx % Math.max(1, employees.length)];
      if (emp) {
        ctx().addAttendanceRecord({
          id: createId("ATT"),
          employeeId: emp.id,
          date: subDays(new Date(), idx % 7).toISOString().split("T")[0],
          status: idx % 5 === 0 ? "paid_leave" : "present",
          sites: [],
          notes: "Office / warehouse",
        });
        store.incrementCounter("attendanceLogs");
      }
      bootstrapAttendanceCreated++;
      return;
    }

    if (bootstrapLoanRepaymentsCreated < GENERATOR_ENTITY_LIMITS.loanRepayments) {
      store.setActiveFlow("Initializing Loan Repayments");
      const idx = bootstrapLoanRepaymentsCreated;
      const loans = ctx().loans as Loan[];
      const loan = loans[idx];
      if (loan) {
        ctx().addLoanRepayment({
          id: createId("LRP"),
          loanId: loan.id,
          date: subDays(new Date(), 30 - idx * 10).toISOString().split("T")[0],
          amount: loan.emiAmount ?? 15000,
          type: "emi",
          notes: "Showcase EMI payment",
        });
      }
      bootstrapLoanRepaymentsCreated++;
      return;
    }

    if (bootstrapToolMovementsCreated < GENERATOR_ENTITY_LIMITS.toolMovements) {
      store.setActiveFlow("Initializing Tool Movements");
      const idx = bootstrapToolMovementsCreated;
      const tools = ctx().tools as { id: string; assignedToEmployeeId?: string; assignedTo?: string }[];
      const employees = ctx().employees as { id: string; name: string }[];
      const emp = employees[idx % Math.max(1, employees.length)];
      const tool = tools[idx];
      const dateStr = dateNow.split("T")[0];
      if (tool && idx === 0) {
        (ctx().issueTool as (
          toolId: string,
          siteId: string,
          siteName: string,
          date: string,
          employeeId?: string,
          employeeName?: string,
        ) => void)(tool.id, "SITE-MAIN", "Main Office", dateStr, emp?.id, emp?.name);
      } else if (tool && idx === 1) {
        (ctx().returnTool as (toolId: string, condition: string, date: string) => void)(
          tool.id,
          "Good",
          dateStr,
        );
      }
      bootstrapToolMovementsCreated++;
      return;
    }

    if (!bootstrapComplete()) {
      store.setActiveFlow("Finishing bootstrap");
      return;
    }

    const scenarioTotal = getShowcaseScenarioCount();

    if (generatorStateIndex >= scenarioTotal && pipelineExtraIndex >= getPipelineExtraCount() && !pendingScenario) {
      ensureProcurementShortfallShowcase(ctx);
      store.setActiveFlow("Smart generation complete");
      store.addLog(
        "info",
        `Generated ${scenarioTotal} showcase projects (${SHOWCASE_PROJECT_KINDS.length} kinds × fresh + active + completed) plus pipeline extras.`,
      );
      store.setStatus("idle");
      return;
    }

    if (generatorStateIndex >= scenarioTotal) {
      store.setActiveFlow(`Pipeline extra ${pipelineExtraIndex + 1}/${getPipelineExtraCount()}`);
      await runPipelineExtra(ctx, store, pipelineExtraIndex, dateNow);
      pipelineExtraIndex++;
      return;
    }

    if (!pendingScenario) {
      const scenario = SHOWCASE_SCENARIOS[generatorStateIndex];
      pendingScenario = {
        scenarioIndex: generatorStateIndex,
        scenario,
        step: "customer",
        stageIndex: lifecycleStageIndex(scenario.lifecycle),
        customerId: createId("CUST"),
      };
    }

    const flow = pendingScenario;
    store.setActiveFlow(`${flow.scenario.label} — ${flow.step}`);

    if (flow.step === "customer") {
      const added = ctx().addCustomer({
        id: flow.customerId,
        name: flow.scenario.customerName,
        phone: "9999999999",
        email: "contact@example.com",
        address: "123 Main Street",
        type: "individual",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: dateNow,
      });
      if (added === false) {
        throw new Error(`Customer creation denied for ${flow.scenario.customerName}`);
      }
      store.addLog(
        "success",
        `Customer created: ${flow.scenario.customerName} (${flow.customerId})`,
        "entity",
      );
      flow.step = "enquiry";
      return;
    }

    if (flow.step === "enquiry") {
      const agent = pickAgent(ctx, flow.scenarioIndex);
      flow.enquiryId = createId("ENQ");
      const enquiry: Enquiry = {
        id: flow.enquiryId,
        date: dateNow,
        customerName: flow.scenario.customerName,
        customerPhone: "9999999999",
        customerEmail: "contact@example.com",
        customerAddress: "123 Main Street",
        customerType: "individual",
        systemCapacity: "5kW",
        estimatedBudget: 500000,
        requirements: `Showcase — ${flow.scenario.label}`,
        priority: "high",
        assignedTo: "System",
        status: "new",
        source: flow.scenario.projectKind === "SOLO_EPC" ? "referral" : "walk-in",
        agentId: agent?.id,
        followUpDate: dateNow,
        customerId: flow.customerId,
      };
      const resEnq = await ctx().addEnquiry(enquiry);
      if (resEnq && !resEnq.ok) throw new Error(`Enquiry creation failed: ${resEnq.error}`);
      store.addLog("success", `Enquiry created: ${flow.enquiryId} (${flow.scenario.label})`, "scenario");
      store.incrementCounter("enquiries");
      flow.step = "quotation";
      return;
    }

    if (flow.step === "quotation") {
      flow.quotationId = createId("QTN");
      const quotation: Quotation = {
        id: flow.quotationId,
        enquiryId: flow.enquiryId,
        quotationNumber: `QTN-${flow.scenario.id}`,
        quotationType: "solar",
        customerId: flow.customerId,
        clientName: flow.scenario.customerName,
        clientPhone: "9999999999",
        clientEmail: "showcase@example.com",
        clientCity: "Mumbai",
        clientState: "Maharashtra",
        totalAmount: 250000,
        createdAt: dateNow,
        date: dateNow,
        validUntil: addDays(new Date(), 15).toISOString(),
        status: "approved",
        customItems: [],
        sections: [],
        paymentTerms: "Milestone based",
        notes: `Quotation for ${flow.scenario.label}`,
        history: [],
        version: 1,
        shareHistory: [],
        commercialAmount: 250000,
        amount: 250000,
        paymentType: "cash",
      };
      const resQtn = await ctx().addQuotation(quotation);
      if (resQtn && !resQtn.ok) throw new Error(`Quotation creation failed: ${resQtn.error}`);
      store.addLog("success", `Quotation created: ${flow.quotationId} (${flow.scenario.label})`, "scenario");
      store.incrementCounter("quotations");
      flow.step = "project";
      return;
    }

    if (flow.step === "project") {
      if (flow.projectId) {
        flow.step = "artifacts";
        return;
      }
      const projectDraft = buildProjectDraft(
        ctx,
        flow.scenario,
        flow.scenarioIndex,
        flow.customerId,
        flow.enquiryId!,
        flow.quotationId!,
        dateNow,
      );
      const resPrj = await ctx().createProjectFromConfirmedQuotation(projectDraft);
      if (resPrj && !resPrj.ok) throw new Error(`Project creation failed: ${resPrj.error}`);
      flow.projectId = resPrj.projectId || projectDraft.id;
      store.addLog(
        "success",
        `Project created: ${flow.projectId} (${flow.scenario.projectKind} — ${flow.scenario.label})`,
        "scenario",
      );
      store.incrementCounter("projects");
      flow.step = "artifacts";
      return;
    }

    if (flow.step === "artifacts") {
      try {
        await runScenarioArtifacts(ctx, store, flow, dateNow);
      } catch (artifactErr: unknown) {
        const msg = artifactErr instanceof Error ? artifactErr.message : String(artifactErr);
        store.addLog("warn", `Scenario artifact warning (${flow.scenario.label}): ${msg}`, "scenario");
        console.warn("Scenario artifact warning:", msg);
      }
      generatorStateIndex++;
      pendingScenario = null;
      return;
    }

    throw new Error(`Unknown pipeline step: ${flow.step}`);
  } catch (err: unknown) {
    console.error("Smart generator error:", err);
    throw err;
  }
}
