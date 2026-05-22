import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { allowsMaterialDispatch } from "./seedCapabilityAxis";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import { resolveSiteForMaterialIssue } from "@/lib/materialIssueTransportTask";
import { structureItem } from "./seedInventoryCatalog";
import { countFor } from "./seedHelpers";
import { seedIncludesProjects } from "./seedProjectPhase";

const TRANSPORT_KINDS = [
  { workType: "Panel Transport", stageKey: "panel-transport" },
  { workType: "Inverter Transport", stageKey: "inverter-transport" },
  { workType: "Structure Transport", stageKey: "structure-transport" },
  { workType: "Material Transport", stageKey: "structure-transport" },
] as const;

/** §17 — ≥30 transport tasks; all 4 transport workTypes portfolio-wide. */
export function buildOpsTransportTasks(state: AppState, profile: SeedProfile): AppState {
  if (!seedIncludesProjects()) return state;

  const transportMin = countFor(profile, 32);
  const existing = state.tasks.filter((t) => t.workType.includes("Transport"));
  const missingKinds = TRANSPORT_KINDS.filter(
    (k) => !existing.some((t) => t.workType === k.workType),
  );

  for (const kind of missingKinds) {
    const project = state.projects.find(
      (p) => allowsMaterialDispatch(p.projectKind ?? "SOLO_EPC") && p.lifecycleStatus !== "New",
    );
    if (!project) continue;
    const resolved = resolveSiteForMaterialIssue(state.sites, project.id, project.name);
    state.tasks.push({
      id: seedId(SEED_ID_PREFIX.task),
      projectId: project.id,
      siteId: resolved.siteId,
      siteName: resolved.siteName,
      workType: kind.workType,
      milestoneId: kind.stageKey,
      notes: `Portfolio coverage — ${kind.workType}`,
      createdDate: seedDayAt(0.62),
      workDate: "2026-04-15",
      status: "sent",
      createdBy: "Karthik Rao",
      workItems: [{ stageKey: kind.stageKey.split("-")[0] ?? "structure", stageName: kind.workType, subItems: [kind.stageKey] }],
    });
  }

  const dispatchProjects = state.projects.filter(
    (p) => allowsMaterialDispatch(p.projectKind ?? "SOLO_EPC") && p.lifecycleStatus !== "New",
  );
  let i = 0;
  while (state.tasks.filter((t) => t.workType.includes("Transport")).length < transportMin) {
    const project = dispatchProjects[i % dispatchProjects.length];
    if (!project) break;
    const structure = structureItem(state.inventoryItems);
    const kind = TRANSPORT_KINDS[i % 4];
    const resolved = resolveSiteForMaterialIssue(state.sites, project.id, project.name);
    const date = seedDayAt(0.63 + i * 0.003);
    state.tasks.push({
      id: seedId(SEED_ID_PREFIX.task),
      projectId: project.id,
      siteId: resolved.siteId,
      siteName: resolved.siteName,
      workType: kind.workType,
      milestoneId: kind.stageKey,
      notes: `Structure dispatch — ${structure.name}`,
      createdDate: date,
      workDate: date.slice(0, 10),
      status: (["created", "sent", "started", "done"] as const)[i % 4],
      createdBy: "Karthik Rao",
      workItems: [{ stageKey: "structure", stageName: kind.workType, subItems: [kind.stageKey] }],
    });
    state.expenses.push({
      id: seedId(SEED_ID_PREFIX.expense),
      date: date.slice(0, 10),
      amount: 2200 + i * 50,
      mainCategory: "site",
      projectId: project.id,
      projectName: project.name,
      category: "Transport",
      subCategory: "material-transport",
      context: "project",
      paidBy: { type: "company" },
      notes: `Transport supplement — ${kind.workType}`,
      createdAt: date,
    });
    i++;
  }

  return state;
}
