import type { AppState } from "@/contexts/AppDataContext";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";
import type { UserRole } from "@/domain/entities/identity";
import { normalizeTeamMemberStatus } from "@/lib/seedSessionBootstrap";

const FIELD_ROLES: UserRole[] = ["salesperson", "installation_team"];

/**
 * Align demo login roster with employee directory + enquiry ownership ids so
 * row-level project scoping works after seed or persisted reload.
 */
export function reconcileProjectActorScopeSeed(state: AppState): AppState {
  const fieldUsers = DEMO_LOGIN_USERS.filter((u) => FIELD_ROLES.includes(u.role));
  if (!fieldUsers.length) return state;

  const employees = [...state.employees];
  fieldUsers.forEach((demo, i) => {
    if (!employees[i]) return;
    const initial = demo.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    employees[i] = {
      ...employees[i],
      name: demo.name,
      email: demo.email,
      initial,
      role: demo.role === "installation_team" ? "Installer" : "Sales Executive",
      status: "Active",
    };
  });

  const instEmpIds = fieldUsers
    .filter((u) => u.role === "installation_team")
    .map((_, i) => {
      const offset = fieldUsers.filter((u) => u.role === "salesperson").length;
      return employees[offset + i]?.id;
    })
    .filter((id): id is string => Boolean(id));

  const teams = state.teams.map((team, index) => {
    if (team.status !== "Active" || instEmpIds.length < 2) return team;
    if (index === 0) {
      return { ...team, memberIds: instEmpIds.slice(0, 2) };
    }
    if (index === 1 && instEmpIds.length >= 4) {
      return { ...team, memberIds: instEmpIds.slice(2, 4) };
    }
    if (index === 2 && instEmpIds.length >= 3) {
      return { ...team, memberIds: [instEmpIds[0], instEmpIds[2]] };
    }
    return team;
  });

  const salesMembers = state.settingsTeamMembers.filter(
    (m) => m.role === "salesperson" && normalizeTeamMemberStatus(m.status) === "Active",
  );
  const memberNameById = new Map(state.settingsTeamMembers.map((m) => [m.id, m.name]));

  const enquiries = state.enquiries.map((enquiry, i) => {
    let assignedTo = enquiry.assignedTo;
    if (assignedTo && memberNameById.has(assignedTo)) {
      return enquiry;
    }
    const legacyName = assignedTo?.trim();
    if (legacyName) {
      const byName = salesMembers.find((m) => m.name === legacyName);
      if (byName) assignedTo = byName.id;
    }
    if (!assignedTo || !memberNameById.has(assignedTo)) {
      assignedTo = salesMembers[i % Math.max(salesMembers.length, 1)]?.id ?? assignedTo;
    }
    return assignedTo === enquiry.assignedTo ? enquiry : { ...enquiry, assignedTo };
  });

  const projects = state.projects.map((project) => {
    if ((project.assignees?.length ?? 0) > 0) return project;
    const assignment = project.teamAssignments?.[0];
    if (!assignment?.teamId) return project;
    const team = teams.find((t) => t.id === assignment.teamId);
    if (!team?.memberIds.length) return project;
    return { ...project, assignees: [...team.memberIds] };
  });

  return { ...state, employees, teams, enquiries, projects };
}
