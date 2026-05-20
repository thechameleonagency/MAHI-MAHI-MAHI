import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AGING_CHIP_COMPONENT, STATUS_BADGE_COMPONENT } from "@/lib/chipUsagePolicy";
import { getProjectOnHoldAging } from "@/lib/agingHelpers";
import type { Project } from "@/types/project";

const SRC = resolve(process.cwd(), "src");

/** Dashboard rows must use StatusBadge for entity state, not ad-hoc secondary Badge. */
const DASHBOARD_STATUS_ROW_FILES = [
  "components/dashboard/DashboardEnquiryRow.tsx",
  "components/dashboard/DashboardQuotationRow.tsx",
  "components/dashboard/DashboardProjectRow.tsx",
  "components/dashboard/DashboardBlockageRow.tsx",
  "components/dashboard/DashboardInvoiceRow.tsx",
];

const LEGACY_STATUS_BADGE = /Badge variant="secondary" className="capitalize text-2xs"/;

describe("DS5 chip usage consistency", () => {
  it("documents status and aging chip components", () => {
    expect(STATUS_BADGE_COMPONENT).toBe("StatusBadge");
    expect(AGING_CHIP_COMPONENT).toBe("AgingChip");
  });

  it("getProjectOnHoldAging does not duplicate On Hold without duration", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00"));
    const fresh = {
      status: "On Hold",
      updatedAt: "2026-05-17",
      createdAt: "2026-04-01",
    } as Project;
    expect(getProjectOnHoldAging(fresh)).toBeNull();

    const stale = {
      status: "On Hold",
      updatedAt: "2026-05-01",
      createdAt: "2026-04-01",
    } as Project;
    expect(getProjectOnHoldAging(stale)?.label).toMatch(/On hold \d+d/);
    vi.useRealTimers();
  });

  it("dashboard status rows use StatusBadge not legacy secondary Badge", () => {
    const violations: string[] = [];
    for (const rel of DASHBOARD_STATUS_ROW_FILES) {
      const src = readFileSync(resolve(SRC, rel), "utf8");
      if (!src.includes("StatusBadge")) violations.push(`${rel}: missing StatusBadge import`);
      if (LEGACY_STATUS_BADGE.test(src)) violations.push(`${rel}: legacy status Badge`);
    }
    expect(violations).toEqual([]);
  });

  it("ActiveSites uses StatusBadge for project status", () => {
    const src = readFileSync(resolve(SRC, "pages/ActiveSites.tsx"), "utf8");
    expect(src).toContain("StatusBadge");
    expect(src).not.toMatch(/getStatusColor\(project\.status\)/);
  });
});
