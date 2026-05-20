import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("BankReconciliationSheet mobile table scroll (MR4)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/audit/BankReconciliationSheet.tsx"),
    "utf8",
  );

  it("wraps results table in overflow-auto viewport with min table width", () => {
    expect(source).toContain('aria-label="Reconciliation results table"');
    expect(source).toContain("min-h-0 flex-1 overflow-auto");
    expect(source).toContain("noViewport");
    expect(source).toContain("min-w-[52rem]");
  });

  it("does not use vertical-only ScrollArea for the results grid", () => {
    expect(source).not.toMatch(/<ScrollArea[^>]*>[\s\S]*<Table/);
    expect(source).not.toContain('from "@/components/ui/scroll-area"');
  });
});
