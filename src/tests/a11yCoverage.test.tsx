import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("a11y coverage", () => {
  it("Customers delete control exposes an aria-label", () => {
    const source = readFileSync(join(process.cwd(), "src", "pages", "Customers.tsx"), "utf8");
    expect(source).toMatch(/aria-label=\{`Delete customer \$\{customer\.name\}`\}/);
    expect(source).toMatch(/<Trash2[^>]*aria-hidden/);
  });
});
