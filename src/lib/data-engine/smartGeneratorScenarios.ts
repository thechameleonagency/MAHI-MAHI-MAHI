import type { ProjectKind } from "@/domain/projectTypes/types";
import type { ProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";

/**
 * Showcase lifecycle buckets per project kind:
 * - fresh: newly created — no sites, visits, or installs
 * - active: in progress with execution checklist (drives Need-to-Get when stock is low)
 * - completed: closed showcase with history
 */
export type ShowcaseLifecycle = "fresh" | "active" | "completed";

export interface ShowcaseScenario {
  id: string;
  label: string;
  projectKind: ProjectKind;
  lifecycle: ShowcaseLifecycle;
  customerName: string;
}

/** Main project kinds showcased (legacy INC omitted — covered by INC_GIVEN). */
export const SHOWCASE_PROJECT_KINDS = [
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
  "INC_GIVEN",
  "OUTSOURCED_INC",
  "VENDORSHIP_ONLY",
] as const satisfies readonly ProjectKind[];

const CUSTOMER_NAMES = [
  "Aarav Sharma Residence",
  "Green Valley Apartments",
  "Sunrise Industrial Unit",
  "Coastal Homes Society",
  "Metro Retail Plaza",
  "Hilltop Farmhouse",
  "Lakeview Bungalow",
  "Skyline Office Block",
  "Riverdale Warehouse",
  "Oakwood Villas",
  "Palm Grove Estate",
  "Silverline Factory",
  "Horizon Tech Park",
  "Cedar Heights",
  "Summit Corporate Park",
  "Valley View School",
  "Northgate Mall",
  "Beacon Hospital Wing",
  "Harbor Logistics Hub",
  "Zenith Co-working",
  "Crown Residency",
] as const;

const LIFECYCLE_ORDER: readonly ShowcaseLifecycle[] = ["fresh", "active", "completed"];

function scenarioId(kind: ProjectKind, lifecycle: ShowcaseLifecycle): string {
  return `${kind.toLowerCase()}_${lifecycle}`;
}

function lifecycleLabel(lifecycle: ShowcaseLifecycle): string {
  switch (lifecycle) {
    case "fresh":
      return "New (not started)";
    case "active":
      return "In Progress";
    case "completed":
      return "Completed";
  }
}

/** One fresh + one active + one completed project per main kind (21 showcase projects). */
export const SHOWCASE_SCENARIOS: ShowcaseScenario[] = SHOWCASE_PROJECT_KINDS.flatMap((kind, kindIdx) =>
  LIFECYCLE_ORDER.map((lifecycle, lifeIdx) => ({
    id: scenarioId(kind, lifecycle),
    label: `${kind.replace(/_/g, " ")} (${lifecycleLabel(lifecycle)})`,
    projectKind: kind,
    lifecycle,
    customerName: CUSTOMER_NAMES[(kindIdx * LIFECYCLE_ORDER.length + lifeIdx) % CUSTOMER_NAMES.length],
  })),
);

/** Standalone pipeline rows — not full project chains. */
export const PIPELINE_EXTRA_STEPS = [
  { id: "enquiry_open_1", type: "enquiry" as const, customerName: "Pending Lead Alpha" },
  { id: "enquiry_open_2", type: "enquiry" as const, customerName: "Pending Lead Beta" },
  { id: "quotation_draft", type: "quotation" as const, customerName: "Draft Quote Customer" },
] as const;

export function lifecycleToStage(lifecycle: ShowcaseLifecycle): ProjectLifecycleStatus {
  switch (lifecycle) {
    case "fresh":
      return "New";
    case "active":
      return "In Progress";
    case "completed":
      return "Completed";
  }
}

export function lifecycleStageIndex(lifecycle: ShowcaseLifecycle): number {
  switch (lifecycle) {
    case "fresh":
      return 0;
    case "active":
      return 1;
    case "completed":
      return 3;
  }
}

export function getShowcaseScenarioCount(): number {
  return SHOWCASE_SCENARIOS.length;
}

export function getPipelineExtraCount(): number {
  return PIPELINE_EXTRA_STEPS.length;
}
