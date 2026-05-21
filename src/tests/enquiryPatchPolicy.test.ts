import { describe, expect, it } from "vitest";
import { sanitizeEnquiryPatch } from "@/lib/enquiryPatchPolicy";

describe("sanitizeEnquiryPatch", () => {
  it("blocks status and customerId from generic patch", () => {
    const r = sanitizeEnquiryPatch({ status: "lost", priority: "high" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("status");
  });

  it("allows field edits", () => {
    const r = sanitizeEnquiryPatch({ assignedTo: "SAL-001", priority: "high" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.assignedTo).toBe("SAL-001");
  });
});
