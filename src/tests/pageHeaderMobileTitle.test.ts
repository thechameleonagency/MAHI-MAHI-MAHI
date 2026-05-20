import { describe, expect, it } from "vitest";
import { mobilePageTitleFromBreadcrumbs } from "@/lib/pageHeaderMobileTitle";

describe("mobilePageTitleFromBreadcrumbs", () => {
  it("returns the last visible crumb label", () => {
    expect(
      mobilePageTitleFromBreadcrumbs([
        { label: "Home", to: "/" },
        { label: "Projects", to: "/projects" },
        { label: "PROJ-001" },
      ]),
    ).toBe("PROJ-001");
  });

  it("ignores empty labels", () => {
    expect(mobilePageTitleFromBreadcrumbs([{ label: "  " }, { label: "Invoices" }])).toBe("Invoices");
  });

  it("returns null when no crumbs", () => {
    expect(mobilePageTitleFromBreadcrumbs([])).toBeNull();
  });
});
