import { describe, expect, it } from "vitest";
import { normalizeEnquiryShape } from "@/lib/enquiryAssignee";
import type { Enquiry } from "@/types/project";

describe("normalizeEnquiryShape", () => {
  it("defaults notes and timestamps for generator rows", () => {
    const raw = {
      id: "ENQ-1",
      date: "2026-05-24T09:59:13.922Z",
      customerName: "Test",
      customerPhone: "999",
      customerEmail: "",
      customerAddress: "",
      customerType: "individual" as const,
      source: "walk-in" as const,
      systemCapacity: "5kW",
      estimatedBudget: 100,
      requirements: "x",
      status: "new" as const,
      priority: "medium" as const,
      assignedTo: "Sales",
    } satisfies Enquiry & { date: string };

    const out = normalizeEnquiryShape(raw);
    expect(out.notes).toEqual([]);
    expect(out.createdAt).toBe("2026-05-24");
    expect(out.updatedAt).toBe("2026-05-24");
    expect((out as { date?: string }).date).toBeUndefined();
  });
});
