import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_DIALOG_SIZE_CLASS } from "@/components/shared/AppSheetLayout";

describe("InvoiceCreateSheet mobile width (MR3)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/invoices/InvoiceCreateSheet.tsx"),
    "utf8",
  );

  it("uses AppSheetContent xxl preset without raw 100vw width overrides", () => {
    expect(source).toContain('<AppSheetContent preset="financeForm">');
    expect(source).not.toMatch(/100vw/);
    expect(source).not.toMatch(/className=.*w-\[100vw\]/);
  });

  it("keeps form content inside mobile-safe layout (min-w-0 + responsive grids)", () => {
    expect(source).toContain("min-w-0 space-y-6");
    expect(source).toContain("grid-cols-1 gap-4 sm:grid-cols-3");
    expect(source).toContain("overflow-x-auto");
  });

  it("maps xxl preset to calc(100vw-1.5rem) mobile gutter", () => {
    expect(APP_DIALOG_SIZE_CLASS.xxl).toMatch(/max-w-\[calc\(100vw-1\.5rem\)\]/);
    expect(APP_DIALOG_SIZE_CLASS.xxl).not.toMatch(/w-\[100vw\]/);
  });
});
