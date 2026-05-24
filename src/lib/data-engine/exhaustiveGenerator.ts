import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import { createId } from "@/lib/idFactory";
import type { Enquiry, Project, Quotation, Task } from "@/types/project";
import type {
  Agent,
  Invoice,
  Loan,
  Partner,
  PartnerType,
  VendorshipCompany,
  INCGiverCompany,
} from "@/types/finance";
import type { VendorBill, InventoryItem } from "@/types/inventory";
import type { useDataEngineStore } from "./useDataEngineStore";
import { addDays } from "date-fns";

const REALISTIC_FIRST_NAMES = [
  "Rajesh", "Amit", "Priya", "Sneha", "Vikram", "Neha", "Rahul", "Pooja", "Suresh", "Kavita",
];
const REALISTIC_LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Deshmukh", "Joshi", "Iyer", "Chauhan",
];
const REALISTIC_VENDOR_TYPES = ["Cables", "Electronics", "Logistics", "Hardware", "Steel", "Fabrication"];
const REALISTIC_CUSTOMER_NAMES = [
  "Aarav Sharma", "Vihaan Patel", "Aditya Singh", "Arjun Kumar", "Sai Krishna",
  "Ananya Reddy", "Diya Gupta", "Priya Desai", "Riya Joshi", "Neha Verma",
  "Rahul Mehta", "Karan Malhotra", "Rohan Iyer", "Vikram Ahuja", "Arun Bhatia",
  "Kavya Pillai", "Sneha Rao", "Pooja Nair", "Shruti Menon", "Anjali Das",
];

/** Small, realistic counts for supporting master data. */
export const GENERATOR_ENTITY_LIMITS = {
  employees: 5,
  agents: 3,
  partnersPerType: 2,
  vendors: 4,
  teams: 3,
  inventoryItems: 6,
  tools: 4,
  loans: 2,
  vendorshipCompanies: 2,
  incGiverCompanies: 2,
} as const;

const PARTNER_TYPES: PartnerType[] = ["Profit-Share", "Fixed-Rate", "Channel", "Subcontractor"];

export const PROJECT_TYPES = [
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
  "INC",
  "INC_GIVEN",
  "OUTSOURCED_INC",
  "VENDORSHIP_ONLY",
] as const satisfies readonly ProjectKind[];

const LIFECYCLE_STAGES = ["New", "In Progress", "Completed", "Closed"] as const;

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
    case "OUTSOURCED_INC":
      return "Subcontractor";
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
    case "INC":
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

