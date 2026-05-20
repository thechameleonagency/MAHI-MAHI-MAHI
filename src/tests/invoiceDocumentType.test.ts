import { describe, expect, it } from "vitest";
import {
  buildPersistedDocumentTypeAtCreate,
  inferInvoiceOrSaleBillType,
  normalizeBillingDocumentType,
  resolveInvoiceDocumentTypeForCreate,
  stripVolatileDocumentTypeFields,
} from "@/lib/invoiceDocumentType";
import { sanitizeBillingDocuments } from "@/lib/sanitizeBillingDocuments";
import type { Invoice } from "@/types/finance";

const baseInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "INV-1",
  invoiceNumber: "INV-2026-0001",
  type: "invoice",
  customerId: "C1",
  customerName: "Test",
  items: [{ description: "Panel", hsn: "8541", quantity: 1, rate: 1000, gstRate: 12 }],
  services: [],
  subtotal: 1000,
  cgst: 60,
  sgst: 60,
  igst: 0,
  total: 1120,
  status: "pending",
  invoiceDate: "2026-01-01",
  dueDate: "2026-01-15",
  createdAt: "2026-01-01",
  ...overrides,
});

describe("invoiceDocumentType", () => {
  it("infers sale-bill for materials-only without project link", () => {
    expect(
      inferInvoiceOrSaleBillType({
        items: [{ description: "Panel", hsn: "8541", quantity: 1, rate: 1000, gstRate: 12 }],
        services: [],
      }),
    ).toBe("sale-bill");
  });

  it("infers invoice when project is linked", () => {
    expect(
      inferInvoiceOrSaleBillType({
        projectId: "P1",
        items: [{ description: "Panel", hsn: "8541", quantity: 1, rate: 1000, gstRate: 12 }],
        services: [],
      }),
    ).toBe("invoice");
  });

  it("resolveInvoiceDocumentTypeForCreate respects user override", () => {
    expect(
      resolveInvoiceDocumentTypeForCreate({
        userSelectedType: "sale-bill",
        userOverrideLocked: true,
        items: [],
        services: [{ description: "Install", sac: "9987", rate: 5000, gstRate: 18 }],
      }),
    ).toBe("sale-bill");
  });

  it("resolveInvoiceDocumentTypeForCreate uses inference when not locked", () => {
    expect(
      resolveInvoiceDocumentTypeForCreate({
        userSelectedType: "invoice",
        userOverrideLocked: false,
        items: [{ description: "Cable", hsn: "8544", quantity: 2, rate: 100, gstRate: 12 }],
        services: [],
      }),
    ).toBe("sale-bill");
  });

  it("buildPersistedDocumentTypeAtCreate records user source when override locked", () => {
    expect(
      buildPersistedDocumentTypeAtCreate({
        userSelectedType: "sale-bill",
        userOverrideLocked: true,
        items: [],
        services: [{ description: "Install", sac: "9987", rate: 5000, gstRate: 18 }],
      }),
    ).toEqual({ type: "sale-bill", documentTypeSource: "user" });
  });

  it("normalizeBillingDocumentType does not re-infer when user locked", () => {
    const doc = baseInvoice({
      type: "sale-bill",
      documentTypeSource: "user",
      items: [{ description: "Panel", hsn: "8541", quantity: 1, rate: 1000, gstRate: 12 }],
      services: [{ description: "Install", sac: "9987", rate: 5000, gstRate: 18 }],
    });
    expect(normalizeBillingDocumentType(doc, "invoices")).toMatchObject({
      type: "sale-bill",
      documentTypeSource: "user",
    });
  });

  it("sanitizeBillingDocuments defaults saleBills bucket without type to sale-bill", () => {
    const row = baseInvoice({ type: undefined as unknown as "invoice" });
    const [sanitized] = sanitizeBillingDocuments([row], "saleBills");
    expect(sanitized.type).toBe("sale-bill");
    expect(sanitized.documentTypeSource).toBe("inferred");
  });

  it("stripVolatileDocumentTypeFields removes type fields from updates", () => {
    expect(
      stripVolatileDocumentTypeFields({
        type: "sale-bill",
        documentTypeSource: "user",
        status: "paid",
      }),
    ).toEqual({ status: "paid" });
  });
});
