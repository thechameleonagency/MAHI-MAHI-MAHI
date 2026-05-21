import type { NarrativeApply } from "./shared";
import { seedDateAt, seedDayAt } from "../seedTimeModel";

export const applyRescheduledTask: NarrativeApply = (state) => {
  const task = state.tasks.find((t) => t.status !== "done");
  if (!task) return;
  const original = task.workDate;
  task.originalDate = original;
  task.workDate = "2026-05-18";
  task.delayHistory = [
    { from: original, to: "2026-05-18", reason: "Heavy rain — crew redeployed", at: seedDateAt(0.7) },
  ];
  task.workDate = seedDayAt(0.7).slice(0, 10);
};