function buildProjectDraft(
  ctx: () => Record<string, unknown>,
  pType: ProjectKind,
  stage: (typeof LIFECYCLE_STAGES)[number],
  idx: number,
  customerId: string,
  customerName: string,
  enquiryId: string,
  quotationId: string,
  dateNow: string,
): Project {
  const legacy = LEGACY_KIND_TO_TYPE[pType];
  const partner = pickPartner(ctx, pType, idx);
  const agent = pickAgent(ctx, idx);
  const incGiver = pickIncGiver(ctx, idx);
  const vendorshipCo = pickVendorshipCompany(ctx, idx);
  const contractAmount = 15000 + idx * 500;

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
            partnerId: partner?.id,
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
            calculatedEarning: 0,
            settlementDirection: "company_pays_partner" as const,
          },
        ]
      : undefined;

  const outsource =
    pType === "OUTSOURCED_INC" && partner
      ? {
          partyId: partner.id,
          partyName: partner.name,
          rateBasis: "fixed" as const,
          rateValue: contractAmount,
          total: contractAmount,
          attachedAt: dateNow,
        }
      : null;

  const clientName =
    pType === "INC_GIVEN" ? incGiver?.name ?? "INC Giver Co" : customerName;

  const draft: Project = {
    id: createId("PRJ"),
    name: `${clientName} - ${pType}`,
    client: clientName,
    customerId: pType === "INC_GIVEN" ? customerId : customerId,
    quotationId,
    enquiryId,
    startDate: dateNow.split("T")[0],
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
    type: pType === "INC" || pType === "INC_GIVEN" || pType === "OUTSOURCED_INC" ? "INC" : "EPC",
    projectType: "Residential",
    projectCategory: "solar",
    capacity: "5 kW",
    location: "Mumbai",
    contractAmount,
    amountInvoiced: 0,
    amountReceived: 0,
    createdAt: dateNow,
    history: [],
    paymentType: "cash",
    scope,
    partners,
    outsource,
    agentId: agent?.id,
    agentName: agent?.name,
    vendorshipFeeReceivable: pType === "VENDORSHIP_ONLY" ? 3500 : undefined,
    internalCostEstimate: 9000,
    backendPrice: pType === "FIXED_EPC" ? 4000 : undefined,
    partnerSellPrice: pType === "FIXED_EPC" ? contractAmount : undefined,
    commissionRule: pType === "VENDOR_NETWORK" ? "9% channel fee" : undefined,
    incScope: pType === "INC" || pType === "OUTSOURCED_INC" ? "installation_commissioning" : undefined,
  };

  // Intake party hints consumed by createProjectFromConfirmedQuotation
  Object.assign(draft, {
    partner: partner?.name,
    channelPartner: pType === "VENDOR_NETWORK" ? partner?.name : undefined,
    externalNetwork: pType === "VENDOR_NETWORK" ? "Regional Solar Network" : undefined,
    subcontractor: pType === "OUTSOURCED_INC" ? partner?.name : undefined,
    incGiverCompany: incGiver?.name,
    vendorOrDiscom: vendorshipCo?.name ?? "MSS DISCOM Code",
  });

  return draft;
}

let generatorStateIndex = 0;
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

type PendingPermutation = {
  permutationIndex: number;
  step: "customer" | "enquiry" | "quotation" | "project" | "artifacts";
  pType: ProjectKind;
  stage: (typeof LIFECYCLE_STAGES)[number];
  stageIndex: number;
  customerId: string;
  customerName: string;
  enquiryId?: string;
  quotationId?: string;
  projectId?: string;
};

let pendingPermutation: PendingPermutation | null = null;

export function resetExhaustiveGeneratorState() {
  generatorStateIndex = 0;
  pendingPermutation = null;
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
}

export function getExhaustiveGeneratorIndex() {
  return generatorStateIndex;
}

export function getExhaustiveTotalPermutations(): number {
  return PROJECT_TYPES.length * LIFECYCLE_STAGES.length;
}

export function isExhaustiveGenerationComplete(): boolean {
  return generatorStateIndex >= getExhaustiveTotalPermutations() && pendingPermutation === null;
}

export function getExhaustiveGenerationProgressPercent(): number {
  if (!bootstrapComplete()) {
    const bootstrapSteps =
      GENERATOR_ENTITY_LIMITS.employees +
      GENERATOR_ENTITY_LIMITS.agents +
      PARTNER_TYPES.length * GENERATOR_ENTITY_LIMITS.partnersPerType +
      GENERATOR_ENTITY_LIMITS.vendors +
      GENERATOR_ENTITY_LIMITS.teams +
      GENERATOR_ENTITY_LIMITS.inventoryItems +
      GENERATOR_ENTITY_LIMITS.tools +
      GENERATOR_ENTITY_LIMITS.loans +
      GENERATOR_ENTITY_LIMITS.vendorshipCompanies +
      GENERATOR_ENTITY_LIMITS.incGiverCompanies;
    const bootstrapDone =
      bootstrapEmployeesCreated +
      bootstrapAgentsCreated +
      Object.values(bootstrapPartnersCreated).reduce((s, n) => s + n, 0) +
      bootstrapVendorsCreated +
      bootstrapTeamsCreated +
      bootstrapInventoryCreated +
      bootstrapToolsCreated +
      bootstrapLoansCreated +
      bootstrapVendorshipCosCreated +
      bootstrapIncGiversCreated;
    return Math.min(99, Math.round((bootstrapDone / bootstrapSteps) * 40));
  }
  const total = getExhaustiveTotalPermutations();
  if (total === 0) return 100;
  return Math.min(100, 40 + Math.round((generatorStateIndex / total) * 60));
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
    bootstrapIncGiversCreated >= GENERATOR_ENTITY_LIMITS.incGiverCompanies
  );
}

