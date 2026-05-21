import { describe, expect, it } from "vitest";
import { getSidebarNavItemByPath, sidebarNavSections } from "@/lib/sidebarNav";
import { togglePinnedPath } from "@/lib/navPins";

describe("sidebarNav", () => {
  it("includes notifications in nav sections for pin resolution", () => {
    const system = sidebarNavSections.find((s) => s.id === "system");
    expect(system?.items.some((i) => i.path === "/notifications")).toBe(true);
    const item = getSidebarNavItemByPath("/notifications");
    expect(item?.label).toBe("Notifications");
  });

  it("includes design system in system section for demo discoverability (DS3)", () => {
    const system = sidebarNavSections.find((s) => s.id === "system");
    expect(system?.items.some((i) => i.path === "/settings/design-system")).toBe(true);
    const item = getSidebarNavItemByPath("/settings/design-system");
    expect(item?.label).toBe("Design system");
  });

  it("resolves pinned /notifications path to a nav item", () => {
    const pinned = togglePinnedPath("/notifications", []);
    expect(pinned).toEqual(["/notifications"]);
    const resolved = pinned
      .map((p) => getSidebarNavItemByPath(p))
      .filter((item): item is NonNullable<typeof item> => !!item);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.path).toBe("/notifications");
  });
});
