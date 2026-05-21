import { describe, expect, it } from "vitest";
import {
  allowOperationalWrite,
  isCeoOperationalReadOnlyRole,
} from "@/lib/ceoOperationalReadOnly";
import { canFeature } from "@/domain/policies/featurePermissions";
import { canPerformAction } from "@/domain/policies/permissionMatrix";

describe("ceoOperationalReadOnly (UX2)", () => {
  it("identifies CEO as operational read-only actor", () => {
    expect(isCeoOperationalReadOnlyRole("ceo")).toBe(true);
    expect(isCeoOperationalReadOnlyRole("management")).toBe(false);
    expect(isCeoOperationalReadOnlyRole(undefined)).toBe(false);
  });

  it("allowOperationalWrite blocks CEO even when feature permits", () => {
    expect(allowOperationalWrite(true, true)).toBe(false);
    expect(allowOperationalWrite(false, true)).toBe(true);
    expect(allowOperationalWrite(false, false)).toBe(false);
  });

  it("CEO may approve quotations and create projects from quotes", () => {
    expect(canPerformAction("ceo", "quotation:confirm")).toBe(true);
    expect(canPerformAction("ceo", "project:create_from_quote")).toBe(true);
    expect(canPerformAction("ceo", "enquiry:create")).toBe(false);
    expect(canPerformAction("ceo", "finance:create_invoice")).toBe(false);
  });

  it("CEO has view on pipeline/finance but not create on enquiries or quotations", () => {
    expect(canFeature("ceo", "enquiry", "view")).toBe(true);
    expect(canFeature("ceo", "enquiry", "create")).toBe(false);
    expect(canFeature("ceo", "quotation", "view")).toBe(true);
    expect(canFeature("ceo", "quotation", "create")).toBe(false);
    expect(canFeature("ceo", "quotationApprove", "edit")).toBe(true);
    expect(canFeature("ceo", "invoice", "view")).toBe(true);
    expect(canFeature("ceo", "invoice", "create")).toBe(false);
  });
});
