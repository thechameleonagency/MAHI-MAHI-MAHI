import type { AuditLogEntry } from "@/types/finance";

/** Emit one audit row per changed scalar field (prototype diff trail). */
export function auditFieldDiff(
  create: (
    action: AuditLogEntry["action"],
    entityType: string,
    entityId: string,
    entityName: string,
    field?: string,
    oldValue?: string,
    newValue?: string,
  ) => AuditLogEntry,
  entityType: string,
  entityId: string,
  entityName: string,
  oldRow: Record<string, unknown>,
  updates: Record<string, unknown>,
): AuditLogEntry[] {
  const out: AuditLogEntry[] = [];
  for (const [key, next] of Object.entries(updates)) {
    if (next === undefined) continue;
    const prev = oldRow[key];
    const a = prev === undefined || prev === null ? "" : typeof prev === "object" ? JSON.stringify(prev) : String(prev);
    const b = next === undefined || next === null ? "" : typeof next === "object" ? JSON.stringify(next) : String(next);
    if (a === b) continue;
    out.push(create("update", entityType, entityId, entityName, key, a, b));
  }
  return out;
}
