import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt, seedDayAt } from "../seedTimeModel";

export const applyDoubleBookInstall: NarrativeApply = (state) => {
  const team = state.teams.find((t) => t.status === "Active");
  const projects = state.projects.filter((p) => p.lifecycleStatus === "In Progress").slice(0, 2);
  if (!team || projects.length < 2) return;
  const date = seedDayAt(0.62);
  for (const p of projects) {
    state.scheduledInstallations.push({
      id: seedId(SEED_ID_PREFIX.installation),
      projectId: p.id,
      scheduledDate: date,
      teamId: team.id,
      employeeIds: team.memberIds.slice(0, 2),
      status: "scheduled",
      doubleBookingOverrideReason: "Festival week crunch — client insisted same crew",
      createdAt: seedDateAt(0.61),
    });
  }
};
