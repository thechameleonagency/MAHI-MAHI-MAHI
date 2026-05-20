import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("NeedToGetSheet mobile merge visibility (MR5)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/need-to-get/NeedToGetSheet.tsx"),
    "utf8",
  );

  it("shows a sticky mobile merge strip above results and keeps desktop merge note", () => {
    expect(source).toContain("MR5: merge rules + live summary stay visible above mobile results");
    expect(source).toContain("sticky top-0 z-10");
    expect(source).toContain("md:hidden print:hidden");
    expect(source).toMatch(/hidden rounded-md border[\s\S]*md:block print:hidden/);
    expect(source).toContain("NEED_TO_GET_MERGE_HINT[groupMode]");
    expect(source).toContain("{mergeSummary}");
  });

  it("surfaces merge copy inside Group/sort popover (DS10 — not tooltip)", () => {
    expect(source).toContain("w-[min(18rem,calc(100vw-2rem))]");
    expect(source).toContain("text-2xs leading-snug text-muted-foreground");
    expect(source).not.toMatch(/TooltipContent[\s\S]{0,400}NEED_TO_GET_MERGE_HINT/);
  });
});
