import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  consumeRoleSwitchRouteDenied,
  markRoleSwitchRouteDenied,
  roleSwitchToastDescription,
} from "@/lib/roleSwitchToast";

describe("roleSwitchToast (Mn10)", () => {
  it("uses generic copy when no pins were removed", () => {
    expect(roleSwitchToastDescription(0, "admin")).toBe(
      "Navigation and actions now follow Admin permissions.",
    );
    expect(roleSwitchToastDescription(0, "admin")).not.toContain("0 pinned");
  });

  it("uses pin-removal copy only when count is positive", () => {
    expect(roleSwitchToastDescription(2, "salesperson")).toBe(
      "2 pinned link(s) removed for Salesperson. Navigation now follows that role's permissions.",
    );
  });

  it("route-denied flag suppresses duplicate hook toast", () => {
    markRoleSwitchRouteDenied();
    expect(consumeRoleSwitchRouteDenied()).toBe(true);
    expect(consumeRoleSwitchRouteDenied()).toBe(false);
  });

  it("useNavPinsForRole never interpolates removed.length without a guard", () => {
    const source = readFileSync(resolve(process.cwd(), "src/hooks/useNavPinsForRole.ts"), "utf8");
    expect(source).toContain("roleSwitchToastDescription(removed.length");
    expect(source).not.toMatch(/pinned link\(s\) removed[\s\S]*removed\.length/);
  });

  it("TopHeader uses login/logout instead of inline role switch toast", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/TopHeader.tsx"), "utf8");
    expect(source).toContain("logout");
    expect(source).not.toContain("markRoleSwitchRouteDenied");
    expect(source).not.toMatch(/Navigation and actions now follow/);
  });
});
