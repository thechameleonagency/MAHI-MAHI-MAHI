import { describe, expect, it } from "vitest";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import {
  reconcileAuditLogUserNames,
  resolveAuditActorUserName,
  resolveAuditLogDisplayName,
} from "@/lib/resolveAuditActorUserName";
import type { AuditLogEntry } from "@/types/finance";

describe("M7 — audit actor display names", () => {
  it("resolveAuditActorUserName prefers actorDisplayName then team roster", () => {
    expect(
      resolveAuditActorUserName({
        actor: { actorUserId: "SAL-001", actorRole: "salesperson", actorDisplayName: "Priya Nair" },
      }),
    ).toBe("Priya Nair");

    expect(
      resolveAuditActorUserName({
        actor: { actorUserId: "CEO-001", actorRole: "ceo" },
        settingsTeamMembers: [{ id: "CEO-001", name: "Vikram Menon" }],
      }),
    ).toBe("Vikram Menon");

    expect(
      resolveAuditActorUserName({
        actor: { actorUserId: "admin", actorRole: "admin" },
      }),
    ).toBe("Admin");
  });

  it("AuditService.write stores resolved userName, not raw user id", () => {
    const repo = new LocalStorageJsonRepository<AuditLogEntry>("mss.test.audit.names", []);
    const audit = new AuditService({ auditRepository: repo });
    audit.write(
      { actorUserId: "MGT-001", actorRole: "management", actorDisplayName: "Suresh Iyer" },
      { action: "create", entityType: "Enquiry", entityId: "E1", entityName: "Acme" },
    );
    const row = repo.getAll()[0];
    expect(row.userId).toBe("MGT-001");
    expect(row.userName).toBe("Suresh Iyer");
    expect(row.userName).not.toBe(row.userId);
  });

  it("reconcileAuditLogUserNames backfills id-only legacy rows", () => {
    const logs: AuditLogEntry[] = [
      {
        id: "LOG-1",
        timestamp: "2026-05-01T00:00:00.000Z",
        userId: "ADM-001",
        userName: "ADM-001",
        action: "update",
        entityType: "Quotation",
        entityId: "Q1",
        entityName: "Q-100",
      },
    ];
    const fixed = reconcileAuditLogUserNames(logs, [{ id: "ADM-001", name: "Anita Deshmukh" }]);
    expect(fixed[0].userName).toBe("Anita Deshmukh");
    expect(resolveAuditLogDisplayName(fixed[0], [])).toBe("Anita Deshmukh");
  });
});
