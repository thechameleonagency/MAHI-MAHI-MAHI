import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINANCE_LINE_ITEM_FIELD_GRID,
  FINANCE_LINE_ITEM_ROW_SHELL,
} from "@/lib/financeLineItemLayout";

describe("finance line item layout (UX3)", () => {
  it("exports responsive card-to-grid classes", () => {
    expect(FINANCE_LINE_ITEM_ROW_SHELL).toContain("rounded-lg");
    expect(FINANCE_LINE_ITEM_FIELD_GRID).toContain("grid-cols-1");
    expect(FINANCE_LINE_ITEM_FIELD_GRID).toContain("md:grid-cols-12");
    expect(FINANCE_LINE_ITEM_FIELD_GRID).not.toContain("overflow-x");
  });

  it("InvoiceCreateSheet uses FinanceLineItemRow instead of horizontal scroll wrappers", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/invoices/InvoiceCreateSheet.tsx"),
      "utf8",
    );
    expect(source).toContain("FinanceLineItemRow");
    expect(source).not.toContain("min-w-[36rem]");
    expect(source).not.toContain("min-w-[40rem]");
    expect(source).not.toMatch(/overflow-x-auto[\s\S]*grid-cols-12/);
  });

  it("Finance hub invoice create and detail use shared mobile layout", () => {
    const finance = readFileSync(resolve(process.cwd(), "src/pages/Finance.tsx"), "utf8");
    expect(finance).toContain("FinanceLineItemRow");
    expect(finance).toContain("InvoiceLineItemsReadOnly");
    expect(finance).not.toMatch(/grid grid-cols-12 gap-2 items-end/);
  });

  it("Invoices detail sheet uses shared read-only line layout", () => {
    const invoices = readFileSync(resolve(process.cwd(), "src/pages/Invoices.tsx"), "utf8");
    expect(invoices).toContain("InvoiceLineItemsReadOnly");
  });

  it("VendorDetail purchase lines use FinanceLineItemRow", () => {
    const vendor = readFileSync(resolve(process.cwd(), "src/pages/VendorDetail.tsx"), "utf8");
    expect(vendor).toContain("FinanceLineItemRow");
    expect(vendor).not.toMatch(/grid grid-cols-12 gap-2 items-end/);
  });

  it("read-only invoice lines render mobile cards and sticky description on md+", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/finance/InvoiceLineItemsReadOnly.tsx"),
      "utf8",
    );
    expect(source).toContain("md:hidden");
    expect(source).toContain("hidden md:block");
    expect(source).toContain("sticky left-0");
  });
});
