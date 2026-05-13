import type { Project } from "@/types/project";

/** Work-area tab keys rendered on ProjectDetail (distinct from settings-style `visibleTabs` keys). */
export type ProjectDetailWorkTab = { value: string; label: string; snapshotKeys: string[] };

const BASE_DEFS: ProjectDetailWorkTab[] = [
  { value: "progress-report", label: "Progress Report", snapshotKeys: ["work"] },
  { value: "project-quotations", label: "Quotations", snapshotKeys: ["overview", "commercial"] },
  { value: "document-creator", label: "Document Creator", snapshotKeys: ["documents"] },
  { value: "materials-sent", label: "Materials Sent", snapshotKeys: ["materials"] },
  { value: "financials", label: "Financials", snapshotKeys: ["billing", "collections"] },
  { value: "field-operations", label: "Field Operations", snapshotKeys: ["sites"] },
  { value: "vendorship", label: "Partner Economics", snapshotKeys: ["partner_economics", "fixed_margin", "channel_fee"] },
  { value: "team-roster", label: "Team Roster", snapshotKeys: ["team_roster"] },
];

const KIND_TAB_DEFS: Record<string, ProjectDetailWorkTab[]> = {
  SOLO_EPC: BASE_DEFS.filter((t) => t.value !== "vendorship"),
  PARTNER_EPC: BASE_DEFS.map((t) =>
    t.value === "vendorship" ? { ...t, label: "Partner Economics" } : t,
  ),
  FIXED_EPC: BASE_DEFS.map((t) =>
    t.value === "vendorship" ? { ...t, label: "Partner Economics" } : t,
  ),
  VENDOR_NETWORK: BASE_DEFS.map((t) =>
    t.value === "vendorship" ? { ...t, label: "Channel Fee" } : t,
  ),
  INC: BASE_DEFS.filter((t) => t.value !== "vendorship"),
  INC_GIVEN: BASE_DEFS.filter((t) =>
    ["progress-report", "project-quotations", "financials", "team-roster"].includes(t.value),
  ),
  OUTSOURCED_INC: BASE_DEFS.filter((t) =>
    ["progress-report", "project-quotations", "financials", "team-roster"].includes(t.value),
  ),
  VENDORSHIP_ONLY: BASE_DEFS.filter((t) =>
    ["progress-report", "project-quotations", "financials", "team-roster"].includes(t.value),
  ),
};

function visibleSet(project: Project): Set<string> {
  const tabs = project.projectKindConfigSnapshot?.visibleTabs;
  if (tabs?.length) return new Set(tabs);
  const kind = project.projectKind ?? "SOLO_EPC";
  const defs = KIND_TAB_DEFS[kind] ?? KIND_TAB_DEFS.SOLO_EPC;
  return new Set(defs.flatMap((d) => d.snapshotKeys));
}

/** Full tab definitions for kind before visibility filter. */
export function projectKindTabDefs(project: Project): ProjectDetailWorkTab[] {
  const kind = project.projectKind ?? "SOLO_EPC";
  return KIND_TAB_DEFS[kind] ?? KIND_TAB_DEFS.SOLO_EPC;
}

/**
 * Filter work tabs using `projectKindConfigSnapshot.visibleTabs`.
 * `document-creator` label is overridden when scope uses external vendorship.
 */
export function filterWorkTabsBySnapshot(project: Project, docCreatorLabel: string): ProjectDetailWorkTab[] {
  const vis = visibleSet(project);
  const defs = projectKindTabDefs(project);
  return defs
    .filter((def) => def.snapshotKeys.some((k) => vis.has(k)))
    .map((def) =>
      def.value === "document-creator" ? { ...def, label: docCreatorLabel } : def,
    );
}

export function projectForbidsAction(project: Project | undefined, action: string): boolean {
  return Boolean(project?.projectKindConfigSnapshot?.forbiddenActions?.includes(action));
}
