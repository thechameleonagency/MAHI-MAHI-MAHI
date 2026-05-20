/**
 * Phase 3 — ProjectDetail tab visibility per role.
 *
 * Ensures installation_team and salesperson see only their scoped subset, while
 * super_admin / admin / management / ceo see every tab.
 */
import { describe, expect, it } from "vitest";
import { filterWorkTabsByRole, type ProjectDetailWorkTab } from "@/lib/projectDetailTabs";

const ALL_TABS: ProjectDetailWorkTab[] = [
  { value: "progress-report", label: "Progress Report", snapshotKeys: ["work"] },
  { value: "document-creator", label: "Document Creator", snapshotKeys: ["documents"] },
  { value: "materials-sent", label: "Materials Sent", snapshotKeys: ["materials"] },
  { value: "financials", label: "Financials", snapshotKeys: ["billing"] },
  { value: "field-operations", label: "Field Operations", snapshotKeys: ["sites"] },
  { value: "vendorship", label: "Partner Economics", snapshotKeys: ["partner_economics"] },
  { value: "team-roster", label: "Team Roster", snapshotKeys: ["team_roster"] },
];

describe("filterWorkTabsByRole", () => {
  it("super_admin sees every tab", () => {
    expect(filterWorkTabsByRole(ALL_TABS, "super_admin")).toEqual(ALL_TABS);
  });

  it("admin sees every tab", () => {
    expect(filterWorkTabsByRole(ALL_TABS, "admin")).toEqual(ALL_TABS);
  });

  it("management sees every tab", () => {
    expect(filterWorkTabsByRole(ALL_TABS, "management")).toEqual(ALL_TABS);
  });

  it("ceo sees every tab (rendered as read-only by the page)", () => {
    expect(filterWorkTabsByRole(ALL_TABS, "ceo")).toEqual(ALL_TABS);
  });

  it("installation_team sees execution tabs only — no financials, no partner economics", () => {
    const visible = filterWorkTabsByRole(ALL_TABS, "installation_team").map((t) => t.value);
    expect(visible).toEqual(["progress-report", "materials-sent", "field-operations", "team-roster"]);
    expect(visible).not.toContain("financials");
    expect(visible).not.toContain("vendorship");
    expect(visible).not.toContain("document-creator");
  });

  it("salesperson sees only progress-report (basic execution snapshot)", () => {
    const visible = filterWorkTabsByRole(ALL_TABS, "salesperson").map((t) => t.value);
    expect(visible).toEqual(["progress-report"]);
  });
});
