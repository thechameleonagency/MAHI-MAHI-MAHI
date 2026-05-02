import { describe, expect, it } from "vitest";
import { ProjectKindService } from "@/application/services/ProjectKindService";
import type { ProjectKind } from "@/domain/projectTypes/types";

describe("ProjectKindService", () => {
  const svc = new ProjectKindService();

  it("returns undefined for unknown kind without throwing", () => {
    expect(svc.getConfig("NOT_A_KIND" as unknown as ProjectKind)).toBeUndefined();
  });

  it("validateIntake returns errors for unknown kind", () => {
    const r = svc.validateIntake({
      kind: "NOT_A_KIND" as unknown as ProjectKind,
      parties: { customer: "A" },
      commercial: { contractAmount: 1, paymentType: "cash" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Unknown project kind/i);
  });

  it("validateIntake returns errors when required party missing for SOLO_EPC", () => {
    const r = svc.validateIntake({
      kind: "SOLO_EPC",
      parties: { customer: "X" },
      commercial: { contractAmount: 1, paymentType: "cash", internalCostEstimate: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/vendorOrDiscom|Missing required party/i);
  });
});
