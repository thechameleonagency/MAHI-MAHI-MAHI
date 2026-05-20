import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MaterialDamageSheet (Mn15)", () => {
  it("surfaces photo URL field and shared validation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/projects/MaterialDamageSheet.tsx"),
      "utf8",
    );
    expect(source).toContain("Photo URL(s)");
    expect(source).toContain("validateMaterialDamageForm");
    expect(source).toContain("materialDamageRequiresReason");
    expect(source).toContain("photoUrls");
  });
});
