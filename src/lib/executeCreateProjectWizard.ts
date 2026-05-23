import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { buildProjectFromWizardState } from "@/lib/buildProjectFromWizardState";
import { normalizeWizardState } from "@/lib/normalizeWizardState";
import { computeIncGivenTotal, effectiveLeadPath } from "@/lib/createProjectWizardLogic";
import { applyTeamAssignmentToProject } from "@/lib/projectTeamAssignment";
import { ensureProjectPartnerEconomics } from "@/lib/projectPartnerEconomics";
import type { Agent, Customer, Expense, INCGiverCompany, Partner, VendorshipCompany } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export type ExecuteCreateProjectWizardResult =
  | { ok: true; projectId: string; directExceptionReason?: string; attachSubcontractorName?: string }
  | { ok: false; error: string };

export interface ExecuteCreateProjectWizardDeps {
  state: CreateProjectWizardState;
  customers: Customer[];
  partners: Partner[];
  incGiverCompanies: INCGiverCompany[];
  vendorshipCompanies: VendorshipCompany[];
  agents: Agent[];
  quotations: Quotation[];
  projects: Project[];
  generateId: (prefix: string) => string;
  allocateCustomerId: () => string;
  addCustomer: (customer: Customer) => boolean;
  addExpense: (expense: Expense) => boolean;
  convertEnquiryToCustomer: (id: string) => Promise<{ ok: boolean; customerId?: string; error?: string }>;
  createProjectFromConfirmedQuotation: (
    project: Project,
  ) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  createProjectIntake: (params: {
    project: Project;
    intake: ProjectIntakePayload;
    quotationId?: string;
  }) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  createDirectProjectException: (params: {
    projectName: string;
    intake: ProjectIntakePayload;
    reason: string;
    customerId?: string;
  }) => Promise<{ ok: boolean; error?: string; projectId?: string }>;
  updateProject: (id: string, updates: Partial<Project>) => boolean;
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

function customerOptionalForDirectExceptionKind(kind: ProjectKind): boolean {
  return kind === "INC_GIVEN" || kind === "VENDORSHIP_ONLY" || kind === "VENDOR_NETWORK";
}

function buildDirectExceptionIntake(
  state: CreateProjectWizardState,
  deps: ExecuteCreateProjectWizardDeps,
  customer?: Customer,
): ProjectIntakePayload {
  const kind = state.directExceptionProjectKind!;
  const lead = effectiveLeadPath(state);
  const contractAmount =
    lead === "INC_GIVEN"
      ? computeIncGivenTotal(state)
      : parsePositive(state.partnerContractAmount ?? state.contractAmount);
  const parties: ProjectIntakePayload["parties"] = {};
  if (customer) parties.customer = customer.name;

  const commercial: ProjectIntakePayload["commercial"] = {
    contractAmount,
    paymentType: state.paymentType ?? "cash",
    internalCostEstimate: parsePositive(state.internalCostEstimate),
  };

  switch (kind) {
    case "PARTNER_EPC": {
      const partner = deps.partners.find((p) => p.id === state.selectedPartnerId);
      if (partner) parties.partner = partner.name;
      break;
    }
    case "FIXED_EPC": {
      const partner = deps.partners.find((p) => p.id === state.selectedPartnerId);
      if (partner) parties.partner = partner.name;
      commercial.backendPrice = parsePositive(state.backendPrice ?? state.fixedRatePerKw);
      commercial.partnerSellPrice = parsePositive(state.partnerSellPrice ?? contractAmount);
      break;
    }
    case "OUTSOURCED_INC": {
      const sub = deps.partners.find(
        (p) => p.id === state.selectedSubcontractorId && p.type === "Subcontractor",
      );
      if (sub) parties.subcontractor = sub.name;
      break;
    }
    case "INC_GIVEN": {
      const giver = deps.incGiverCompanies.find((c) => c.id === state.incGiverCompanyId);
      if (giver) parties.incGiverCompany = giver.name;
      break;
    }
    case "VENDOR_NETWORK": {
      if (trim(state.channelPartnerName)) parties.channelPartner = trim(state.channelPartnerName);
      if (trim(state.externalNetworkName)) parties.externalNetwork = trim(state.externalNetworkName);
      commercial.commissionRule = trim(state.commissionRule) || "per_kw:0";
      break;
    }
    case "SOLO_EPC":
      parties.vendorOrDiscom = trim(state.vendorOrDiscom) || "DISCOM — pending";
      break;
    case "VENDORSHIP_ONLY": {
      const fee = parsePositive(state.vendorshipFeeAmount ?? contractAmount);
      parties.externalNetwork = trim(state.externalNetworkName) || "External network";
      commercial.vendorshipFeeReceivable = fee;
      break;
    }
    default:
      break;
  }

  const capacity =
    trim(state.partnerCapacity) ||
    trim(state.capacity) ||
    trim(state.incCapacity) ||
    "";
  const location = trim(state.location) || trim(state.newCustomerAddress) || trim(customer?.address);

  return {
    kind,
    parties,
    commercial,
    site: {
      projectType: state.projectType ?? "Residential",
      projectCategory: state.projectCategory ?? "solar",
      capacity,
      location: location ?? "",
    },
  };
}

async function resolveEnquiryLinkedCustomerId(
  state: CreateProjectWizardState,
  deps: ExecuteCreateProjectWizardDeps,
): Promise<{ ok: true; customerId?: string } | { ok: false; error: string }> {
  if (state.source !== "quotation" || !state.selectedQuotationId) {
    return { ok: true };
  }
  const quotation = deps.quotations.find((q) => q.id === state.selectedQuotationId);
  if (!quotation?.enquiryId) {
    return { ok: true };
  }
  const conv = await deps.convertEnquiryToCustomer(quotation.enquiryId);
  if (!conv.ok) {
    return { ok: false, error: conv.error ?? "Could not convert enquiry to customer." };
  }
  return { ok: true, customerId: conv.customerId };
}

async function resolveWizardCustomer(
  state: CreateProjectWizardState,
  deps: ExecuteCreateProjectWizardDeps,
  enquiryLinkedCustomerId?: string,
): Promise<
  | { ok: true; customer: { id: string; name: string; address?: string } }
  | { ok: false; error: string }
> {
  const lead = effectiveLeadPath(state);

  if (lead === "INC_GIVEN") {
    if (!state.incGiverCompanyId) {
      return { ok: false, error: "INC source company is required." };
    }
    const incCo = deps.incGiverCompanies.find((c) => c.id === state.incGiverCompanyId);
    return {
      ok: true,
      customer: {
        id: `inc-${state.incGiverCompanyId}`,
        name: incCo?.name ?? "INC Work Source",
      },
    };
  }

  if (lead === "PARTNER") {
    const name = trim(state.partnerCustomerName);
    if (!name) {
      return { ok: false, error: "End-customer name is required for partner projects." };
    }
    const partnerCustId = deps.allocateCustomerId();
    const added = deps.addCustomer({
      id: partnerCustId,
      name,
      phone: "",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: new Date().toISOString(),
    });
    if (!added) {
      return { ok: false, error: "Could not create end-customer record." };
    }
    return { ok: true, customer: { id: partnerCustId, name } };
  }

  let activeCustomerId = enquiryLinkedCustomerId ?? state.selectedCustomerId;

  if (state.customerMode === "add") {
    const name = trim(state.newCustomerName);
    if (!name) {
      return { ok: false, error: "Customer name is required." };
    }
    const newCustId = deps.allocateCustomerId();
    const added = deps.addCustomer({
      id: newCustId,
      name,
      phone: trim(state.newCustomerPhone),
      email: trim(state.newCustomerEmail),
      address: trim(state.newCustomerAddress),
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: new Date().toISOString(),
    });
    if (!added) {
      return { ok: false, error: "Could not create customer record." };
    }
    activeCustomerId = newCustId;
  }

  if (!activeCustomerId) {
    return { ok: false, error: "Select or add a customer." };
  }

  const cust = deps.customers.find((c) => c.id === activeCustomerId);
  return {
    ok: true,
    customer: {
      id: activeCustomerId,
      name: cust?.name ?? trim(state.newCustomerName) ?? "Customer",
      address: (cust?.address ?? trim(state.newCustomerAddress)) || undefined,
    },
  };
}

function applyTeamFields(
  project: Project,
  state: CreateProjectWizardState,
): Project {
  if (state.targetEndDate && state.targetEndDate < (project.startDate ?? "")) {
    throw new Error("Target end date cannot be before the project start date.");
  }
  return applyTeamAssignmentToProject(project, {
    primaryAssigneeId: state.primaryAssigneeId,
    targetEndDate: state.targetEndDate,
  });
}

function recordVendorshipExpense(
  projectId: string,
  sideEffects: ReturnType<typeof buildProjectFromWizardState>["sideEffects"],
  deps: ExecuteCreateProjectWizardDeps,
): void {
  const expense = sideEffects.vendorshipExpense;
  if (!expense) return;

  deps.addExpense({
    id: deps.generateId("EXP"),
    date: new Date().toISOString().split("T")[0],
    amount: expense.amount,
    category: "Vendorship Code Fee",
    subCategory: expense.companyName || "Third-party code",
    projectId,
    description: expense.partnerId
      ? `Vendorship code fee — ${expense.companyName || expense.vendorshipCompanyId} (borne by partner)`
      : `Vendorship code fee — ${expense.companyName || expense.vendorshipCompanyId}`,
    mainCategory: "site",
    paidBy: expense.partnerId
      ? { type: "partner", entityId: expense.partnerId, entityName: expense.partnerName }
      : { type: "company" },
    createdAt: new Date().toISOString(),
    vendorshipCompanyId: expense.vendorshipCompanyId,
  });
}

export async function executeCreateProjectWizard(
  deps: ExecuteCreateProjectWizardDeps,
): Promise<ExecuteCreateProjectWizardResult> {
  const state = normalizeWizardState(deps.state);

  if (state.source === "attach_outsourced") {
    const projectId = trim(state.attachToProjectId);
    if (!projectId) {
      return { ok: false, error: "Select a project to attach outsourced INC work to." };
    }
    const target = deps.projects.find((p) => p.id === projectId);
    if (!target) {
      return { ok: false, error: "Selected project was not found." };
    }
    if (!trim(state.selectedSubcontractorId)) {
      return { ok: false, error: "Select the installation subcontractor." };
    }
    const sub = deps.partners.find((p) => p.id === state.selectedSubcontractorId);
    const basis = state.outsourceRateBasis ?? "fixed";
    const rate = parsePositive(state.outsourceRateValue);
    if (rate <= 0) {
      return { ok: false, error: "Enter a positive outsource rate or amount." };
    }
    const qty =
      basis === "fixed"
        ? 1
        : parsePositive(
            state.outsourceQuantity ??
              (basis === "per_kw" ? target.capacity?.replace(/[^\d.]/g, "") : "0"),
          );
    if (basis !== "fixed" && qty <= 0) {
      return { ok: false, error: "Enter a positive quantity for the outsource rate." };
    }
    const total = basis === "fixed" ? rate : rate * qty;
    const ok = deps.updateProject(projectId, {
      outsource: {
        partyId: state.selectedSubcontractorId,
        partyName: sub?.name,
        rateBasis: basis,
        rateValue: rate,
        quantity: basis === "fixed" ? undefined : qty,
        total,
        notes: trim(state.outsourceNotes) || undefined,
        attachedAt: new Date().toISOString(),
      },
    });
    if (!ok) {
      return { ok: false, error: "Could not attach outsource details to the project." };
    }
    return { ok: true, projectId, attachSubcontractorName: sub?.name };
  }

  if (state.source === "direct_exception") {
    const kind = state.directExceptionProjectKind;
    const reason = trim(state.directExceptionReason);
    const projectName = trim(state.projectName) || trim(state.partnerProjectName) || "Direct exception project";
    if (!kind || !reason) {
      return { ok: false, error: "Direct exception reason and deal kind are required." };
    }

    let customer: Customer | undefined;
    if (!customerOptionalForDirectExceptionKind(kind)) {
      const resolved = await resolveWizardCustomer(state, deps);
      if (!resolved.ok) return resolved;
      customer = deps.customers.find((c) => c.id === resolved.customer.id) ?? {
        id: resolved.customer.id,
        name: resolved.customer.name,
        address: resolved.customer.address ?? "",
        phone: "",
        email: "",
        type: "individual",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
    } else if (state.selectedCustomerId) {
      customer = deps.customers.find((c) => c.id === state.selectedCustomerId);
    }

    const intake = buildDirectExceptionIntake(state, deps, customer);
    const res = await deps.createDirectProjectException({
      projectName,
      reason,
      customerId: customer?.id,
      intake,
    });
    if (!res.ok || !res.projectId) {
      return { ok: false, error: res.error ?? "Could not create direct exception project." };
    }

    if (state.primaryAssigneeId || state.targetEndDate) {
      const teamProject = applyTeamAssignmentToProject({ id: res.projectId } as Project, {
        primaryAssigneeId: state.primaryAssigneeId,
        targetEndDate: state.targetEndDate,
      });
      deps.updateProject(res.projectId, {
        assignees: teamProject.assignees,
        endDate: teamProject.endDate,
      });
    }

    return { ok: true, projectId: res.projectId, directExceptionReason: reason };
  }

  const enquiry = await resolveEnquiryLinkedCustomerId(state, deps);
  if (!enquiry.ok) {
    return { ok: false, error: enquiry.error };
  }

  const customerResult = await resolveWizardCustomer(state, deps, enquiry.customerId);
  if (!customerResult.ok) {
    return customerResult;
  }

  let built: ReturnType<typeof buildProjectFromWizardState>;
  try {
    built = buildProjectFromWizardState(state, {
      generateId: deps.generateId,
      customers: deps.customers,
      partners: deps.partners,
      incGiverCompanies: deps.incGiverCompanies,
      vendorshipCompanies: deps.vendorshipCompanies,
      agents: deps.agents,
      quotations: deps.quotations,
      customer: customerResult.customer,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not build project." };
  }

  let project = ensureProjectPartnerEconomics(
    applyTeamFields(built.project, state),
    { intake: built.intake },
  );

  const res = built.quotationId
    ? await deps.createProjectFromConfirmedQuotation(project)
    : await deps.createProjectIntake({
        project,
        intake: built.intake,
        quotationId: built.quotationId,
      });

  if (!res.ok || !res.projectId) {
    return { ok: false, error: res.error ?? "Could not create project." };
  }

  project = { ...project, id: res.projectId };
  recordVendorshipExpense(res.projectId, built.sideEffects, deps);

  return { ok: true, projectId: res.projectId };
}
