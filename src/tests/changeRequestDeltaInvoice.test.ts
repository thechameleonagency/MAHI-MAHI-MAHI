import { describe, expect, it } from "vitest";
import {
  buildChangeRequestDeltaInvoice,
  gstBreakupInclusive,
  isPlaceholderChangeRequestInvoiceId,
} from "@/lib/changeRequestDeltaInvoice";
import { reconcileChangeRequestDeltaInvoices } from "@/lib/reconcileChangeRequestDeltaInvoices";
import type { Project } from "@/types/project";
import type { ProjectChangeRequest } from "@/types/operations";

describe("changeRequestDeltaInvoice", () => {
  it("detects placeholder draft invoice ids", () => {
    expect(isPlaceholderChangeRequestInvoiceId("INV-DRAFT-CR-1")).toBe(true);
    expect(isPlaceholderChangeRequestInvoiceId("INV-2026-0001")).toBe(false);
  });

  it("builds a pending project invoice with GST split", () => {
    const gst = gstBreakupInclusive(118000);
    expect(gst.total).toBe(118000);

    const project = {
      id: "P-1",
      name: "Site A 10kW",
      client: "Acme",
      customerId: "C-1",
      capacity: "10kW",
      contractAmount: 500000,
      quotationId: "Q-1",
    } as Project;

    const cr: ProjectChangeRequest = {
      id: "CR-9",
      projectId: "P-1",
      type: "addon-work",
      deltaAmount: 118000,
      status: "approved",
      requestedAt: "2026-05-01",
    };

    const invoice = buildChangeRequestDeltaInvoice({
      project,
      customer: {
        id: "C-1",
        name: "Acme",
        phone: "9",
        email: "a@b.com",
        address: "Pune",
        type: "company",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: "2026-01-01",
      },
      changeRequest: cr,
      deltaAmount: 118000,
      invoiceId: "INV-TEST-1",
      existingInvoices: [],
    });

    expect(invoice.id).toBe("INV-TEST-1");
    expect(invoice.status).toBe("pending");
    expect(invoice.projectId).toBe("P-1");
    expect(invoice.customerId).toBe("C-1");
    expect(invoice.total).toBe(118000);
    expect(invoice.services[0]?.rate).toBe(gst.subtotal);
    expect(invoice.notes).toContain("CR-9");
  });

  it("reconcile backfills invoice for approved change request with placeholder id", () => {
    const project: Project = {
      id: "P-1",
      name: "Test",
      client: "Client",
      customerId: "C-1",
      capacity: "10kW",
      contractAmount: 500000,
      amountReceived: 0,
      assignees: [],
      startDate: "2026-01-01",
      createdAt: "2026-01-01",
    } as Project;

    const state = {
      projects: [project],
      customers: [
        {
          id: "C-1",
          name: "Client",
          phone: "1",
          email: "c@test.com",
          address: "Addr",
          type: "company",
          itemsBought: [],
          totalPurchases: 0,
          createdAt: "2026-01-01",
        },
      ],
      invoices: [],
      saleBills: [],
      inventoryItems: [],
      projectChangeRequests: [
        {
          id: "CR-1",
          projectId: "P-1",
          type: "addon-work",
          deltaAmount: 50000,
          status: "approved",
          requestedAt: "2026-05-01",
          approvedAt: "2026-05-02T10:00:00.000Z",
          generatedInvoiceId: "INV-DRAFT-CR-1",
        },
      ],
      accountingVouchers: [],
      accountingReviewQueue: [],
    } as import("@/contexts/AppDataContext").AppState;

    const next = reconcileChangeRequestDeltaInvoices(state);
    expect(next.invoices.length).toBe(1);
    expect(next.projectChangeRequests?.[0]?.generatedInvoiceId).toBe(next.invoices[0]?.id);
    expect(next.invoices[0]?.projectId).toBe("P-1");
    expect(next.projects[0]?.invoiceIds?.length).toBe(1);
  });
});
