import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getSidebarNavItemByPath } from "@/lib/sidebarNav";

describe("design system route", () => {
  it("App.tsx mounts DesignSystem on /settings/design-system (not Settings)", () => {
    const appPath = resolve(process.cwd(), "src/App.tsx");
    const source = readFileSync(appPath, "utf8");
    expect(source).toContain('path="/settings/design-system" element={<DesignSystem />}');
    expect(source).not.toMatch(/path="\/settings\/design-system"\s+element=\{<Settings/);
  });

  it("sidebar nav exposes design system under System (DS3)", () => {
    const item = getSidebarNavItemByPath("/settings/design-system");
    expect(item?.path).toBe("/settings/design-system");
    expect(item?.label).toBe("Design system");
  });
});
