import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TopHeader Add button icon (Mn5)", () => {
  it("uses Plus instead of Sparkles on the Create/Add control", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/TopHeader.tsx"), "utf8");
    expect(source).toContain("Plus");
    expect(source).not.toMatch(/import[^;]*Sparkles/);
    expect(source).not.toContain("<Sparkles");
  });
});
