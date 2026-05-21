import type { AppState } from "@/contexts/AppDataContext";
import type { AuditLogEntry } from "@/types/finance";
import { resolveProjectCapabilities } from "@/domain/projectTypes/config";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import type { Project } from "@/types/project";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDateAt } from "./seedTimeModel";
import type { SeedProfile } from "./seedLayerOrder";
import { scaleCount } from "./seedLayerOrder";
import { DEMO_LOGIN_USERS, findDemoUserByMemberId } from "@/domain/demoCredentials";
import type { UserRole } from "@/domain/entities/identity";

const ACTORS: Record<UserRole, { id: string; name: string }> = {
  super_admin: { id: "SA-001", name: "Rajesh Kulkarni" },
  admin: { id: "ADM-001", name: "Anita Deshmukh" },
  ceo: { id: "CEO-001", name: "Vikram Menon" },
  management: { id: "MGT-001", name: "Suresh Iyer" },
  salesperson: { id: "SAL-001", name: "Priya Nair" },
  installation_team: { id: "INST-001", name: "Karthik Rao" },
};

export function seedActor(role: UserRole = "admin") {
  return ACTORS[role];
}

export function seedActorByMemberId(memberId: string) {
  const demo = findDemoUserByMemberId(memberId);
  if (demo) return { id: demo.memberId, name: demo.name, role: demo.role };
  return { id: memberId, name: memberId, role: "admin" as UserRole };
}

export function pushAudit(
  state: AppState,
  opts: {
    action: AuditLogEntry["action"];
    entityType: string;
    entityId: string;
    entityName: string;
    fraction: number;
    role?: UserRole;
    memberId?: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
  },
): AuditLogEntry {
  const actor = opts.memberId
    ? seedActorByMemberId(opts.memberId)
    : seedActor(opts.role ?? "admin");
  const entry: AuditLogEntry = {
    id: seedId(SEED_ID_PREFIX.auditLog),
    timestamp: seedDateAt(opts.fraction, { sequence: state.auditLogs.length }),
    userId: actor.id,
    userName: actor.name,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    entityName: opts.entityName,
    field: opts.field,
    oldValue: opts.oldValue,
    newValue: opts.newValue,
  };
  state.auditLogs.push(entry);
  return entry;
}

export function applyLegacyTaxonomy(
  project: Project,
  kind: ProjectKind,
  extras?: Partial<Project>,
): Project {
  const map = LEGACY_KIND_TO_TYPE[kind];
  const caps = resolveProjectCapabilities({
    projectMode: map.projectType,
    vendorshipOwner: map.vendorshipOwner,
    partnerRole: map.partnerRole,
    executionScope: map.executionScope,
    outsource: extras?.outsource ?? null,
  });
  return {
    ...project,
    projectKind: kind,
    projectMode: map.projectType,
    vendorshipOwner: map.vendorshipOwner,
    partnerRole: map.partnerRole,
    executionScope: map.executionScope,
    projectKindConfigSnapshot: projectKindConfigSnapshot(kind),
    ...extras,
  };
}

export function countFor(profile: SeedProfile, full: number): number {
  return scaleCount(profile, full);
}

export function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

export function roundInr(n: number): number {
  return Math.round(n / 100) * 100;
}

/** Solar system capacity strings for quotations/projects. */
export const CAPACITIES_KW = ["3", "5", "7", "10", "15", "20", "25", "50", "100", "120"];

export function contractForCapacity(kw: number, category: "residential" | "commercial" | "industrial"): number {
  const base = category === "residential" ? 52000 : category === "commercial" ? 48000 : 45000;
  return roundInr(kw * base * (1 + (kw > 20 ? 0.05 : 0)));
}
