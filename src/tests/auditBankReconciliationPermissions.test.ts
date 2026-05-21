import { describe, expect, it } from "vitest";
import { canFeature } from "@/domain/policies/featurePermissions";
import { AUDIT_WRITE_FEATURES } from "@/lib/auditRouteFeatures";

describe("auditBankReconciliation permissions (MN5)", () => {
  it("registers write feature for role matrix", () => {
    expect(AUDIT_WRITE_FEATURES).toContain("auditBankReconciliation");
  });

  it("allows admin/management to upload and apply matches; ceo is view-only", () => {
    expect(canFeature("admin", "auditBankReconciliation", "create")).toBe(true);
    expect(canFeature("management", "auditBankReconciliation", "edit")).toBe(true);
    expect(canFeature("ceo", "auditBankReconciliation", "view")).toBe(true);
    expect(canFeature("ceo", "auditBankReconciliation", "create")).toBe(false);
    expect(canFeature("ceo", "auditBankReconciliation", "edit")).toBe(false);
    expect(canFeature("salesperson", "auditBankReconciliation", "view")).toBe(false);
  });
});
