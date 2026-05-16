/**
 * Phase 2.1 — Aggressive autofill bridge for "create-from" flows.
 *
 * Every continuity flow (enquiry → quotation, quotation → project, project → invoice,
 * invoice → payment, project → expense / blockage, vendor-bill → vendor-payment,
 * agent → enquiry, customer → project/quotation/invoice, invoice → duplicate) routes
 * through a small set of pure builders defined here. Builders return a partial draft
 * shape that the receiving create surface merges into its initial form state.
 *
 * Conventions:
 *  - Builders never read AppDataContext directly — they take the parent entity (and
 *    optional related entities) as input and return only the prefillable fields.
 *  - Address always falls back: customer.address → project.location/siteAddress → "".
 *  - Phone/Email: prefer customer; fall back to enquiry/quotation captured fields.
 *  - Agent: forward through every conversion (enquiry → quotation → project).
 *  - Project linkage: any creation surface opened from a project context auto-stamps
 *    projectId; the calling code decides whether to lock the picker.
 *  - Inventory items: invoice duplicate carries items but NOT customer/projectId/dates.
 */

import type {
  Enquiry,
  Project,
  Quotation,
  Vendor,
} from "@/types/project";
import type {
  Customer,
  Invoice,
  Payment,
  Expense,
  Agent,
} from "@/types/finance";
import type { VendorBill } from "@/data/inventoryData";
import { formatPricingLineDescription } from "@/lib/pricingBasis";
import {
  loadFormDraft,
  saveFormDraft,
  clearFormDraft,
} from "@/lib/formDraftStorage";

// ---------- URL/draft handoff helpers ----------

/**
 * Stable querystring contract: `?createFrom=<kind>:<id>`.
 * The receiving page reads this on mount and replays through the matching loader.
 */
export type CreateFromKind =
  | "enq"
  | "quo"
  | "proj"
  | "invoice"
  | "vendor-bill"
  | "agent"
  | "customer";

export function parseCreateFromParam(
  value: string | null | undefined,
): { kind: CreateFromKind; id: string } | null {
  if (!value) return null;
  const [rawKind, ...rest] = value.split(":");
  const kind = rawKind as CreateFromKind;
  const id = rest.join(":");
  if (!kind || !id) return null;
  const valid: CreateFromKind[] = [
    "enq",
    "quo",
    "proj",
    "invoice",
    "vendor-bill",
    "agent",
    "customer",
  ];
  if (!valid.includes(kind)) return null;
  return { kind, id };
}

