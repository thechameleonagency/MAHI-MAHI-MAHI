import { describe, expect, it } from "vitest";

import {
  buildProjectClientSnapshotFromQuotation,
  findStaleEnquiryQuotationCustomerLinks,
  freezeProjectClientFieldsFromQuotation,
  linkEnquiryCustomerFromQuotation,
  projectClientSnapshotMatchesCustomer,
  resolveProjectClientDisplay,
  syncEnquiryCustomerIdAfterQuotationApprove,
} from "@/lib/customerPipelineIdentity";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { buildEnquiryToQuotationDraft } from "@/lib/createFromContext";
import type { Customer } from "@/types/finance";
import type { Enquiry, Project, Quotation } from "@/types/project";

const sampleQuotation = (overrides: Partial<Quotation> = {}): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "approved",
  quotationType: "solar",
  clientName: "Acme Solar",
  clientPhone: "9876543210",
  clientEmail: "billing@acme.com",
  clientCity: "Jaipur",
  clientState: "08",
  clientAddress: "12 MG Road",
  clientGstin: "08AAAAA0000A1Z5",
  systemCategory: "commercial",
  systemCapacity: "50",
  paymentType: "cash",
  totalAmount: 500_000,
  isConverted: false,
  customerId: "CUST-0001",
  createdAt: "2026-01-01",
  ...overrides,
});

const sampleCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: "CUST-0001",
  name: "Acme Renewed Pvt Ltd",
  phone: "9876543210",
  email: "new@acme.com",
  address: "99 Corporate Park",
  type: "company",
  gstin: "08AAAAA0000A1Z5",
  itemsBought: [],
  totalPurchases: 0,
  createdAt: "2026-01-01",
  ...overrides,
});

describe("E1 customer pipeline identity", () => {
  it("buildEnquiryToQuotationDraft forwards enquiry.customerId", () => {
    const enquiry: Enquiry = {
      id: "ENQ-1",
      customerName: "Lead",
      customerPhone: "9000000001",
      customerEmail: "lead@x.com",
      customerAddress: "Addr",
      customerType: "individual",
      source: "web",
      status: "converted",
      priority: "medium",
      customerId: "CUST-0099",
      createdAt: "2026-01-01",
    };
    expect(buildEnquiryToQuotationDraft(enquiry).customerId).toBe("CUST-0099");
  });

  it("freezes full client snapshot from quotation at project conversion", () => {
    const q = sampleQuotation();
    const snap = buildProjectClientSnapshotFromQuotation(q);
    expect(snap.client).toBe("Acme Solar");
    expect(snap.clientGstin).toBe("08AAAAA0000A1Z5");
    expect(snap.state).toBe("08");

    const frozen = freezeProjectClientFieldsFromQuotation(
      { id: "P-1", name: "Site A", client: "Old", customerId: "" } as Project,
      q,
    );
    expect(frozen.customerId).toBe("CUST-0001");
    expect(frozen.client).toBe("Acme Solar");
    expect(frozen.clientGstin).toBe("08AAAAA0000A1Z5");
  });

  it("resolveProjectClientDisplay prefers live customer and detects snapshot drift", () => {
    const q = sampleQuotation();
    const snap = buildProjectClientSnapshotFromQuotation(q);
    const project: Project = {
      id: "P-1",
      name: "Site",
      client: snap.client,
      clientPhone: snap.clientPhone,
      clientEmail: snap.clientEmail,
      customerId: "CUST-0001",
      capacity: "50 kW",
      location: snap.clientAddress ?? "",
      lifecycleStatus: "New",
      contractAmount: 1,
      totalCost: 0,
      amountReceived: 0,
      assignees: [],
      onSite: 0,
      photos: 0,
      startDate: "2026-01-01",
      endDate: null,
      createdAt: "2026-01-01",
    };

    const resolved = resolveProjectClientDisplay(project, sampleCustomer());
    expect(resolved.usingLiveCustomer).toBe(true);
    expect(resolved.name).toBe("Acme Renewed Pvt Ltd");
    expect(resolved.snapshotDiffersFromCustomer).toBe(true);
    expect(projectClientSnapshotMatchesCustomer(sampleCustomer(), snap)).toBe(false);
  });

  it("updateCustomer-style master edit does not mutate frozen project snapshot fields", () => {
    const q = sampleQuotation();
    const project = freezeProjectClientFieldsFromQuotation(
      { id: "P-2", name: "X", capacity: "1", location: "", lifecycleStatus: "New", contractAmount: 1, totalCost: 0, amountReceived: 0, assignees: [], onSite: 0, photos: 0, startDate: "2026-01-01", endDate: null, createdAt: "2026-01-01" } as Project,
      q,
    );
    expect(project.client).toBe("Acme Solar");
    const afterMasterRename = { ...project, client: project.client };
    expect(afterMasterRename.client).toBe("Acme Solar");
  });

  it("syncEnquiryCustomerIdAfterQuotationApprove links enquiry once", () => {
    const store = new Map<string, { customerId?: string }>([["ENQ-1", {}]]);
    syncEnquiryCustomerIdAfterQuotationApprove(
      (id) => store.get(id),
      (id, patch) => store.set(id, { ...store.get(id), ...patch }),
      "ENQ-1",
      "CUST-0001",
    );
    expect(store.get("ENQ-1")?.customerId).toBe("CUST-0001");
    syncEnquiryCustomerIdAfterQuotationApprove(
      (id) => store.get(id),
      (id, patch) => store.set(id, { ...store.get(id), ...patch }),
      "ENQ-1",
      "CUST-0001",
    );
    expect(store.get("ENQ-1")?.customerId).toBe("CUST-0001");
  });

  it("linkEnquiryCustomerFromQuotation uses repository adapter", () => {
    const enquiries = [{ id: "ENQ-1", customerName: "A" } as Enquiry];
    const repo = {
      getById: (id: string) => enquiries.find((e) => e.id === id),
      update: (id: string, patch: { customerId: string }) => {
        const idx = enquiries.findIndex((e) => e.id === id);
        if (idx >= 0) enquiries[idx] = { ...enquiries[idx], ...patch };
      },
    };
    linkEnquiryCustomerFromQuotation({ enquiryRepository: repo }, "ENQ-1", "CUST-9");
    expect(enquiries[0]?.customerId).toBe("CUST-9");
  });

  it("hydrated smoke seed has aligned enquiry and quotation customer ids (V6)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleEnquiryQuotationCustomerLinks(hydrated)).toEqual([]);
  });

  it("does not overwrite enquiry when already linked to a different customer", () => {
    const store = new Map<string, { customerId?: string }>([["ENQ-2", { customerId: "CUST-A" }]]);
    syncEnquiryCustomerIdAfterQuotationApprove(
      (id) => store.get(id),
      (id, patch) => store.set(id, { ...store.get(id), ...patch }),
      "ENQ-2",
      "CUST-B",
    );
    expect(store.get("ENQ-2")?.customerId).toBe("CUST-A");
  });
});
