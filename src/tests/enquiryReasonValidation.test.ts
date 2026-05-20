import { describe, expect, it } from "vitest";
import { canTransitionEnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import {
  enquiryTerminalReasonRequiredMessage,
  enquiryTransitionRequiresTerminalReason,
  isEnquiryTerminalReasonValid,
  MIN_ENQUIRY_TERMINAL_REASON_LENGTH,
  trimEnquiryReason,
} from "@/lib/enquiryReasonValidation";

describe("enquiryReasonValidation", () => {
  it("requires at least MIN_ENQUIRY_TERMINAL_REASON_LENGTH trimmed characters", () => {
    const short = "a".repeat(MIN_ENQUIRY_TERMINAL_REASON_LENGTH - 1);
    const ok = "a".repeat(MIN_ENQUIRY_TERMINAL_REASON_LENGTH);
    expect(isEnquiryTerminalReasonValid(short)).toBe(false);
    expect(isEnquiryTerminalReasonValid(ok)).toBe(true);
    expect(isEnquiryTerminalReasonValid(`  ${ok}  `)).toBe(true);
    expect(trimEnquiryReason(`  ${ok}  `)).toBe(ok);
  });

  it("message includes the minimum length", () => {
    expect(enquiryTerminalReasonRequiredMessage()).toContain(
      String(MIN_ENQUIRY_TERMINAL_REASON_LENGTH),
    );
  });

  it("flags terminal/reopen transitions that need a reason", () => {
    expect(enquiryTransitionRequiresTerminalReason("lost", "new")).toBe(true);
    expect(enquiryTransitionRequiresTerminalReason("quotation_sent", "lost")).toBe(true);
    expect(enquiryTransitionRequiresTerminalReason("quotation_rejected", "lost")).toBe(true);
    expect(enquiryTransitionRequiresTerminalReason("new", "lost")).toBe(false);
    expect(enquiryTransitionRequiresTerminalReason("meeting_scheduled", "lost")).toBe(false);
  });
});

describe("enquiry state machine terminal/reopen reasons", () => {
  const validReason = "a".repeat(MIN_ENQUIRY_TERMINAL_REASON_LENGTH);

  it("rejects reopen with too-short reason", () => {
    expect(canTransitionEnquiryStatus("lost", "new", "admin", "short")).toBe(false);
    expect(canTransitionEnquiryStatus("lost", "new", "admin", validReason)).toBe(true);
  });

  it("rejects mark-lost after quotation with too-short reason", () => {
    expect(canTransitionEnquiryStatus("quotation_sent", "lost", "salesperson", "No budget")).toBe(
      false,
    );
    expect(
      canTransitionEnquiryStatus("quotation_rejected", "lost", "salesperson", validReason),
    ).toBe(true);
  });

  it("still allows early-pipeline mark lost without a reason", () => {
    expect(canTransitionEnquiryStatus("new", "lost", "salesperson")).toBe(true);
    expect(canTransitionEnquiryStatus("meeting_scheduled", "lost", "salesperson")).toBe(true);
  });
});
