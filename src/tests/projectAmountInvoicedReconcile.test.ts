import { describe, expect, it } from "vitest";
import {
  getProjectAmountInvoiced,
  reconcileProjectsAmountInvoiced,
} from "@/lib/billingSelectors";
import type { Invoice } from "@/types/finance";
import type { Project } from "@/types/project";

const baseProject = (id: string): Project =>
  ({
    id,
    name: "Test",
    contractAmount: 100_000,
    amountReceived: 0,
    amountInvoiced: 99_999,
  }) as Project;

const bill = (partial: Partial<Invoice> & Pick<Invoice, "id" | "projectId" | "total" | "status">): Invoice =>
  ({
    invoiceNumber: partial.id,
    customerId: "C1",
    invoiceDate: "2026-01-01",
    cgst: 0,
    sgst: 0,
    igst: 0,
    items: [],
    services: [],
    ...partial,
  }) as Invoice;

describe("project amountInvoiced reconciliation", () => {
  it("sums only active invoices and sale bills for a project", () => {
    const invoices = [
      bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" }),
      bill({ id: "INV-2", projectId: "P1", total: 5_000, status: "voided" }),
      bill({ id: "INV-3", projectId: "P1", total: 2_000, status: "draft" }),
    ];
    const saleBills = [bill({ id: "SB-1", projectId: "P1", total: 3_000, status: "sent" })];
    expect(getProjectAmountInvoiced("P1", invoices, saleBills)).toBe(13_000);
  });

  it("reconcileProjectsAmountInvoiced replaces stale stored totals", () => {
    const projects = [baseProject("P1")];
    const invoices = [bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" })];
    const reconciled = reconcileProjectsAmountInvoiced(projects, invoices, []);
    expect(reconciled[0].amountInvoiced).toBe(10_000);
  });

  it("delete/void semantics: voided invoice excluded from reconciled total", () => {
    const projects = [baseProject("P1")];
    const before = [
      bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" }),
      bill({ id: "INV-2", projectId: "P1", total: 5_000, status: "paid" }),
    ];
    const afterVoid = [
      bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" }),
      bill({ id: "INV-2", projectId: "P1", total: 5_000, status: "voided" }),
    ];
    expect(reconcileProjectsAmountInvoiced(projects, before, [])[0].amountInvoiced).toBe(15_000);
    expect(reconcileProjectsAmountInvoiced(projects, afterVoid, [])[0].amountInvoiced).toBe(10_000);
  });

  it("simulates delete: removed invoice drops from reconciled total", () => {
    const projects = [baseProject("P1")];
    const two = [
      bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" }),
      bill({ id: "INV-2", projectId: "P1", total: 5_000, status: "paid" }),
    ];
    const one = [bill({ id: "INV-1", projectId: "P1", total: 10_000, status: "paid" })];
    expect(reconcileProjectsAmountInvoiced(projects, two, [])[0].amountInvoiced).toBe(15_000);
    expect(reconcileProjectsAmountInvoiced(projects, one, [])[0].amountInvoiced).toBe(10_000);
  });
});
