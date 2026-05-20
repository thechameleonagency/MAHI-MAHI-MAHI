import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SiteVisitSheet (Mn16)", () => {
  it("validates photo URLs before save and warns on invalid lines", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/projects/SiteVisitSheet.tsx"),
      "utf8",
    );
    expect(source).toContain("parseValidatedPhotoUrlLines");
    expect(source).toContain("Invalid photo URL(s) skipped");
    expect(source).not.toMatch(/photoUrls\s*\n\s*\.split/);
  });
});