export function buildCreateFromParam(kind: CreateFromKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Each create surface has a draft key (e.g. "quotation-create-draft"). Keeping
 * the URL handoff orthogonal to the draft means the user can refresh and the
 * pre-fill survives via the draft.
 */
export function loadCreateDraft<T>(draftKey: string): T | null {
  return loadFormDraft<T>(draftKey);
}
export function saveCreateDraft<T>(draftKey: string, draft: T): void {
  saveFormDraft(draftKey, draft);
}
export function clearCreateDraft(draftKey: string): void {
  clearFormDraft(draftKey);
}

// ---------- Shared field helpers ----------

const pickFirst = <T>(...values: (T | null | undefined)[]): T | undefined => {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return undefined;
};

const preferAddress = (
  ...sources: { address?: string | null; location?: string | null; siteAddress?: string | null }[]
): string => {
  for (const s of sources) {
    const candidate = s.address ?? s.location ?? s.siteAddress;
    if (candidate && candidate.trim()) return candidate;
  }
  return "";
};

const parseKwFromText = (input: string | undefined | null): number => {
  if (!input) return 0;
  const m = input.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
};

// ---------- Builders ----------

/** Enquiry → Quotation draft. */
export interface QuotationDraftFromEnquiry {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerType: "individual" | "company";
  agentId?: string;
  capacityHintKw: number;
  budgetHint?: number;
  notes?: string;
  sourceEnquiryId: string;
}

export function buildEnquiryToQuotationDraft(
  enquiry: Enquiry,
): QuotationDraftFromEnquiry {
  return {
    customerName: enquiry.customerName,
    customerPhone: enquiry.customerPhone,
    customerEmail: enquiry.customerEmail,
    customerAddress: enquiry.customerAddress,
    customerType: enquiry.customerType,
    agentId: enquiry.agentId,
    capacityHintKw: parseKwFromText(enquiry.systemCapacity),
    budgetHint: enquiry.estimatedBudget,
    notes: enquiry.requirements,
    sourceEnquiryId: enquiry.id,
  };
}

/** Quotation → Project draft (customer may already exist). */
export interface ProjectDraftFromQuotation {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  capacityText?: string;
  capacityKw: number;
  contractAmount: number;
  agentId?: string;
  quotationId: string;
  paymentType?: Quotation["paymentType"];
  notes?: string;
}

export function buildQuotationToProjectDraft(
  quotation: Quotation,
  customer?: Customer,
): ProjectDraftFromQuotation {
  const customerName = customer?.name ?? quotation.clientName ?? "";
  const customerPhone = customer?.phone ?? quotation.clientPhone ?? "";
  const customerEmail = customer?.email ?? quotation.clientEmail;
  return {
    customerId: customer?.id ?? quotation.customerId,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress: preferAddress(
      { address: customer?.address },
      { address: quotation.clientAddress },
    ),
    capacityText: quotation.systemCapacity,
    capacityKw: parseKwFromText(quotation.systemCapacity),
    contractAmount: quotation.clientAgreedAmount ?? quotation.totalAmount ?? 0,
    agentId: quotation.agentId,
    quotationId: quotation.id,
    paymentType: quotation.paymentType,
    notes: quotation.notes,
  };
}

/** Project → Invoice draft. */
export interface InvoiceDraftFromProject {
  customerId?: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  customerGstin?: string;
  customerState?: string;
  projectId: string;
  quotationId?: string;
  openBalanceSuggestion: number;
  notes?: string;
  /** Default service line reflecting contract basis (Phase 4.5b). */
  services?: { description: string; sac: string; rate: number; gstRate: number; serviceNotes?: string }[];
}

export function buildProjectToInvoiceDraft(
  project: Project,
  customer?: Customer,
  outstandingFromContext = 0,
): InvoiceDraftFromProject {
  return {
    customerId: customer?.id ?? project.customerId,
    customerName: customer?.name ?? project.client ?? "",
    customerAddress: preferAddress(
      { address: customer?.address },
      { address: project.location, siteAddress: project.location },
    ),
    customerPhone: customer?.phone,
    customerGstin: customer?.gstin,
    customerState: customer?.state,
    projectId: project.id,
    quotationId: project.quotationId,
    openBalanceSuggestion:
      outstandingFromContext > 0
        ? outstandingFromContext
        : Math.max(0, project.contractAmount - (project.totalCost ?? 0)),
    notes: `Invoice for project ${project.name}`,
    services: [
      {
        description: formatPricingLineDescription(project),
        sac: "998314",
        rate:
          outstandingFromContext > 0
            ? outstandingFromContext
            : Math.max(0, project.contractAmount - (project.totalCost ?? 0)),
        gstRate: 18,
        serviceNotes: "Auto-filled from project commercial basis",
      },
    ],
  };
}

/** Invoice → Payment draft. */
export interface PaymentDraftFromInvoice {
  invoiceId: string;
  projectId?: string;
  customerId?: string;
  customerName: string;
  amount: number;
  mode?: Payment["mode"];
  direction: "in";
  notes?: string;
}

export function buildInvoiceToPaymentDraft(
  invoice: Invoice,
  lastUsedMode?: Payment["mode"],
): PaymentDraftFromInvoice {
  const due = Math.max(0, invoice.total - (invoice.amountReceived ?? 0));
  return {
    invoiceId: invoice.id,
    projectId: invoice.projectId,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: due,
    mode: lastUsedMode,
    direction: "in",
    notes: `Payment for invoice ${invoice.invoiceNumber}`,
  };
}

/** Project → Expense draft. */
export interface ExpenseDraftFromProject {
  projectId: string;
  category?: Expense["category"];
  notes?: string;
}

export function buildProjectToExpenseDraft(project: Project): ExpenseDraftFromProject {
  return {
    projectId: project.id,
    notes: `Expense logged against project ${project.name}`,
  };
}

/** Project → Blockage draft. */
export interface BlockageDraftFromProject {
  projectId: string;
  projectName: string;
  notes?: string;
}

export function buildProjectToBlockageDraft(project: Project): BlockageDraftFromProject {
  return {
    projectId: project.id,
    projectName: project.name,
    notes: "",
  };
}

/** VendorBill → VendorPayment draft. */
export interface VendorPaymentDraftFromBill {
  vendorId: number;
  vendorName?: string;
  billId: string;
  amount: number;
  mode?: string;
  notes?: string;
}

export function buildVendorBillToPaymentDraft(
  bill: VendorBill,
  vendor?: Vendor,
  lastUsedMode?: string,
): VendorPaymentDraftFromBill {
  const due = Math.max(0, bill.total - (bill.amountPaid ?? 0));
  return {
    vendorId: bill.vendorId,
    vendorName: vendor?.name ?? bill.vendorName,
    billId: bill.id,
    amount: due,
    mode: lastUsedMode,
    notes: `Payment for vendor bill ${bill.billNumber}`,
  };
}

/** Agent → Enquiry draft (kicks off the pipeline from an agent's page). */
export interface EnquiryDraftFromAgent {
  agentId: string;
  customerPhone: string;
  source: Enquiry["source"];
  assignedTo: string;
  notes?: string;
}

export function buildAgentToEnquiryDraft(agent: Agent): EnquiryDraftFromAgent {
  return {
    agentId: agent.id,
    customerPhone: agent.phone ?? "",
    source: "referral",
    assignedTo: "",
    notes: `Referral via agent ${agent.name}`,
  };
}

/** Customer → Project / Quotation / Invoice drafts. */
export interface ProjectDraftFromCustomer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

export function buildCustomerToProjectDraft(customer: Customer): ProjectDraftFromCustomer {
  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    customerAddress: customer.address,
  };
}

