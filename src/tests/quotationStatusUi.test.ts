import { describe, expect, it } from "vitest";
import {
  formatQuotationStatusLabel,
  isQuotationFormLocked,
  quotationStatusBadgeClass,
} from "@/lib/quotationStatusUi";
import type { QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";

describe("quotationStatusUi", () => {
  it("locks terminal and post-approval statuses for form edit", () => {
    const locked: QuotationStatus[] = ["approved", "converted_to_project", "rejected", "withdrawn"];
    for (const s of locked) {
      expect(isQuotationFormLocked(s)).toBe(true);
    }
    expect(isQuotationFormLocked("draft")).toBe(false);
    expect(isQuotationFormLocked("sent")).toBe(false);
  });

  it("formats withdrawn and other machine statuses", () => {
    expect(formatQuotationStatusLabel("withdrawn")).toBe("Withdrawn");
    expect(formatQuotationStatusLabel("converted_to_project")).toBe("Converted to project");
    expect(quotationStatusBadgeClass("withdrawn")).toContain("zinc");
  });
});
