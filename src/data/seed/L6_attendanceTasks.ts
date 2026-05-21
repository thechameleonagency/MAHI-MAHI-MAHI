import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedMonths } from "./seedTimeModel";
import { countFor } from "./seedHelpers";

/** L6 — attendance records (400–800 full) + supplemental overdue tasks. */
export function buildL6AttendanceTasks(state: AppState, profile: SeedProfile): AppState {
  const target = countFor(profile, 500);
  const statuses = ["present", "absent", "holiday", "half-day", "paid_leave"] as const;
  const months = seedMonths();
  const activeEmployees = state.employees.filter((e) => e.status === "Active");
  let count = 0;

  for (const month of months) {
    for (let day = 1; day <= 28 && count < target; day++) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const dow = new Date(date).getDay();
      if (dow === 0) continue;
      for (const emp of activeEmployees) {
        if (count >= target) break;
        const status = statuses[(count + day) % statuses.length];
        state.attendanceRecords.push({
          id: seedId(SEED_ID_PREFIX.attendance),
          employeeId: emp.id,
          date,
          status,
          sites: state.sites.slice(0, 1).map((s) => s.name),
          notes: status === "half-day" ? "Site visit AM, office PM" : undefined,
        });
        count++;
      }
    }
  }

  // Overdue tasks for dashboard KPI
  const overdueCount = countFor(profile, 18);
  for (let i = 0; i < overdueCount; i++) {
    const project = state.projects[i % state.projects.length];
    const site = state.sites.find((s) => s.projectId === project?.id);
    if (!project || !site) continue;
    state.tasks.push({
      id: seedId(SEED_ID_PREFIX.task),
      projectId: project.id,
      siteId: site.id,
      siteName: site.name,
      workType: "Earthing rod installation",
      notes: "Overdue field task",
      createdDate: seedDayAt(0.3),
      workDate: "2026-05-10",
      status: "sent",
      createdBy: "Karthik Rao",
    });
  }

  return state;
}