export interface QuotationDraftFromCustomer extends ProjectDraftFromCustomer {
  customerType: "individual" | "company";
}

export function buildCustomerToQuotationDraft(customer: Customer): QuotationDraftFromCustomer {
  return {
    ...buildCustomerToProjectDraft(customer),
    customerType: customer.type,
  };
}

/** Clone an existing quotation into a new draft (no id / number / status). */
export interface QuotationCloneDraft {
  banner: string;
  sourceQuotationNumber: string;
  customerId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  agentId?: string;
  enquiryId?: string;
  systemCategory?: Quotation["systemCategory"];
  systemCapacity?: string;
  systemConfigNotes?: string;
  paymentType?: Quotation["paymentType"];
  quotationType?: Quotation["quotationType"];
  otherQuotationTitle?: string;
  otherQuotationDescription?: string;
  totalAmount?: number;
  clientAgreedAmount?: number;
}

export function buildQuotationCloneDraft(q: Quotation): QuotationCloneDraft {
  return {
    banner: `Cloned from ${q.quotationNumber} — review and save as a new quotation.`,
    sourceQuotationNumber: q.quotationNumber,
    customerId: q.customerId,
    clientName: q.clientName,
    clientPhone: q.clientPhone,
    clientEmail: q.clientEmail,
    clientAddress: q.clientAddress,
    agentId: q.agentId,
    enquiryId: q.enquiryId,
    systemCategory: q.systemCategory,
    systemCapacity: q.systemCapacity,
    systemConfigNotes: q.systemConfigNotes,
    paymentType: q.paymentType,
    quotationType: q.quotationType,
    otherQuotationTitle: q.otherQuotationTitle,
    otherQuotationDescription: q.otherQuotationDescription,
    totalAmount: q.totalAmount,
    clientAgreedAmount: q.clientAgreedAmount,
  };
}

export interface InvoiceDraftFromCustomer {
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerGstin?: string;
  customerState?: string;
}

export function buildCustomerToInvoiceDraft(customer: Customer): InvoiceDraftFromCustomer {
  return {
    customerId: customer.id,
    customerName: customer.name,
    customerAddress: customer.address,
    customerPhone: customer.phone,
    customerGstin: customer.gstin,
    customerState: customer.state,
  };
}

/** Invoice → Duplicate Invoice. Items only — NOT customer/projectId/dates. */
export interface InvoiceDuplicateDraft {
  items: Invoice["items"];
  services: Invoice["services"];
  sourceInvoiceNumber: string;
  banner: string;
}

export function buildInvoiceDuplicateDraft(invoice: Invoice): InvoiceDuplicateDraft {
  return {
    items: invoice.items?.map((it) => ({ ...it })) ?? [],
    services: invoice.services?.map((s) => ({ ...s })) ?? [],
    sourceInvoiceNumber: invoice.invoiceNumber,
    banner: `Items copied from #${invoice.invoiceNumber} — review before sending.`,
  };
}

// Re-export for callers needing the helper without importing from the module barrel.
export { pickFirst };
