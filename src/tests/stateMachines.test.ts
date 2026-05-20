import { describe, expect, it } from "vitest";
import { canTransitionEnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus } from "@/domain/stateMachines/projectStateMachine";
import { MIN_ENQUIRY_TERMINAL_REASON_LENGTH } from "@/lib/enquiryReasonValidation";

describe("State machine rules", () => {
  it("allows enquiry new to meeting_scheduled", () => {
    expect(canTransitionEnquiryStatus("new", "meeting_scheduled", "salesperson")).toBe(true);
  });

  it("requires admin reason to reopen lost enquiry (back to new)", () => {
    expect(canTransitionEnquiryStatus("lost", "new", "admin")).toBe(false);
    expect(canTransitionEnquiryStatus("lost", "new", "admin", "too short")).toBe(false);
    const reason = "Customer called back";
    expect(reason.length).toBeGreaterThanOrEqual(MIN_ENQUIRY_TERMINAL_REASON_LENGTH);
    expect(canTransitionEnquiryStatus("lost", "new", "admin", reason)).toBe(true);
  });

  it("allows quotation_sent to quotation_rejected and re-quote path", () => {
    expect(canTransitionEnquiryStatus("quotation_sent", "quotation_rejected", "salesperson")).toBe(
      true,
    );
    expect(canTransitionEnquiryStatus("quotation_rejected", "quotation_sent", "salesperson")).toBe(
      true,
    );
    const lostReason = "No budget left";
    expect(lostReason.length).toBeGreaterThanOrEqual(MIN_ENQUIRY_TERMINAL_REASON_LENGTH);
    expect(
      canTransitionEnquiryStatus("quotation_rejected", "lost", "salesperson", lostReason),
    ).toBe(true);
  });

  it("supports quotation approved to converted_to_project only", () => {
    expect(canTransitionQuotationStatus("approved", "converted_to_project")).toBe(true);
    expect(canTransitionQuotationStatus("draft", "converted_to_project")).toBe(false);
  });

  it("supports project completed to in progress only with super admin override", () => {
    expect(canTransitionProjectStatus("Completed", "In Progress", "admin", "Rework needed")).toBe(false);
    expect(canTransitionProjectStatus("Completed", "In Progress", "super_admin", "Rework needed")).toBe(true);
  });

  it("allows In Progress to On Hold and Completed", () => {
    expect(canTransitionProjectStatus("In Progress", "On Hold", "admin")).toBe(true);
    expect(canTransitionProjectStatus("In Progress", "Completed", "admin")).toBe(true);
  });
});
