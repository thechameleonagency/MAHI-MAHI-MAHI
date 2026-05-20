import { describe, expect, it } from "vitest";
import {
  MATERIAL_DAMAGE_NOTES_COST_THRESHOLD_INR,
  MATERIAL_DAMAGE_NOTES_QTY_THRESHOLD,
  materialDamageRequiresReason,
  parsePhotoUrlLines,
  validateMaterialDamageForm,
} from "@/lib/materialDamageValidation";

describe("materialDamageValidation (Mn15)", () => {
  it("requires notes when qty exceeds threshold", () => {
    expect(
      materialDamageRequiresReason({
        qty: MATERIAL_DAMAGE_NOTES_QTY_THRESHOLD + 1,
        notes: "",
      }),
    ).toBe(true);
    const result = validateMaterialDamageForm({
      qty: "6",
      costImpact: "",
      notes: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/reason/i);
  });

  it("requires notes when cost impact exceeds ₹5000", () => {
    const result = validateMaterialDamageForm({
      qty: "1",
      costImpact: String(MATERIAL_DAMAGE_NOTES_COST_THRESHOLD_INR + 1),
      notes: "",
    });
    expect(result.ok).toBe(false);
  });

  it("allows small qty and low cost without notes", () => {
    const result = validateMaterialDamageForm({
      qty: "2",
      costImpact: "1000",
      notes: "",
    });
    expect(result).toEqual({ ok: true, qty: 2, cost: 1000, notes: undefined });
  });

  it("accepts high qty when notes provided", () => {
    const result = validateMaterialDamageForm({
      qty: "10",
      costImpact: "",
      notes: "Damaged during unloading — forklift impact",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.notes).toContain("forklift");
  });

  it("parses photo URL lines", () => {
    expect(parsePhotoUrlLines("https://a.example/x\nhttps://b.example/y, ")).toEqual([
      "https://a.example/x",
      "https://b.example/y",
    ]);
  });
});
