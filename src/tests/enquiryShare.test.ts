import { describe, expect, it } from "vitest";
import {
  buildEnquiryShareActivityNote,
  buildEnquiryShareMessage,
  formatEnquiryShareMethodLabel,
} from "@/lib/enquiryShare";
import type { Enquiry } from "@/types/project";

const sampleEnquiry = (): Enquiry => ({
  id: "ENQ-100",
  customerName: "Acme Solar",
  customerPhone: "+91 9876543210",
  customerEmail: "lead@acme.test",
  customerAddress: "Jaipur",
  customerType: "company",
  source: "phone",
  systemCapacity: "5 kW",
  estimatedBudget: 250000,
  requirements: "Rooftop install",
  status: "new",
  priority: "medium",
  assignedTo: "Priya Nair",
  createdAt: "2026-05-01",
  updatedAt: "2026-05-01",
  notes: [],
});

describe("enquiryShare (MD10)", () => {
  it("buildEnquiryShareMessage includes core enquiry fields", () => {
    const msg = buildEnquiryShareMessage(sampleEnquiry());
    expect(msg).toContain("ENQ-100");
    expect(msg).toContain("Acme Solar");
    expect(msg).toContain("5 kW");
  });

  it("buildEnquiryShareActivityNote records channel and actor", () => {
    const note = buildEnquiryShareActivityNote(
      { method: "email", contactValue: "lead@acme.test", sentAt: "2026-05-10T12:00:00.000Z" },
      "Admin User",
    );
    expect(note.note).toContain("Email");
    expect(note.note).toContain("lead@acme.test");
    expect(note.updatedBy).toBe("Admin User");
  });

  it("formatEnquiryShareMethodLabel matches quotation labels", () => {
    expect(formatEnquiryShareMethodLabel("whatsapp")).toBe("WhatsApp");
    expect(formatEnquiryShareMethodLabel("email")).toBe("Email");
  });
});
