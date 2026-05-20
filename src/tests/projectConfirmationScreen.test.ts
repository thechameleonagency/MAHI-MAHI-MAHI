import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatINR } from "@/lib/formatCurrency";

describe("ProjectConfirmationScreen (Mn14)", () => {
  it("uses formatINR for contract value (Indian grouping)", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    const source = readFileSync(
      resolve(process.cwd(), "src/components/projects/ProjectConfirmationScreen.tsx"),
      "utf8",
    );
    expect(source).toContain("formatINR(data.contractAmount)");
    expect(source).not.toMatch(/contractAmount\.toLocaleString\(/);
  });
});
