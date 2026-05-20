import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DASHBOARD_COMPACT_ROW_MENU_COMPONENT } from "@/lib/dashboardRowActionPolicy";

const SRC = resolve(process.cwd(), "src");
const DASHBOARD_ROWS_DIR = join(SRC, "components/dashboard");

/** Legacy compact-row patterns (DS6). */
const LEGACY_FOOTER_CTA = /Button size="sm" variant="outline" className="h-7 text-xs/;
const LEGACY_GHOST_OPEN = /ExternalLink className="h-3\.5 w-3\.5"/;
const INLINE_PERMISSION_BUTTON = /PermissionGatedButton/;

const ROW_FILE_ALLOWLIST = [
  "DashboardCompactRowMenu.tsx",
  "DashboardEmployeeCard.tsx",
  "DashboardTodaysSiteActivity.tsx",
  "DashboardOnboardingHero.tsx",
];

function listDashboardRowFiles(): string[] {
  return readdirSync(DASHBOARD_ROWS_DIR)
    .filter((name) => name.startsWith("Dashboard") && name.endsWith(".tsx"))
    .filter((name) => !ROW_FILE_ALLOWLIST.includes(name))
    .map((name) => `components/dashboard/${name}`);
}

describe("DS6 dashboard row action consistency", () => {
  it("documents compact row menu component", () => {
    expect(DASHBOARD_COMPACT_ROW_MENU_COMPONENT).toBe("DashboardCompactRowMenu");
  });

  it("compact dashboard rows use DashboardCompactRowMenu, not footer CTAs or inline strips", () => {
    const violations: string[] = [];
    for (const rel of listDashboardRowFiles()) {
      const src = readFileSync(resolve(SRC, rel), "utf8");
      if (!src.includes("DashboardCompactRowMenu")) {
        violations.push(`${rel}: missing DashboardCompactRowMenu`);
      }
      if (LEGACY_FOOTER_CTA.test(src)) {
        violations.push(`${rel}: legacy footer outline CTA`);
      }
      if (INLINE_PERMISSION_BUTTON.test(src)) {
        violations.push(`${rel}: inline PermissionGatedButton strip`);
      }
      if (LEGACY_GHOST_OPEN.test(src)) {
        violations.push(`${rel}: legacy ghost ExternalLink action`);
      }
    }
    expect(violations).toEqual([]);
  });
});
