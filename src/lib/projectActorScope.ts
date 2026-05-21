import type { UserRole } from "@/domain/entities/identity";
import type { ScheduledInstallation } from "@/types/operations";
import type {
  Employee,
  Enquiry,
  Project,
  Quotation,
  SettingsTeamMember,
  Team,
} from "@/types/project";

/** Roles that see the full project portfolio (no row-level filter). */
export const ROLES_WITH_FULL_PROJECT_ACCESS: UserRole[] = [
  "super_admin",
  "admin",
  "ceo",
  "management",
];

export type ProjectActorScopeContext = {
  role: UserRole;
  actorMemberId: string;
  actorDisplayName?: string;
  quotations: Quotation[];
  enquiries: Enquiry[];
  teams: Team[];
  employees: Employee[];
  settingsTeamMembers?: SettingsTeamMember[];
  scheduledInstallations?: ScheduledInstallation[];
};

export function roleHasFullProjectAccess(role: UserRole): boolean {
  return ROLES_WITH_FULL_PROJECT_ACCESS.includes(role);
}

/** Resolve the HR employee row for the logged-in settings team member (email, then name). */
export function resolveActorEmployeeId(
  actorMemberId: string,
  employees: Employee[],
  settingsTeamMembers?: SettingsTeamMember[],
): string | undefined {
  const memberId = actorMemberId?.trim();
  if (!memberId) return undefined;

  const member = settingsTeamMembers?.find((m) => m.id === memberId);
  if (member?.email) {
    const byEmail = employees.find(
      (e) => e.email?.trim().toLowerCase() === member.email.trim().toLowerCase(),
    );
    if (byEmail) return String(byEmail.id);
  }
  if (member?.name) {
    const byName = employees.find((e) => e.name === member.name);
    if (byName) return String(byName.id);
  }
  return undefined;
}

/** Installation crew = self + everyone on the same active team roster. */
export function resolveActorCrewEmployeeIds(
  actorEmployeeId: string | undefined,
  teams: Team[],
): string[] {
  if (!actorEmployeeId) return [];
  const activeTeams = teams.filter((t) => t.status === "Active");
  const crewTeam = activeTeams.find((t) => t.memberIds.includes(actorEmployeeId));
  if (!crewTeam) return [actorEmployeeId];
  return crewTeam.memberIds.filter(Boolean);
}

function enquiryOwnedByActor(
  enquiry: Enquiry | undefined,
  actorMemberId: string,
  actorDisplayName?: string,
): boolean {
  if (!enquiry) return false;
  const memberId = enquiry.assignedToMemberId?.trim();
  if (memberId) {
    return memberId === actorMemberId;
  }
  const assigned = enquiry.assignedTo?.trim();
  if (!assigned) return false;
  if (assigned === actorMemberId) return true;
  if (actorDisplayName && assigned === actorDisplayName) return true;
  return false;
}

function resolveQuotationForProject(
  project: Project,
  quotations: Quotation[],
): Quotation | undefined {
  if (project.quotationId) {
    const direct = quotations.find((q) => q.id === project.quotationId);
    if (direct) return direct;
  }
  return quotations.find(
    (q) => q.linkedProjectId === project.id || q.convertedToProjectId === project.id,
  );
}

function resolveEnquiryForProject(
  project: Project,
  quotation: Quotation | undefined,
  enquiries: Enquiry[],
): Enquiry | undefined {
  if (quotation?.enquiryId) {
    return enquiries.find((e) => e.id === quotation.enquiryId);
  }
  return enquiries.find((e) => e.quotationId === quotation?.id);
}

export function isProjectVisibleToSalesperson(
  project: Project,
  ctx: Pick<ProjectActorScopeContext, "actorMemberId" | "actorDisplayName" | "quotations" | "enquiries">,
): boolean {
  const quotation = resolveQuotationForProject(project, ctx.quotations);
  const enquiry = resolveEnquiryForProject(project, quotation, ctx.enquiries);
  return enquiryOwnedByActor(enquiry, ctx.actorMemberId, ctx.actorDisplayName);
}

export function isProjectVisibleToInstallationTeam(
  project: Project,
  ctx: Pick<
    ProjectActorScopeContext,
    | "actorMemberId"
    | "employees"
    | "settingsTeamMembers"
    | "teams"
    | "scheduledInstallations"
  >,
): boolean {
  const actorEmployeeId = resolveActorEmployeeId(
    ctx.actorMemberId,
    ctx.employees,
    ctx.settingsTeamMembers,
  );
  const crewIds = resolveActorCrewEmployeeIds(actorEmployeeId, ctx.teams);
  if (crewIds.length === 0) return false;

  if (project.assignees?.some((id) => crewIds.includes(id))) return true;

  const teamIds = new Set((project.teamAssignments ?? []).map((a) => a.teamId).filter(Boolean));
  for (const teamId of teamIds) {
    const team = ctx.teams.find((t) => t.id === teamId);
    if (team?.memberIds.some((id) => crewIds.includes(id))) return true;
  }

  for (const sched of ctx.scheduledInstallations ?? []) {
    if (sched.projectId !== project.id) continue;
    if (sched.employeeIds?.some((id) => crewIds.includes(id))) return true;
  }

  return false;
}

export function isProjectVisibleToActor(project: Project, ctx: ProjectActorScopeContext): boolean {
  if (roleHasFullProjectAccess(ctx.role)) return true;
  if (!ctx.actorMemberId?.trim()) return false;

  if (ctx.role === "salesperson") {
    return isProjectVisibleToSalesperson(project, ctx);
  }
  if (ctx.role === "installation_team") {
    return isProjectVisibleToInstallationTeam(project, ctx);
  }
  return true;
}

export function filterProjectsForActor(
  projects: Project[],
  ctx: ProjectActorScopeContext,
): Project[] {
  return projects.filter((p) => isProjectVisibleToActor(p, ctx));
}

export function buildProjectActorScopeContext(input: {
  role: UserRole;
  actorMemberId: string;
  actorDisplayName?: string;
  quotations: Quotation[];
  enquiries: Enquiry[];
  teams: Team[];
  employees: Employee[];
  settingsTeamMembers?: SettingsTeamMember[];
  scheduledInstallations?: ScheduledInstallation[];
}): ProjectActorScopeContext {
  return {
    role: input.role,
    actorMemberId: input.actorMemberId,
    actorDisplayName: input.actorDisplayName,
    quotations: input.quotations,
    enquiries: input.enquiries,
    teams: input.teams,
    employees: input.employees,
    settingsTeamMembers: input.settingsTeamMembers,
    scheduledInstallations: input.scheduledInstallations,
  };
}
