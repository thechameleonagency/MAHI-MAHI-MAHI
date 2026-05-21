import { describe, expect, it } from "vitest";
import {
  buildCustomerToProjectDraft,
  buildQuotationToProjectDraft,
  parseCreateFromParam,
} from "@/lib/createFromContext";
import { findStaleOpenEnquiriesAfterProjectWin } from "@/lib/enquiryPipelineContinuity";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import type { AppState } from "@/contexts/AppDataContext";
import type { Customer } from "@/types/finance";
import type { Enquiry, Project, Quotation } from "@/types/project";

/**
 * V1 — enquiry convert on all project-create entry paths (FC1 / C1).
 * UI routes: Quotations inline create, Projects ?createFrom=quo:, Customer detail ?createFrom=customer:
 * All finalize through CREATE_PROJECT_FROM_QUOTATION or CREATE_PROJECT_INTAKE (see enquiryConvertOnProjectCreate.test.ts).
 */
describe("project create entry paths (V1)", () => {
  const customer: Customer = {
    id: "C-V1",
    name: "Entry Path Client",
    phone: "9888888888",
    email: "v1@test.com",
    address: "Jaipur",
    type: "individual",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: "2026-01-01",
  };

  const enquiry: Enquiry = {
    id: "ENQ-V1",
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    customerAddress: customer.address,
    customerType: "individual",
    source: "referral",
    systemCapacity: "10 kW",
    estimatedBudget: 500000,
    requirements: "Rooftop",
    status: "new",
    priority: "high",
    assignedTo: "1",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
    notes: [],
  };

  const quotation: Quotation = {
    id: "Q-V1",
    quotationNumber: "Q-V1-1",
    status: "approved",
    enquiryId: "ENQ-V1",
    customerId: "C-V1",
    clientName: customer.name,
    clientPhone: customer.phone,
    clientCity: "Jaipur",
    clientState: "RJ",
    systemCapacity: "10",
    totalAmount: 520000,
    clientAgreedAmount: 510000,
    paymentType: "cash",
    createdAt: "2026-05-03",
  };

  it("?createFrom=quo: deep link param parses and draft carries quotationId", () => {
    const parsed = parseCreateFromParam("quo:Q-V1");
    expect(parsed).toEqual({ kind: "quo", id: "Q-V1" });
    const draft = buildQuotationToProjectDraft(quotation, customer);
    expect(draft.quotationId).toBe("Q-V1");
    expect(draft.customerId).toBe("C-V1");
  });

  it("Customer detail ?createFrom=customer: draft pre-fills customer for quotation pick", () => {
    const parsed = parseCreateFromParam("customer:C-V1");
    expect(parsed).toEqual({ kind: "customer", id: "C-V1" });
    const draft = buildCustomerToProjectDraft(customer);
    expect(draft.customerId).toBe("C-V1");
    expect(draft.customerName).toBe(customer.name);
  });

  it("reconcile closes new-status enquiry when quotation converted to project (seed/hydrate safety)", () => {
    const state = {
      enquiries: [enquiry],
      quotations: [
        {
          ...quotation,
          status: "converted_to_project",
          linkedProjectId: "P-V1",
        },
      ],
      projects: [
        {
          id: "P-V1",
          name: "Entry Path 10kW",
          client: customer.name,
          customerId: "C-V1",
          quotationId: "Q-V1",
          lifecycleStatus: "New",
        } as Project,
      ],
      customers: [customer],
    } as unknown as AppState;

    expect(findStaleOpenEnquiriesAfterProjectWin(state)).toHaveLength(1);
    const next = reconcileEnquiriesConvertedOnProjectLink(state);
    expect(next.enquiries[0].status).toBe("converted");
    expect(next.enquiries[0].customerId).toBe("C-V1");
    expect(findStaleOpenEnquiriesAfterProjectWin(next)).toEqual([]);
  });
});
