import { describe, expect, it } from "vitest";
import { canTransitionEnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus } from "@/domain/stateMachines/projectStateMachine";

describe("State machine rules", () => {
  it("allows enquiry new to meeting_scheduled", () => {
    expect(canTransitionEnquiryStatus("new", "meeting_scheduled", "salesperson")).toBe(true);
  });

  it("requires admin reason to reopen lost enquiry (back to new)", () => {
    expect(canTransitionEnquiryStatus("lost", "new", "admin")).toBe(false);
    expect(canTransitionEnquiryStatus("lost", "new", "admin", "Customer called back")).toBe(true);
  });

  it("allows quotation_sent to quotation_rejected and re-quote path", () => {
    expect(canTransitionEnquiryStatus("quotation_sent", "quotation_rejected", "salesperson")).toBe(
      true,
    );
    expect(canTransitionEnquiryStatus("quotation_rejected", "quotation_sent", "salesperson")).toBe(
      true,
    );
    expect(
      canTransitionEnquiryStatus("quotation_rejected", "lost", "salesperson", "No budget"),
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

  it("maps Active lifecycle to In Progress transitions without throwing", () => {
    expect(canTransitionProjectStatus("Active", "On Hold", "admin")).toBe(true);
    expect(canTransitionProjectStatus("Active", "Completed", "admin")).toBe(true);
  });
});
