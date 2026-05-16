import { describe, it, expect } from "vitest";
import {
  buildEnquiryToQuotationDraft,
  buildQuotationToProjectDraft,
  buildProjectToInvoiceDraft,
  parseCreateFromParam,
} from "@/lib/createFromContext";
import type { Enquiry, Project, Quotation } from "@/types/project";
import type { Customer } from "@/types/finance";

/**
 * Phase 2/5 smoke — data must flow in pipeline order without dropping linkage.
 */
describe("continuity pipeline order", () => {
  const enquiry: Enquiry = {
    id: "ENQ-100",
    customerName: "Pipeline User",
    customerPhone: "9000000001",
    customerEmail: "pipe@test.com",
    customerAddress: "Site A",
    customerType: "individual",
    source: "referral",
    agentId: "AG-9",
    systemCapacity: "8 kW",
    estimatedBudget: 400000,
    requirements: "Rooftop",
    status: "converted",
    priority: "high",
    assignedTo: "1",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-02",
    notes: [],
  };

  it("enquiry → quotation preserves agent and enquiry id", () => {
    const qDraft = buildEnquiryToQuotationDraft(enquiry);
    expect(qDraft.sourceEnquiryId).toBe("ENQ-100");
    expect(qDraft.agentId).toBe("AG-9");
    expect(qDraft.customerName).toBe("Pipeline User");
    expect(parseCreateFromParam("enq:ENQ-100")?.kind).toBe("enq");
  });

  it("quotation → project preserves quotation and customer", () => {
    const quotation: Quotation = {
      id: "Q-100",
      quotationNumber: "Q-2026-100",
      clientName: enquiry.customerName,
      clientPhone: enquiry.customerPhone,
      systemCapacity: "8",
      totalAmount: 420000,
      clientAgreedAmount: 410000,
      status: "approved",
      agentId: "AG-9",
      customerId: "C-100",
      createdAt: "2026-05-03",
    };
    const customer: Customer = {
      id: "C-100",
      name: enquiry.customerName,
      phone: enquiry.customerPhone,
      email: enquiry.customerEmail,
      address: enquiry.customerAddress,
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-05-01",
    };
    const pDraft = buildQuotationToProjectDraft(quotation, customer);
    expect(pDraft.quotationId).toBe("Q-100");
    expect(pDraft.customerId).toBe("C-100");
    expect(pDraft.agentId).toBe("AG-9");
    expect(pDraft.contractAmount).toBe(410000);
    expect(parseCreateFromParam("quo:Q-100")?.id).toBe("Q-100");
  });

  it("project → invoice keeps project and customer linkage", () => {
    const project: Project = {
      id: "P-100",
      name: "Pipeline User 8kW",
      client: enquiry.customerName,
      customerId: "C-100",
      quotationId: "Q-100",
      lifecycleStatus: "Active",
      projectType: "Residential",
      projectCategory: "solar",
      capacity: "8",
      location: "Site A",
      contractAmount: 410000,
      amountReceived: 100000,
      startDate: "2026-05-10",
    } as Project;
    const invDraft = buildProjectToInvoiceDraft(project, undefined, 310000);
    expect(invDraft.projectId).toBe("P-100");
    expect(invDraft.quotationId).toBe("Q-100");
    expect(invDraft.openBalanceSuggestion).toBe(310000);
    expect(parseCreateFromParam("proj:P-100")?.kind).toBe("proj");
  });
});
