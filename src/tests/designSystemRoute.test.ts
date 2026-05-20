import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("design system route", () => {
  it("App.tsx mounts DesignSystem on /settings/design-system (not Settings)", () => {
    const appPath = resolve(process.cwd(), "src/App.tsx");
    const source = readFileSync(appPath, "utf8");
    expect(source).toContain('path="/settings/design-system" element={<DesignSystem />}');
    expect(source).not.toMatch(/path="\/settings\/design-system"\s+element=\{<Settings/);
  });
});
