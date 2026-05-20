import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GlobalSearch mobile popover (MR6)", () => {
  const searchSource = readFileSync(
    resolve(process.cwd(), "src/components/layout/GlobalSearch.tsx"),
    "utf8",
  );
  const headerSource = readFileSync(
    resolve(process.cwd(), "src/components/layout/TopHeader.tsx"),
    "utf8",
  );

  it("caps dropdown height and uses touch-friendly overflow scrolling", () => {
    expect(searchSource).toContain("max-h-[50vh]");
    expect(searchSource).toContain("overflow-y-auto overscroll-y-contain");
    expect(searchSource).not.toContain("ScrollArea");
  });

  it("supports embedded mode with sticky input for mobile search sheet", () => {
    expect(searchSource).toContain("embedded?: boolean");
    expect(searchSource).toContain("sticky top-0 z-10 bg-background");
    expect(headerSource).toContain("<GlobalSearch embedded");
  });
});
