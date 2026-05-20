import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("RoleMatrixTab (Mn21)", () => {
  it("uses structuredClone helpers instead of JSON deep-clone", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/settings/RoleMatrixTab.tsx"),
      "utf8",
    );
    expect(source).toContain("buildFeaturePermissionMatrixDraft");
    expect(source).toContain("cloneFeaturePermissionMatrix");
    expect(source).not.toMatch(/JSON\.parse\(JSON\.stringify/);
  });
});
