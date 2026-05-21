import type { AppState } from "@/contexts/AppDataContext";
import {
  linkAccrualsToProject,
  markProjectAccrualsPayable,
  reconcileAgentCommissionAccruals,
} from "@/lib/agentCommissionAccrualPolicy";
import type { Project } from "@/types/project";

export type StaleProjectStartContinuity = {
  projectId: string;
  reason: "in_progress_without_started_at" | "started_with_pending_accrual";
};

const ACTIVE_LIFECYCLES = new Set<Project["lifecycleStatus"]>([
  "In Progress",
  "On Hold",
  "Completed",
]);

/** In-flight projects must have a canonical start timestamp (FC5). */
export function reconcileProjectStartedAt(projects: Project[]): Project[] {
  return projects.map((p) => {
    if (!ACTIVE_LIFECYCLES.has(p.lifecycleStatus) || p.startedAt?.trim()) {
      return p;
    }
    const day = p.startDate?.trim() || p.createdAt?.slice(0, 10);
    const fallback = day
      ? day.includes("T")
        ? day
        : `${day}T08:00:00.000Z`
      : new Date().toISOString();
    return { ...p, startedAt: fallback };
  });
}

export function findStaleProjectStartContinuity(state: AppState): StaleProjectStartContinuity[] {
  const stale: StaleProjectStartContinuity[] = [];
  for (const project of state.projects) {
    if (
      (project.lifecycleStatus === "In Progress" || project.lifecycleStatus === "On Hold") &&
      !project.startedAt?.trim()
    ) {
      stale.push({ projectId: project.id, reason: "in_progress_without_started_at" });
      continue;
    }
    if (!project.startedAt?.trim()) continue;
    if (!project.agentId && !project.quotationId) continue;

    const linked = (state.agentCommissionAccruals ?? []).filter(
      (a) =>
        a.projectId === project.id ||
        (project.quotationId != null && a.sourceQuotationId === project.quotationId),
    );
    if (linked.some((a) => a.status === "pending")) {
      stale.push({ projectId: project.id, reason: "started_with_pending_accrual" });
    }
  }
  return stale;
}

/** Link accruals, backfill startedAt on active projects, and mark payable when started (FC5). */
export function reconcileProjectAgentCommissionState(state: AppState): AppState {
  const projects = reconcileProjectStartedAt(state.projects);
  let agentCommissionAccruals = state.agentCommissionAccruals ?? [];

  for (const project of projects) {
    if (project.quotationId || project.agentId) {
      agentCommissionAccruals = linkAccrualsToProject(
        agentCommissionAccruals,
        project.id,
        project.quotationId,
        project.agentId,
      );
    }
  }

  agentCommissionAccruals = reconcileAgentCommissionAccruals({
    accruals: agentCommissionAccruals,
    quotations: state.quotations,
    projects,
    agents: state.agents,
  });

  return { ...state, projects, agentCommissionAccruals };
}

/** Apply commission payable transition when `startedAt` is first set (live UI). */
export function applyCommissionAccrualsOnProjectStart(
  accruals: AppState["agentCommissionAccruals"],
  project: Pick<Project, "id" | "quotationId" | "agentId">,
  now = new Date().toISOString(),
): AppState["agentCommissionAccruals"] {
  return markProjectAccrualsPayable(
    accruals ?? [],
    project.id,
    project.quotationId,
    now,
  );
}
