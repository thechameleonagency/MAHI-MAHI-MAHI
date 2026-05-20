import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("addClientPaymentRecord (Mn18)", () => {
  it("context write path validates via validateClientPaymentRecord and returns boolean", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
      "utf8",
    );
    expect(source).toContain("validateClientPaymentRecord(");
    expect(source).toContain("addClientPaymentRecord = useCallback((record: ClientPaymentRecord): boolean");
    expect(source).toMatch(/return false;\s*\n\s*}\s*\n\s*setState/);
    expect(source).toContain("return true;");
  });

  it("ClientPaymentHistory delegates amount guards to shared validation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/projects/ClientPaymentHistory.tsx"),
      "utf8",
    );
    expect(source).toContain("validateClientPaymentRecord");
    expect(source).toContain("if (!saved) return");
    expect(source).not.toContain('title: "Over contract"');
  });
});
