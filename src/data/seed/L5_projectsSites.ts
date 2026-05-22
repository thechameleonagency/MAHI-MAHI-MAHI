import type { AppState } from "@/contexts/AppDataContext";
import type { Project, SiteRecord } from "@/types/project";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import { pushAudit } from "./seedHelpers";
import { attachProjectBundle } from "./seedProjectBundles";
import { seedIncludesProjects } from "./seedProjectPhase";
import { reseedProjectsViaCommands } from "./projectReseed";
import type { CapabilityProjectSpec } from "./seedCapabilityAxis";

function createMainSite(project: Project, spec: CapabilityProjectSpec, fraction: number): SiteRecord {
  return {
    id: seedId(SEED_ID_PREFIX.site),
    name: `${project.name} — Main Site`,
    projectId: project.id,
    projectName: project.name,
    status: spec.lifecycle === "Completed" ? "completed" : spec.lifecycle === "On Hold" ? "on-hold" : "active",
    workStartDate: seedDayAt(fraction + 0.02),
  };
}

function createBlockBSite(project: Project, fraction: number): SiteRecord {
  return {
    id: seedId(SEED_ID_PREFIX.site),
    name: `${project.name} — Block B`,
    projectId: project.id,
    projectName: project.name,
    status: "active",
    workStartDate: seedDayAt(fraction + 0.03),
  };
}

/** L5 — command-based project reseed + sites/timelines via bundles. */
export function buildL5ProjectsSites(state: AppState, profile: SeedProfile): AppState {
  if (!seedIncludesProjects()) {
    return state;
  }

  const { state: withProjects, entries } = reseedProjectsViaCommands(state, profile);
  state = withProjects;

  for (const entry of entries) {
    const project = state.projects.find((p) => p.id === entry.projectId);
    if (!project) continue;
    const fraction = 0.2 + entry.globalIndex * 0.015;
    const site = createMainSite(project, entry.spec, fraction);
    state.sites.push(site);
    if (entry.spec.multiSite) {
      state.sites.push(createBlockBSite(project, fraction));
    }
    attachProjectBundle({
      state,
      project,
      site,
      fraction,
      index: entry.globalIndex,
      richTimeline: entry.spec.richTimeline,
    });
  }

  pushAudit(state, {
    action: "create",
    entityType: "Project",
    entityId: state.projects[0]?.id ?? "",
    entityName: state.projects[0]?.name ?? "",
    fraction: 0.21,
    role: "admin",
  });

  return state;
}
