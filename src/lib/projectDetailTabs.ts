import type { ProjectKind } from "@/domain/projectTypes/types";

import type { Project } from "@/types/project";

import type { UserRole } from "@/domain/entities/identity";



/** Work-area tab keys rendered on ProjectDetail (distinct from settings-style `visibleTabs` keys). */

export type ProjectDetailWorkTab = { value: string; label: string; snapshotKeys: string[] };



const BASE_DEFS: ProjectDetailWorkTab[] = [

  { value: "progress-report", label: "Progress Report", snapshotKeys: ["work", "progress_report"] },

  { value: "document-creator", label: "Document Creator", snapshotKeys: ["documents", "document_creator"] },

  { value: "materials-sent", label: "Materials Sent", snapshotKeys: ["materials", "materials_sent"] },

  { value: "financials", label: "Financials", snapshotKeys: ["billing", "collections"] },

  { value: "field-operations", label: "Field Operations", snapshotKeys: ["sites", "field_operations"] },

  { value: "vendorship", label: "Partner Economics", snapshotKeys: ["partner_economics", "fixed_margin", "channel_fee"] },

  { value: "team-roster", label: "Team Roster", snapshotKeys: ["team_roster"] },

  { value: "outsource-execution", label: "Outsource Execution", snapshotKeys: ["outsource_execution"] },

];



/** Kind-level tab allowlist when snapshot is missing or for extra safety. */

const KIND_TAB_ALLOWLIST: Partial<Record<ProjectKind, string[]>> = {

  SOLO_EPC: ["progress-report", "document-creator", "materials-sent", "financials", "field-operations", "team-roster"],

  PARTNER_EPC: ["progress-report", "document-creator", "materials-sent", "financials", "field-operations", "team-roster", "vendorship"],

  FIXED_EPC: ["progress-report", "document-creator", "materials-sent", "financials", "field-operations", "team-roster", "vendorship"],

  VENDOR_NETWORK: ["progress-report", "document-creator", "materials-sent", "financials", "field-operations", "team-roster", "vendorship"],

  INC: ["progress-report", "document-creator", "financials", "field-operations", "team-roster"],

  INC_GIVEN: ["progress-report", "field-operations", "team-roster", "financials"],

  OUTSOURCED_INC: ["progress-report", "document-creator", "financials", "field-operations", "team-roster", "outsource-execution"],

  VENDORSHIP_ONLY: ["financials", "document-creator", "vendorship"],

};



function visibleSet(project: Project): Set<string> {

  const tabs = project.projectKindConfigSnapshot?.visibleTabs ?? [];

  return new Set(tabs);

}



/** True when the project's capability snapshot includes any of the given tab keys. */

export function projectSnapshotHasTab(project: Project, keys: string[]): boolean {

  const vis = visibleSet(project);

  return keys.some((k) => vis.has(k));

}



/** Whether this project kind models MSS → customer invoicing (vs collections-only or fee-only). */

export function projectShowsClientInvoices(project: Project): boolean {

  if (project.projectKindConfigSnapshot?.requiresClientInvoice === false) return false;

  return projectSnapshotHasTab(project, ["billing"]);

}



/** Primary counterparty label for the project header card. */

export function projectPrimaryPartyLabel(project: Project, kind: ProjectKind): string {

  switch (kind) {

    case "INC_GIVEN":

      return "INC giver";

    case "VENDORSHIP_ONLY":

      return "Code owner";

    case "VENDOR_NETWORK":

      return "Channel partner";

    case "PARTNER_EPC":

    case "FIXED_EPC":

      return "End customer";

    default:

      return "Customer";

  }

}



/** Infer deal-origin badge value when legacy projects omit `dealOrigin`. */

export function dealOriginFromProjectKind(kind: ProjectKind): NonNullable<Project["dealOrigin"]> {

  switch (kind) {

    case "PARTNER_EPC":

    case "FIXED_EPC":

    case "VENDOR_NETWORK":

      return "PARTNER";

    case "INC":

    case "INC_GIVEN":

      return "INC_TAKEN";

    case "OUTSOURCED_INC":

      return "OUTSOURCED_INC";

    case "VENDORSHIP_ONLY":

      return "VENDORSHIP_ONLY";

    default:

      return "DIRECT";

  }

}



export function projectKindTabDefs(project: Project): ProjectDetailWorkTab[] {

  const kind = project.projectKind ?? "SOLO_EPC";

  const allow = KIND_TAB_ALLOWLIST[kind];

  if (!allow) return BASE_DEFS;

  return BASE_DEFS.filter((def) => allow.includes(def.value));

}



/**

 * Filter work tabs using `projectKindConfigSnapshot.visibleTabs` and kind allowlist.

 *  - vendorship tab label flips to "Channel Fee" when partnerRole is vendor_channel.

 *  - document-creator is hidden when vendorship is not owned by MSS.

 */

export function filterWorkTabsBySnapshot(project: Project, docCreatorLabel: string): ProjectDetailWorkTab[] {

  const vis = visibleSet(project);

  const kindDefs = projectKindTabDefs(project);

  const vendorshipOwnedByMSS =

    project.vendorshipOwner === "MSS" || project.scope?.vendorshipOwner === "MSS";

  return kindDefs

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

/** Outsource execution section — Direct, Partner, INC Taken only (not Vendorship Only). */
export function projectShowsOutsourceSection(project: Project): boolean {
  const kind = project.projectKind ?? "SOLO_EPC";
  if (kind === "VENDORSHIP_ONLY") return false;
  return ["SOLO_EPC", "PARTNER_EPC", "FIXED_EPC", "INC_GIVEN", "OUTSOURCED_INC", "INC"].includes(kind);
}

/** INC Taken material dispatch toggle on project detail. */
export function projectShowsMaterialSupplyToggle(project: Project): boolean {
  return project.projectKind === "INC_GIVEN" && Boolean(project.scope?.materialSupplyPending);
}



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

/** Default work tab when opening project detail (URL may override via ?tab=). */
export function defaultProjectDetailTab(
  kind: ProjectKind,
  tabs: ProjectDetailWorkTab[],
): string {
  if (tabs.length === 0) return "progress-report";
  if (kind === "VENDORSHIP_ONLY") {
    return tabs.find((t) => t.value === "financials")?.value ?? tabs[0].value;
  }
  return tabs.find((t) => t.value === "progress-report")?.value ?? tabs[0].value;
}


