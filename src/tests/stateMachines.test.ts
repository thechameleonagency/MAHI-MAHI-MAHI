import { describe, expect, it } from "vitest";
import { canTransitionEnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus } from "@/domain/stateMachines/projectStateMachine";

describe("State machine rules", () => {
  it("allows enquiry new to contacted", () => {
    expect(canTransitionEnquiryStatus("new", "contacted", "salesperson")).toBe(true);
  });

  it("requires admin reason to reopen lost enquiry", () => {
    expect(canTransitionEnquiryStatus("lost", "contacted", "admin")).toBe(false);
    expect(canTransitionEnquiryStatus("lost", "contacted", "admin", "Customer called back")).toBe(true);
  });

  it("supports quotation approved to confirmed only", () => {
    expect(canTransitionQuotationStatus("approved", "confirmed")).toBe(true);
    expect(canTransitionQuotationStatus("draft", "confirmed")).toBe(false);
  });

  it("supports project completed to in progress only with super admin override", () => {
    expect(canTransitionProjectStatus("Completed", "In Progress", "admin", "Rework needed")).toBe(false);
    expect(canTransitionProjectStatus("Completed", "In Progress", "super_admin", "Rework needed")).toBe(true);
  });
});
