import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedHolidays, seedMonths } from "./seedTimeModel";
import {
  personName, phoneNumber, emailFor, EMPLOYEE_ROLES, TEAM_NAMES,
} from "./seedNames";
import { countFor, pushAudit } from "./seedHelpers";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";

/** L4 — employees, teams, holidays. */
export function buildL4Hr(state: AppState, profile: SeedProfile): AppState {
  const empCount = countFor(profile, 15);
  state.employees = Array.from({ length: empCount }, (_, i) => {
    const name = personName(100 + i);
    const inactive = i === empCount - 1;
    return {
      id: seedId(SEED_ID_PREFIX.employee),
      name,
      initial: name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      role: EMPLOYEE_ROLES[i % EMPLOYEE_ROLES.length],
      phone: phoneNumber(700 + i),
      email: emailFor(name, "mss.solar"),
      status: inactive ? ("Inactive" as const) : ("Active" as const),
      site: ["Hyderabad HQ", "Bangalore Yard", "Pune Warehouse", "Field"][i % 4],
      salary: 18000 + (i % 8) * 3500,
      wallet: i % 4 === 0 ? 2500 : 0,
      daysPresent: 18 + (i % 5),
      daysAbsent: i % 6,
      holidays: 2,
      advancePaid: i % 3 === 0 ? 5000 : 0,
      pendingAmount: i % 5 === 0 ? 1200 : 0,
      joiningDate: seedDayAt(0.01 + i * 0.002).slice(0, 10),
      terminatedAt: inactive ? seedDayAt(0.85) : undefined,
      terminationReason: inactive ? "Relocated out of state" : undefined,
    };
  });

  const teamCount = countFor(profile, 5);
  const activeEmployees = state.employees.filter((e) => e.status === "Active");
  state.teams = Array.from({ length: teamCount }, (_, i) => {
    const start = (i * 3) % activeEmployees.length;
    const members = activeEmployees.slice(start, start + 3).map((e) => e.id);
    return {
      id: seedId(SEED_ID_PREFIX.team),
      name: TEAM_NAMES[i % TEAM_NAMES.length],
      memberIds: members.length ? members : [activeEmployees[0]?.id ?? ""],
      leadId: members[0],
      status: i === teamCount - 1 ? ("Inactive" as const) : ("Active" as const),
      description: `${["North", "South", "Central", "Metro", "Rural"][i % 5]} zone installation crew`,
      createdAt: seedDayAt(0.05 + i * 0.003),
    };
  });

  state.holidays = seedHolidays();

  const months = seedMonths();
  for (const emp of state.employees.filter((e) => e.status === "Active")) {
    for (const month of months) {
      state.employeePaidHolidays.push({
        id: seedId(SEED_ID_PREFIX.paidHoliday),
        employeeId: emp.id,
        employeeName: emp.name,
        date: `${month}-15`,
        month,
        notes: "Paid holiday credit",
        createdAt: `${month}-15T10:00:00.000Z`,
      });
    }
  }

  const fieldUsers = DEMO_LOGIN_USERS.filter(
    (u) => u.role === "salesperson" || u.role === "installation_team",
  );
  fieldUsers.forEach((demo, i) => {
    const emp = state.employees[i];
    if (!emp) return;
    state.employees[i] = {
      ...emp,
      name: demo.name,
      email: demo.email,
      initial: demo.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      role: demo.role === "installation_team" ? "Installer" : "Sales Executive",
      status: "Active",
    };
  });

  const instEmpIds = fieldUsers
    .filter((u) => u.role === "installation_team")
    .map((_, i) => {
      const offset = fieldUsers.filter((u) => u.role === "salesperson").length;
      return state.employees[offset + i]?.id;
    })
    .filter((id): id is string => Boolean(id));

  if (instEmpIds.length >= 2) {
    if (state.teams[0]) state.teams[0] = { ...state.teams[0], memberIds: instEmpIds.slice(0, 2) };
    if (state.teams[1] && instEmpIds.length >= 4) {
      state.teams[1] = { ...state.teams[1], memberIds: instEmpIds.slice(2, 4) };
    }
  }

  pushAudit(state, {
    action: "create",
    entityType: "Employee",
    entityId: state.employees[0]?.id ?? "",
    entityName: state.employees[0]?.name ?? "",
    fraction: 0.055,
    role: "admin",
  });

  return state;
}
