import type { AppState } from "@/contexts/AppDataContext";
import type { Enquiry, Quotation } from "@/types/project";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt, SEED_REFERENCE_TODAY } from "./seedTimeModel";
import { phoneNumber, emailFor, addressAt, companyName, personName } from "./seedNames";
import { CAPACITIES_KW, contractForCapacity, countFor, pushAudit, roundInr } from "./seedHelpers";
import { buildEnquiryAssignmentFromMemberId } from "@/lib/enquiryAssignee";
import { normalizeTeamMemberStatus } from "@/lib/seedSessionBootstrap";
import { seedIncludesProjects } from "./seedProjectPhase";

const ENQUIRY_STATUSES: Enquiry["status"][] = [
  "new", "meeting_scheduled", "quotation_sent", "quotation_rejected", "converted", "lost",
];

const QUOTATION_STATUSES_ALL: Quotation["status"][] = [
  "draft", "sent", "approved", "rejected", "withdrawn", "converted_to_project",
];

function quotationStatusesForSeed(): Quotation["status"][] {
  if (seedIncludesProjects()) return QUOTATION_STATUSES_ALL;
  return QUOTATION_STATUSES_ALL.filter((s) => s !== "converted_to_project");
}

function gstBreakup(amount: number) {
  const sub = roundInr(amount / 1.18);
  const gst = amount - sub;
  return { subtotal: sub, cgst: gst / 2, sgst: gst / 2, igst: 0, total: amount };
}

