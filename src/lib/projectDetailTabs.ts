import type { Project } from "@/types/project";
import type { UserRole } from "@/domain/entities/identity";

/** Work-area tab keys rendered on ProjectDetail (distinct from settings-style `visibleTabs` keys). */
export type ProjectDetailWorkTab = { value: string; label: string; snapshotKeys: string[] };

const BASE_DEFS: ProjectDetailWorkTab[] = [
  { value: "progress-report", label: "Progress Report", snapshotKeys: ["work", "progress_report"] },
  // Quotations tab removed — quotation surfaces as a chip in the header card now.
  { value: "document-creator", label: "Document Creator", snapshotKeys: ["documents", "document_creator"] },
  { value: "materials-sent", label: "Materials Sent", snapshotKeys: ["materials", "materials_sent"] },
  { value: "financials", label: "Financials", snapshotKeys: ["billing", "collections"] },
  { value: "field-operations", label: "Field Operations", snapshotKeys: ["sites", "field_operations"] },
  { value: "vendorship", label: "Partner Economics", snapshotKeys: ["partner_economics", "fixed_margin", "channel_fee"] },
  { value: "team-roster", label: "Team Roster", snapshotKeys: ["team_roster"] },
];

function visibleSet(project: Project): Set<string> {
  const tabs = project.projectKindConfigSnapshot?.visibleTabs ?? [];
  return new Set(tabs);
}

/** Full tab definitions before visibility filter. Identity helper — all kinds get the same set,
 *  capability differences come from the snapshot. */
export function projectKindTabDefs(_project: Project): ProjectDetailWorkTab[] {
  return BASE_DEFS;
}

/**
 * Filter work tabs using `projectKindConfigSnapshot.visibleTabs`.
 *  - vendorship tab label flips to "Channel Fee" when partnerRole is vendor_channel.
 *  - document-creator is hidden entirely when vendorship is not owned by MSS.
 */
export function filterWorkTabsBySnapshot(project: Project, docCreatorLabel: string): ProjectDetailWorkTab[] {
  const vis = visibleSet(project);
  const vendorshipOwnedByMSS =
    project.vendorshipOwner === "MSS" || project.scope?.vendorshipOwner === "MSS";
  return BASE_DEFS
    .filter((def) => def.snapshotKeys.some((k) => vis.has(k)))
    .filter((def) => def.value !== "document-creator" || vendorshipOwnedByMSS)
    .map((def) => {
      if (def.value === "document-creator") return { ...def, label: docCreatorLabel };
      if (def.value === "vendorship") {
        return {
          ...def,
          label: project.partnerRole === "vendor_channel" ? "Channel Fee" : "Partner Economics",
        };
      }
      return def;
    });
}

export function projectForbidsAction(project: Project | undefined, action: string): boolean {
  return Boolean(project?.projectKindConfigSnapshot?.forbiddenActions?.includes(action));
}

/**
 * Phase 3 role-aware tab filter for ProjectDetail.
 *
 * - `super_admin` / `admin` / `management`: every tab.
 * - `ceo`: every tab (rendered with a "Read-only" badge by the page itself).
 * - `installation_team`: execution-related tabs only — no financials, no partner economics.
 * - `salesperson`: only the progress-report tab (sees won-from-own-quotation projects in a basic view).
 *
 * Apply this *after* `filterWorkTabsBySnapshot` so kind-specific tabs (which depend on
 * `projectKindConfigSnapshot.visibleTabs`) are still respected. Result: role × kind intersection.
 */
const EXECUTION_TABS_FOR_INSTALLATION = new Set([
  "progress-report",
  "materials-sent",
  "field-operations",
  "team-roster",
]);
const SALESPERSON_TABS = new Set(["progress-report"]);

export function filterWorkTabsByRole(
  tabs: ProjectDetailWorkTab[],
  role: UserRole,
): ProjectDetailWorkTab[] {
  switch (role) {
    case "super_admin":
    case "admin":
    case "management":
    case "ceo":
      return tabs;
    case "installation_team":
      return tabs.filter((t) => EXECUTION_TABS_FOR_INSTALLATION.has(t.value));
    case "salesperson":
      return tabs.filter((t) => SALESPERSON_TABS.has(t.value));
    default:
      return tabs;
  }
}
