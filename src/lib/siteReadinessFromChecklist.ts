/**
 * E5 — Derive `project.siteReadiness.ready` from execution-site checklist completion.
 *
 * A checklist line is complete when status is `dispatched` or `partially-dispatched`.
 * When every line on every non-archived site for the project is complete, readiness
 * auto-flips to ready. When a derived readiness becomes incomplete, it auto-clears.
 * Manual readiness marks (any other `markedBy`) are not auto-cleared.
 */
import { buildSiteReadinessUpdate } from "@/lib/siteReadinessNormalize";
import type { Project, SiteChecklistItem, SiteRecord } from "@/types/project";

export const SITE_READINESS_DERIVED_MARKED_BY = "derived-site-checklist";

const READY_NOTE = "All site checklist items dispatched.";
const NOT_READY_NOTE = "Site checklist has pending items.";

export function isSiteChecklistLineComplete(line: SiteChecklistItem): boolean {
  return line.status === "dispatched" || line.status === "partially-dispatched";
}

export function projectSiteChecklistCompletion(
  projectId: string,
  sites: SiteRecord[],
): { hasChecklist: boolean; complete: boolean; totalLines: number; completeLines: number } {
  let totalLines = 0;
  let completeLines = 0;
  for (const site of sites) {
    if (site.projectId !== projectId || site.archivedAt) continue;
    for (const line of site.checklistItems ?? []) {
      totalLines += 1;
      if (isSiteChecklistLineComplete(line)) completeLines += 1;
    }
  }
  return {
    hasChecklist: totalLines > 0,
    complete: totalLines > 0 && completeLines === totalLines,
    totalLines,
    completeLines,
  };
}

/** Only pre-start projects use checklist-derived readiness (Start project gate). */
export function shouldDeriveSiteReadinessFromChecklist(project: Project): boolean {
  return !project.startedAt;
}

export function isDerivedSiteReadiness(markedBy: string | undefined): boolean {
  return markedBy === SITE_READINESS_DERIVED_MARKED_BY;
}

export function deriveSiteReadinessPatch(
  project: Project,
  sites: SiteRecord[],
): Partial<Pick<Project, "siteReadiness">> | null {
  if (!shouldDeriveSiteReadinessFromChecklist(project)) return null;

  const { hasChecklist, complete } = projectSiteChecklistCompletion(project.id, sites);
  if (!hasChecklist) return null;

  const current = project.siteReadiness;

  if (complete) {
    if (current?.ready === true) return null;
    return {
      siteReadiness: buildSiteReadinessUpdate({
        ready: true,
        note: READY_NOTE,
        markedBy: SITE_READINESS_DERIVED_MARKED_BY,
      }),
    };
  }

  if (current?.ready && isDerivedSiteReadiness(current.markedBy)) {
    return {
      siteReadiness: buildSiteReadinessUpdate({
        ready: false,
        note: NOT_READY_NOTE,
        markedBy: SITE_READINESS_DERIVED_MARKED_BY,
      }),
    };
  }

  return null;
}

/** Apply checklist-derived readiness to affected projects after site checklist mutations. */
export function syncProjectsSiteReadinessFromChecklist(
  projects: Project[],
  sites: SiteRecord[],
  affectedProjectIds: Iterable<string>,
): Project[] {
  const ids = new Set(affectedProjectIds);
  if (ids.size === 0) return projects;
  let changed = false;
  const next = projects.map((p) => {
    if (!ids.has(p.id)) return p;
    const patch = deriveSiteReadinessPatch(p, sites);
    if (!patch) return p;
    changed = true;
    return { ...p, ...patch };
  });
  return changed ? next : projects;
}
