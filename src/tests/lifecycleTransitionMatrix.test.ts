import { describe, expect, it } from "vitest";
import {
  canTransitionProjectStatus,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";
import {
  canTransitionQuotationStatus,
  type QuotationStatus,
} from "@/domain/stateMachines/quotationStateMachine";

const PROJECT_LEGAL: Array<[ProjectLifecycleStatus, ProjectLifecycleStatus]> = [
  ["New", "In Progress"],
  ["New", "On Hold"],
  ["In Progress", "On Hold"],
  ["In Progress", "Completed"],
  ["On Hold", "In Progress"],
  ["Completed", "Closed"],
];

const PROJECT_ILLEGAL: Array<[ProjectLifecycleStatus, ProjectLifecycleStatus]> = [
  ["New", "Completed"],
  ["New", "Closed"],
  ["In Progress", "New"],
  ["Closed", "New"],
  ["Completed", "In Progress"],
];

const QUOTATION_LEGAL: Array<[QuotationStatus, QuotationStatus]> = [
  ["draft", "sent"],
  ["draft", "rejected"],
  ["draft", "withdrawn"],
  ["sent", "approved"],
  ["sent", "rejected"],
  ["sent", "withdrawn"],
  ["sent", "draft"],
  ["approved", "converted_to_project"],
  ["approved", "rejected"],
  ["approved", "withdrawn"],
];

const QUOTATION_ILLEGAL: Array<[QuotationStatus, QuotationStatus]> = [
  ["draft", "converted_to_project"],
  ["draft", "approved"],
  ["rejected", "draft"],
  ["withdrawn", "sent"],
  ["converted_to_project", "draft"],
];

describe("lifecycle transition matrix", () => {
  describe.each(PROJECT_LEGAL)("project legal %s → %s", (from, to) => {
    it("is allowed for admin", () => {
      expect(canTransitionProjectStatus(from, to, "admin")).toBe(true);
    });
  });

  describe.each(PROJECT_ILLEGAL)("project illegal %s → %s", (from, to) => {
    it("is denied without override", () => {
      expect(canTransitionProjectStatus(from, to, "admin")).toBe(false);
    });
  });

  it("allows super_admin reopen from Completed with reason", () => {
    expect(canTransitionProjectStatus("Completed", "In Progress", "super_admin", "Rework")).toBe(true);
  });

  describe.each(QUOTATION_LEGAL)("quotation legal %s → %s", (from, to) => {
    it("is allowed", () => {
      expect(canTransitionQuotationStatus(from, to)).toBe(true);
    });
  });

  describe.each(QUOTATION_ILLEGAL)("quotation illegal %s → %s", (from, to) => {
    it("is denied", () => {
      expect(canTransitionQuotationStatus(from, to)).toBe(false);
    });
  });
});
