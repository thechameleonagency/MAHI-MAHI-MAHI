import { auditFieldDiff } from "@/lib/auditFieldDiff";
import type { AuditLogEntry } from "@/types/finance";
import type { ActorContext } from "@/domain/entities/identity";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";

type AuditPayload = {
  action: AuditLogEntry["action"];
  entityType: string;
  entityId: string;
  entityName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
};

export class AuditService {
  constructor(private readonly repositories: Pick<AppRepositoryContext, "auditRepository">) {}

  write(actor: ActorContext, payload: AuditPayload): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      timestamp: new Date().toISOString(),
      userId: actor.actorUserId,
      userName: actor.actorUserId,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityName: payload.entityName,
      field: payload.field,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
    };

    this.repositories.auditRepository.add(entry);
    return entry;
  }

  /** One audit row per changed scalar field in `updates` (old → new values). */
  writeFieldDiff(
    actor: ActorContext,
    entityType: string,
    entityId: string,
    entityName: string,
    oldRow: Record<string, unknown>,
    updates: Record<string, unknown>,
  ): AuditLogEntry[] {
    return auditFieldDiff(
      (action, et, eid, ename, field, oldValue, newValue) =>
        this.write(actor, {
          action,
          entityType: et,
          entityId: eid,
          entityName: ename,
          field,
          oldValue,
          newValue,
        }),
      entityType,
      entityId,
      entityName,
      oldRow,
      updates,
    );
  }
}
