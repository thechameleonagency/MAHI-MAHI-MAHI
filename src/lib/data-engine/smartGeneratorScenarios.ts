import type { ProjectKind } from "@/domain/projectTypes/types";

/** Lifecycle bucket for showcase projects — one open + one completed per main kind. */
export type ShowcaseLifecycle = "open" | "completed";

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
] as const;

function scenarioId(kind: ProjectKind, lifecycle: ShowcaseLifecycle): string {
  return `${kind.toLowerCase()}_${lifecycle}`;
}

/** One open + one completed project per main kind (14 showcase projects). */
export const SHOWCASE_SCENARIOS: ShowcaseScenario[] = SHOWCASE_PROJECT_KINDS.flatMap((kind, kindIdx) =>
  (["open", "completed"] as const).map((lifecycle, lifeIdx) => ({
    id: scenarioId(kind, lifecycle),
    label: `${kind.replace(/_/g, " ")} (${lifecycle === "open" ? "In Progress" : "Completed"})`,
    projectKind: kind,
    lifecycle,
    customerName: CUSTOMER_NAMES[(kindIdx * 2 + lifeIdx) % CUSTOMER_NAMES.length],
  })),
);

/** Standalone pipeline rows — not full project chains. */
export const PIPELINE_EXTRA_STEPS = [
  { id: "enquiry_open_1", type: "enquiry" as const, customerName: "Pending Lead Alpha" },
  { id: "enquiry_open_2", type: "enquiry" as const, customerName: "Pending Lead Beta" },
  { id: "quotation_draft", type: "quotation" as const, customerName: "Draft Quote Customer" },
] as const;

export function lifecycleToStage(lifecycle: ShowcaseLifecycle): "In Progress" | "Completed" {
  return lifecycle === "open" ? "In Progress" : "Completed";
}

export function lifecycleStageIndex(lifecycle: ShowcaseLifecycle): number {
  return lifecycle === "open" ? 1 : 3;
}

export function getShowcaseScenarioCount(): number {
  return SHOWCASE_SCENARIOS.length;
}

export function getPipelineExtraCount(): number {
  return PIPELINE_EXTRA_STEPS.length;
}
