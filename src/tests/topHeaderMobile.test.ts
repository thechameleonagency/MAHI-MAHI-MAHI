import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TopHeader mobile layout (MR2)", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/layout/TopHeader.tsx"), "utf8");

  it("hides breadcrumb trail below sm and shows a compact page title", () => {
    expect(source).toContain("hidden min-w-0 flex-1 flex-wrap items-center gap-1 text-sm text-muted-foreground sm:flex");
    expect(source).toContain("min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:hidden");
    expect(source).toMatch(/mobilePageTitleFromBreadcrumbs/);
  });

  it("moves pin controls to md+ and exposes pin/settings in a mobile More menu", () => {
    expect(source).toContain("hidden items-center gap-0.5 md:flex");
    expect(source).toContain('className="h-8 w-8 shrink-0 md:hidden"');
    expect(source).toContain("More header actions");
    expect(source).toContain("hidden h-8 w-8 md:inline-flex md:h-9 md:w-9");
  });
});
