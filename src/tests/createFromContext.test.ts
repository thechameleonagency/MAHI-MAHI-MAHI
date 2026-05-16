import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseCreateFromParam,
  buildCreateFromParam,
  buildEnquiryToQuotationDraft,
  buildQuotationToProjectDraft,
  saveCreateDraft,
  loadCreateDraft,
  clearCreateDraft,
} from "@/lib/createFromContext";
import type { Enquiry, Quotation } from "@/types/project";
import type { Customer } from "@/types/finance";

const sampleEnquiry: Enquiry = {
  id: "ENQ-1",
  customerName: "Test User",
  customerPhone: "9876543210",
  customerEmail: "test@example.com",
  customerAddress: "123 Main St",
  customerType: "individual",
  source: "phone",
  status: "new",
  priority: "medium",
  systemCapacity: "5 kW",
  estimatedBudget: 250000,
  agentId: "AG-1",
  createdAt: "2026-05-01",
};

const sampleQuotation: Quotation = {
  id: "Q-1",
  quotationNumber: "Q-2026-001",
  clientName: "Test User",
  clientPhone: "9876543210",
  clientEmail: "test@example.com",
  clientAddress: "123 Main St",
  systemCapacity: "5",
  totalAmount: 300000,
  clientAgreedAmount: 280000,
  status: "approved",
  createdAt: "2026-05-02",
  customerId: "C-1",
  agentId: "AG-1",
};

const sampleCustomer: Customer = {
  id: "C-1",
  name: "Test User",
  phone: "9876543210",
  email: "test@example.com",
  address: "123 Main St",
  type: "individual",
  itemsBought: [],
  totalPurchases: 0,
  createdAt: "2026-05-01",
};

describe("createFromContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("parseCreateFromParam", () => {
    it("parses valid createFrom strings", () => {
      expect(parseCreateFromParam("enq:ENQ-1")).toEqual({ kind: "enq", id: "ENQ-1" });
      expect(parseCreateFromParam("quo:Q-1:extra")).toEqual({ kind: "quo", id: "Q-1:extra" });
    });

    it("rejects invalid kinds and empty values", () => {
      expect(parseCreateFromParam(null)).toBeNull();
      expect(parseCreateFromParam("")).toBeNull();
      expect(parseCreateFromParam("bad:id")).toBeNull();
      expect(parseCreateFromParam("enq:")).toBeNull();
    });
  });

  describe("buildCreateFromParam", () => {
    it("builds stable query values", () => {
      expect(buildCreateFromParam("proj", "P-99")).toBe("proj:P-99");
    });
  });

  describe("builders", () => {
    it("maps enquiry to quotation draft", () => {
      const draft = buildEnquiryToQuotationDraft(sampleEnquiry);
      expect(draft.customerName).toBe("Test User");
      expect(draft.capacityHintKw).toBe(5);
      expect(draft.sourceEnquiryId).toBe("ENQ-1");
      expect(draft.agentId).toBe("AG-1");
    });

    it("maps quotation to project draft with customer", () => {
      const draft = buildQuotationToProjectDraft(sampleQuotation, sampleCustomer);
      expect(draft.customerId).toBe("C-1");
      expect(draft.contractAmount).toBe(280000);
      expect(draft.quotationId).toBe("Q-1");
      expect(draft.capacityKw).toBe(5);
    });
  });

  describe("draft storage", () => {
    it("round-trips drafts through formDraftStorage", () => {
      const draft = buildEnquiryToQuotationDraft(sampleEnquiry);
      saveCreateDraft("quotation-create-draft", draft);
      const loaded = loadCreateDraft<typeof draft>("quotation-create-draft");
      expect(loaded?.sourceEnquiryId).toBe("ENQ-1");
      clearCreateDraft("quotation-create-draft");
      expect(loadCreateDraft("quotation-create-draft")).toBeNull();
    });
  });
});