async function runPermutationArtifacts(
  ctx: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
  flow: PendingPermutation,
  dateNow: string,
) {
  const { pType, stageIndex, projectId, customerId, customerName } = flow;
  if (!projectId) return;

  if (stageIndex >= 1) {
    const targetEmp = (ctx().employees as { id: string }[])[flow.permutationIndex % GENERATOR_ENTITY_LIMITS.employees];
    if (targetEmp && pType !== "VENDORSHIP_ONLY") {
      await ctx().addTask({
        id: createId("TSK"),
        projectId,
        siteId: "S1",
        siteName: "Main Site",
        workType: "Installation",
        notes: `Auto-task for ${pType}`,
        createdDate: dateNow,
        employeeId: targetEmp.id,
        workDate: dateNow,
        status: stageIndex >= 2 ? "done" : "started",
        createdBy: "Auto System",
      } as Task);
    }

    const targetVendor = (ctx().vendors as { id: string }[])[flow.permutationIndex % GENERATOR_ENTITY_LIMITS.vendors];
    if (targetVendor && !["INC_GIVEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY", "INC"].includes(pType)) {
      const bill: VendorBill = {
        id: createId("VB"),
        vendorId: targetVendor.id,
        billNumber: `VB-${flow.permutationIndex}`,
        date: dateNow.split("T")[0],
        dueDate: dateNow.split("T")[0],
        status: stageIndex >= 2 ? "paid" : "draft",
        subtotal: 5000,
        cgst: 0,
        sgst: 0,
        igst: 900,
        total: 5900,
        lines: [],
        createdAt: dateNow,
        projectId,
        expenseCategoryId: "1",
        expenseSubcategoryId: "1_1",
        notes: `Auto vendor bill for ${pType}`,
      };
      await ctx().addVendorBill(bill);
      store.incrementCounter("vendorBills");

      if (stageIndex >= 2) {
        await ctx().addVendorPayment({
          id: createId("VP"),
          vendorId: targetVendor.id,
          billId: bill.id,
          date: dateNow,
          amount: 5900,
          paymentMode: "Bank Transfer",
          reference: "REF123",
          status: "completed",
        });
        store.incrementCounter("vendorPayments");
      }
    }

    try {
      await ctx().addExpense({
        id: createId("EXP"),
        date: dateNow.split("T")[0],
        category: pType === "OUTSOURCED_INC" ? "Labour" : "Transport",
        amount: 500,
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
      severity: "high",
      category: "client",
      description: "Resolved blockage",
      status: "resolved",
      reportedAt: dateNow,
      reportedBy: "SYSTEM",
      reportedByName: "Data Engine",
      impactDays: 2,
      history: [],
    });
    store.incrementCounter("blockages");

    if (pType !== "VENDORSHIP_ONLY") {
      await ctx().addOperationalTicket({
        id: createId("TKT"),
        title: "Site Issue",
        description: `Issue during ${pType}`,
        projectId,
        status: "open",
        priority: "high",
        assignedTo: "unassigned",
        createdBy: "Engine",
        createdAt: dateNow,
      });
      store.incrementCounter("tickets");
    }

    const agent = pickAgent(ctx, flow.permutationIndex);
    if (agent && pType === "SOLO_EPC") {
      await ctx().addAgentCommissionAccrual({
        id: createId("COMM"),
        agentId: agent.id,
        agentName: agent.name,
        projectId,
        clientName: customerName,
        amount: 5000,
        status: "pending",
        date: dateNow,
        notes: "Auto Commission",
        history: [],
      });
    }

    const showsClientInvoices = !["INC_GIVEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"].includes(pType);
    if (showsClientInvoices) {
      const invoice: Invoice = {
        id: createId("INV"),
        invoiceNumber: `INV-${flow.permutationIndex}`,
        type: "invoice",
        documentTypeSource: "user",
        customerId,
        customerName,
        projectId,
        projectName: `${customerName} - ${pType}`,
        items: [],
        services: [{ description: "Milestone 1", sac: "9983", rate: 10000, gstRate: 18 }],
        subtotal: 10000,
        cgst: 900,
        sgst: 900,
        igst: 0,
        total: 11800,
        status: stageIndex >= 2 ? "paid" : "draft",
        invoiceDate: dateNow.split("T")[0],
        dueDate: dateNow.split("T")[0],
        createdAt: dateNow,
      };
      try {
        await ctx().addInvoice(invoice);
        store.incrementCounter("invoices");
      } catch (e: unknown) {
        console.warn("Ignoring invoice error:", e instanceof Error ? e.message : e);
      }

      if (stageIndex >= 2) {
        try {
          await ctx().addPayment({
            id: createId("PAY"),
            date: dateNow.split("T")[0],
            amount: 11800,
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
        } catch (e: unknown) {
          console.warn("Ignoring payment error:", e instanceof Error ? e.message : e);
        }
      }
    }
  }
}

export async function runExhaustiveIteration(
  getContext: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
) {
  const dateNow = new Date().toISOString();
  const ctx = () => getContext();

  if (generatorStateIndex >= PROJECT_TYPES.length * LIFECYCLE_STAGES.length && store.progress === 0) {
    generatorStateIndex = 0;
  }

  try {
    // Phase 1 — master data (one entity per tick, small counts)
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
        totalReferrals: 0,
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
        memberIds: [employees[idx % employees.length]?.id].filter(Boolean),
        status: "Active",
        createdAt: dateNow,
        description: "Auto-generated team",
      });
      bootstrapTeamsCreated++;
      store.incrementCounter("teams");
      return;
    }

    if (bootstrapInventoryCreated < GENERATOR_ENTITY_LIMITS.inventoryItems) {
      store.setActiveFlow("Initializing Materials");
      const idx = bootstrapInventoryCreated;
      const categories = ["Module", "Inverter", "Structure", "Cable", "Connector", "Service"];
      ctx().addInventoryItem({
        id: createId("INVITEM"),
        name: `Solar ${categories[idx % categories.length]} ${idx + 1}`,
        category: categories[idx % categories.length],
        stock: 50 + idx * 10,
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
      store.incrementCounter("vendors");
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

    if (!bootstrapComplete()) {
      store.setActiveFlow("Finishing bootstrap");
      return;
    }

    // Phase 2 — project permutations (one pipeline step per tick)
    const totalPermutations = PROJECT_TYPES.length * LIFECYCLE_STAGES.length;
    if (generatorStateIndex >= totalPermutations && !pendingPermutation) {
      store.setActiveFlow("Exhaustive Generation Complete!");
      store.addLog("info", `Generated ${totalPermutations} combinations (${PROJECT_TYPES.length} kinds × ${LIFECYCLE_STAGES.length} stages).`);
      store.setStatus("idle");
      return;
    }

    if (!pendingPermutation) {
      const pType = PROJECT_TYPES[generatorStateIndex % PROJECT_TYPES.length];
      const stage = LIFECYCLE_STAGES[Math.floor(generatorStateIndex / PROJECT_TYPES.length)];
      pendingPermutation = {
        permutationIndex: generatorStateIndex,
        step: "customer",
        pType,
        stage,
        stageIndex: LIFECYCLE_STAGES.indexOf(stage),
        customerId: createId("CUST"),
        customerName: REALISTIC_CUSTOMER_NAMES[generatorStateIndex % REALISTIC_CUSTOMER_NAMES.length],
      };
    }

    const flow = pendingPermutation;
    store.setActiveFlow(`Generating: ${flow.pType} [${flow.stage}] — ${flow.step}`);

    if (flow.step === "customer") {
      ctx().addCustomer({
        id: flow.customerId,
        name: flow.customerName,
        phone: "9999999999",
        email: "contact@example.com",
        address: "123 Main Street",
        type: "individual",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: dateNow,
      });
      flow.step = "enquiry";
      return;
    }

    if (flow.step === "enquiry") {
      const agent = pickAgent(ctx, flow.permutationIndex);
      flow.enquiryId = createId("ENQ");
      const enquiry: Enquiry = {
        id: flow.enquiryId,
        date: dateNow,
        customerName: flow.customerName,
        customerPhone: "9999999999",
        customerEmail: "contact@example.com",
        customerAddress: "123 Main Street",
        customerType: "individual",
        systemCapacity: "5kW",
        estimatedBudget: 500000,
        requirements: `Auto-generated for ${flow.pType} / ${flow.stage}`,
        priority: "high",
        assignedTo: "System",
        status: "new",
        source: "referral",
        agentId: agent?.id,
        followUpDate: dateNow,
        customerId: flow.customerId,
      };
      const resEnq = await ctx().addEnquiry(enquiry);
      if (resEnq && !resEnq.ok) throw new Error(`Enquiry creation failed: ${resEnq.error}`);
      store.incrementCounter("enquiries");
      flow.step = "quotation";
      return;
    }

    if (flow.step === "quotation") {
      flow.quotationId = createId("QTN");
      const quotation: Quotation = {
        id: flow.quotationId,
        enquiryId: flow.enquiryId,
        quotationNumber: `QTN-${flow.permutationIndex}`,
        quotationType: "solar",
        customerId: flow.customerId,
        clientName: flow.customerName,
        clientPhone: "9999999999",
        clientEmail: "exhaust@example.com",
        clientCity: "Mumbai",
        clientState: "Maharashtra",
        totalAmount: 15000,
        createdAt: dateNow,
        date: dateNow,
        validUntil: addDays(new Date(), 15).toISOString(),
        status: "approved",
        customItems: [] as Quotation["customItems"],
        sections: [] as Quotation["sections"],
        paymentTerms: "100% advance",
        notes: `Quotation for ${flow.pType}`,
        history: [],
        version: 1,
        shareHistory: [],
        commercialAmount: 15000,
        amount: 15000,
        paymentType: "cash",
      };
      const resQtn = await ctx().addQuotation(quotation);
      if (resQtn && !resQtn.ok) throw new Error(`Quotation creation failed: ${resQtn.error}`);
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
        flow.pType,
        flow.stage,
        flow.permutationIndex,
        flow.customerId,
        flow.customerName,
        flow.enquiryId!,
        flow.quotationId!,
        dateNow,
      );
      const resPrj = await ctx().createProjectFromConfirmedQuotation(projectDraft);
      if (resPrj && !resPrj.ok) throw new Error(`Project creation failed: ${resPrj.error}`);
      flow.projectId = resPrj.projectId || projectDraft.id;
      store.incrementCounter("projects");
      flow.step = "artifacts";
      return;
    }

    if (flow.step === "artifacts") {
      try {
        await runPermutationArtifacts(ctx, store, flow, dateNow);
      } catch (artifactErr: unknown) {
        console.warn(
          "Permutation artifact step warning:",
          artifactErr instanceof Error ? artifactErr.message : artifactErr,
        );
      }
      generatorStateIndex++;
      pendingPermutation = null;
      return;
    }

    throw new Error(`Unknown pipeline step: ${flow.step}`);
  } catch (err: unknown) {
    console.error("Exhaustive engine error:", err);
    throw err;
  }
}
