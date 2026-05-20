import { describe, expect, it } from "vitest";
import { auditFieldDiff } from "@/lib/auditFieldDiff";
import type { AuditLogEntry } from "@/types/finance";

describe("auditFieldDiff", () => {
  it("emits one row per changed field with serialized values", () => {
    const rows: AuditLogEntry[] = [];
    auditFieldDiff(
      (action, entityType, entityId, entityName, field, oldValue, newValue) => {
        rows.push({
          id: "1",
          timestamp: "t",
          userId: "u",
          userName: "u",
          action,
          entityType,
          entityId,
          entityName,
          field,
          oldValue,
          newValue,
        });
        return rows[rows.length - 1];
      },
      "Quotation",
      "Q1",
      "Q-001",
      { notes: "a", totalAmount: 10 },
      { notes: "b", totalAmount: 10 },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ field: "notes", oldValue: "a", newValue: "b" });
  });

  it("skips unchanged keys in updates", () => {
    const rows: AuditLogEntry[] = [];
    auditFieldDiff(
      (action, et, eid, en, field, oldValue, newValue) => {
        rows.push({
          id: "1",
          timestamp: "t",
          userId: "u",
          userName: "u",
          action,
          entityType: et,
          entityId: eid,
          entityName: en,
          field,
          oldValue,
          newValue,
        });
        return rows[rows.length - 1];
      },
      "Quotation",
      "Q1",
      "Q-001",
      { status: "draft" },
      { status: "draft", notes: "new" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].field).toBe("notes");
  });
});
