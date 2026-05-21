import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TopHeader mobile layout (MR2)", () => {
  const topHeaderSource = readFileSync(
    resolve(process.cwd(), "src/components/layout/TopHeader.tsx"),
    "utf8",
  );
  const pinControlsSource = readFileSync(
    resolve(process.cwd(), "src/components/layout/PageHeaderPinControls.tsx"),
    "utf8",
  );

  it("hides breadcrumb trail below sm and shows a compact page title", () => {
    expect(topHeaderSource).toContain(
      "hidden min-w-0 flex-1 flex-wrap items-center gap-1 text-sm text-muted-foreground sm:flex",
    );
    expect(topHeaderSource).toContain(
      "min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:hidden",
    );
    expect(topHeaderSource).toMatch(/mobilePageTitleFromBreadcrumbs/);
  });

  it("moves pin controls to md+ and exposes pin/settings in a mobile More menu", () => {
    expect(topHeaderSource).toContain("PageHeaderPinControls");
    expect(pinControlsSource).toContain("hidden items-center gap-0.5 md:flex");
    expect(topHeaderSource).toContain('className="h-8 w-8 shrink-0 md:hidden"');
    expect(topHeaderSource).toContain("More header actions");
    expect(topHeaderSource).toContain("hidden h-8 w-8 md:inline-flex md:h-9 md:w-9");
  });
});