/** L8 — enquiries + quotations (CRM pipeline). */
export function buildL8Crm(state: AppState, profile: SeedProfile): AppState {
  const enquiryCount = countFor(profile, 45);
  const salesMembers = state.settingsTeamMembers.filter(
    (m) => m.role === "salesperson" && normalizeTeamMemberStatus(m.status) === "Active",
  );
  const agents = state.agents.filter((a) => a.status === "active");

  for (let i = 0; i < enquiryCount; i++) {
    const customer = state.customers[i % state.customers.length];
    const status = ENQUIRY_STATUSES[i % ENQUIRY_STATUSES.length];
    const addr = addressAt(i);
    const fraction = 0.08 + i * 0.008;
    const createdAt = seedDayAt(fraction);
    const enquiry: Enquiry = {
      id: seedId(SEED_ID_PREFIX.enquiry),
      customerName: customer?.name ?? companyName(i),
      customerPhone: customer?.phone ?? phoneNumber(800 + i),
      customerEmail: customer?.email ?? emailFor(personName(i)),
      customerAddress: customer?.address ?? addr.line,
      customerType: customer?.type ?? (i % 3 === 2 ? "individual" : "company"),
      customerId: customer?.id,
      agentId: i % 3 === 0 ? agents[i % agents.length]?.id : undefined,
      systemCapacity: CAPACITIES_KW[i % CAPACITIES_KW.length] + " kW",
      estimatedBudget: contractForCapacity(Number(CAPACITIES_KW[i % CAPACITIES_KW.length]), "residential"),
      requirements: i % 2 === 0 ? "Rooftop solar with net metering" : "Commercial shed installation",
      status,
      source: (["website", "phone", "referral", "walk-in", "social-media", "other"] as const)[i % 6],
      priority: (["high", "medium", "low"] as const)[i % 3],
      ...buildEnquiryAssignmentFromMemberId(
        salesMembers[i % Math.max(salesMembers.length, 1)]?.id ?? "SAL-001",
        state.settingsTeamMembers,
      ),
      followUpDate:
        status === "quotation_sent" && i % 5 === 0
          ? seedDayAt(0.75)
          : status === "lost" || status === "converted"
            ? undefined
            : seedDayAt(0.9 + (i % 10) * 0.005),
      lostReason:
        status === "lost"
          ? "Client chose competitor with faster DISCOM filing timeline"
          : undefined,
      notes: i % 4 === 0 ? [{ date: createdAt, note: "Interested in PM Surya Ghar subsidy", by: "Priya Nair" }] : [],
      createdAt,
      updatedAt: seedDateAt(fraction + 0.001, { sequence: i }),
    };
    state.enquiries.push(enquiry);
  }

  const quoteCount = countFor(profile, 42);
  for (let i = 0; i < quoteCount; i++) {
    const enquiry = state.enquiries[i % state.enquiries.length];
    const customer =
      (enquiry?.customerId
        ? state.customers.find((c) => c.id === enquiry.customerId)
        : undefined) ?? state.customers[i % state.customers.length];
    const category = (["residential", "commercial", "industrial"] as const)[i % 3];
    const kw = Number(CAPACITIES_KW[i % CAPACITIES_KW.length]);
    const contract = contractForCapacity(kw, category);
    const gst = gstBreakup(contract);
    const status = quotationStatusesForSeed()[i % quotationStatusesForSeed().length];
    const fraction = 0.1 + i * 0.007;
    const createdAt = seedDayAt(fraction);
    const paymentType = (["cash", "loan", "cash-and-loan"] as const)[i % 3];

    const q: Quotation = {
      id: seedId(SEED_ID_PREFIX.quotation),
      quotationNumber: `Q-2026-${String(1000 + i)}`,
      status,
      quotationType: "solar",
      enquiryId: enquiry?.id,
      salesOwnerMemberId: enquiry?.assignedToMemberId,
      customerId:
        ["approved", "converted_to_project"].includes(status)
          ? enquiry?.customerId ?? customer?.id
          : customer?.id,
      clientName: customer?.name ?? enquiry?.customerName ?? companyName(i),
      clientPhone: customer?.phone ?? enquiry?.customerPhone ?? phoneNumber(900 + i),
      clientEmail: customer?.email ?? enquiry?.customerEmail ?? emailFor(personName(i)),
      clientCity: addressAt(i).city,
      clientState: addressAt(i).state,
      clientAddress: customer?.address ?? addressAt(i).line,
      clientGstin: customer?.gstin,
      clientType: customer?.type,
      agentId: enquiry?.agentId ?? (i % 2 === 0 ? agents[i % agents.length]?.id : undefined),
      systemCategory: category,
      systemCapacity: String(kw),
      paymentType,
      clientAgreedAmount: contract,
      bankDocumentationAmount: paymentType !== "cash" ? roundInr(contract * 1.08) : undefined,
      totalAmount: gst.total,
      presetId: state.quotationTemplates[i % state.quotationTemplates.length]?.id,
      sectionVisibility: state.quotationVisibilityPresets[i % state.quotationVisibilityPresets.length]?.visibility,
      createdAt,
      sentAt: ["sent", "approved", "converted_to_project", "rejected", "withdrawn"].includes(status)
        ? seedDateAt(fraction + 0.01, { sequence: i })
        : undefined,
      approvedAt: ["approved", "converted_to_project"].includes(status)
        ? seedDateAt(fraction + 0.02, { sequence: i + 100 })
        : undefined,
      rejectedAt: status === "rejected" ? seedDateAt(fraction + 0.02) : undefined,
      withdrawnAt: status === "withdrawn" ? seedDateAt(fraction + 0.02) : undefined,
      convertedAt: status === "converted_to_project" ? seedDateAt(fraction + 0.03) : undefined,
      rejectionReason: status === "rejected" ? "Pricing above client budget" : undefined,
      withdrawnReason: status === "withdrawn" ? "Client postponed project to next FY" : undefined,
      revisionOfQuotationId: i % 7 === 0 && i > 0 ? state.quotations[i - 1]?.id : undefined,
      shareHistory:
        i % 2 === 0
          ? [{ method: "whatsapp" as const, contactValue: customer?.phone, sentAt: seedDateAt(fraction + 0.015) }]
          : undefined,
    };

    if (status === "sent" && q.sentAt && q.sentAt < seedDayAt(0.7)) {
      // Stalled quotation >7d for notification driver
    }

    state.quotations.push(q);
    if (enquiry && ["quotation_sent", "converted"].includes(enquiry.status)) {
      enquiry.quotationId = q.id;
    }
  }

  pushAudit(state, {
    action: "create",
    entityType: "Enquiry",
    entityId: state.enquiries[0]?.id ?? "",
    entityName: state.enquiries[0]?.customerName ?? "",
    fraction: 0.09,
    role: "salesperson",
  });
  pushAudit(state, {
    action: "create",
    entityType: "Quotation",
    entityId: state.quotations[0]?.id ?? "",
    entityName: state.quotations[0]?.quotationNumber ?? "",
    fraction: 0.11,
    role: "salesperson",
  });

  return state;
}

export { gstBreakup };
