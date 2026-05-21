import type { NarrativeApply } from "./shared";
import { seedDayAt } from "../seedTimeModel";

export const applyAttendanceInconsistency: NarrativeApply = (state) => {
  const emp = state.employees.find((e) => e.status === "Active");
  if (!emp) return;
  const week = "2026-03-10";
  state.attendanceRecords.push(
    { id: `ATT-INC-${emp.id}-1`, employeeId: emp.id, date: week, status: "half-day", sites: ["Hyderabad HQ"], notes: "AM site, PM office" },
    { id: `ATT-INC-${emp.id}-2`, employeeId: emp.id, date: "2026-03-11", status: "absent", sites: [], notes: "Sudden leave after half-day" },
  );
};
