import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { getMinimumFor } from "./seedVolumeTargets";
import { seedIncludesProjects } from "./seedProjectPhase";

/** Supplement scheduledInstallations to §4 minimum (20–30). */
export function buildOpsScheduling(state: AppState, profile: SeedProfile): AppState {
  if (!seedIncludesProjects()) return state;
  const target = getMinimumFor(profile, "scheduledInstallations");
  const statuses = ["scheduled", "in_progress", "completed", "cancelled"] as const;
  let i = 0;
  while (state.scheduledInstallations.length < target) {
    const project = state.projects[i % state.projects.length];
    const team = state.teams[i % state.teams.length];
    if (!project || project.projectKind === "VENDORSHIP_ONLY") {
      i++;
      continue;
    }
    state.scheduledInstallations.push({
      id: seedId(SEED_ID_PREFIX.installation),
      projectId: project.id,
      scheduledDate: seedDayAt(0.55 + i * 0.008),
      teamId: team?.id,
      employeeIds: team?.memberIds?.slice(0, 2),
      status: statuses[i % 4],
      createdAt: seedDateAt(0.54 + i * 0.008),
      doubleBookingOverrideReason: i % 11 === 0 ? "Client festival week slot" : undefined,
      pastDateOverrideReason: i % 13 === 0 ? "Retroactive schedule entry" : undefined,
    });
    i++;
  }
  return state;
}
