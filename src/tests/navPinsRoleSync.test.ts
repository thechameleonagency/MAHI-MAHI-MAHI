import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("nav pins role sync (Mn3 / Mn10)", () => {
  it("TopHeader does not call prunePinnedPathsForRole on role switch", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/TopHeader.tsx"), "utf8");
    expect(source).not.toContain("prunePinnedPathsForRole");
  });

  it("Sidebar delegates role prune and role-switch toast to useNavPinsForRole hook", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/Sidebar.tsx"), "utf8");
    expect(source).toContain("useNavPinsForRole");
    expect(source).not.toContain("prunePinnedPathsForRole");
  });
});
