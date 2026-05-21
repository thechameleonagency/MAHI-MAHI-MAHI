import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ListPrefixDetailRedirect (MD6)", () => {
  it("App.tsx wires list-path detail aliases to canonical prefixes", () => {
    const source = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    expect(source).toContain('path="/vendorship-companies/:id"');
    expect(source).toContain('detailPrefix="/vendorship"');
    expect(source).toContain('path="/inc-work-sources/:id"');
    expect(source).toContain('detailPrefix="/inc-sources"');
  });

  it("redirect component encodes id segment", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/routing/ListPrefixDetailRedirect.tsx"),
      "utf8",
    );
    expect(source).toContain("encodeURIComponent(id.trim())");
    expect(source).toContain("<Navigate");
  });
});
