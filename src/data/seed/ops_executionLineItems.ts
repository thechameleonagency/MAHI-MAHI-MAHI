import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { allowsMaterialDispatch } from "./seedCapabilityAxis";
import { seedDateAt } from "./seedTimeModel";

/** Ensure executionLineItems mirror siteChecklist on every dispatch project. */
export function buildOpsExecutionLineItems(state: AppState, _profile: SeedProfile): AppState {
  for (const project of state.projects) {
    if (!allowsMaterialDispatch(project.projectKind ?? "SOLO_EPC")) continue;
    if (!project.siteChecklist?.length) continue;
    if (project.executionLineItems?.length) continue;
    project.executionLineItems = project.siteChecklist.map((cl) => ({
      id: cl.id,
      description: cl.name,
      quantity: cl.qtyPlanned,
      unit: cl.unit,
      rate: cl.unitPrice ?? 0,
      total: (cl.unitPrice ?? 0) * cl.qtyPlanned,
      source: "quotation" as const,
      issuedQty: cl.qtySent,
      baselineLineId: cl.id,
      updatedAt: seedDateAt(0.35),
    }));
  }
  return state;
}
