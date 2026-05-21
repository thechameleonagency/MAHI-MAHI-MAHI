import { describe, expect, it } from "vitest";
import {
  isApplicableMaterialDelta,
  parseMaterialDeltaFromLines,
} from "@/lib/changeRequestMaterialDelta";

describe("changeRequestMaterialDelta", () => {
  it("keeps rows with non-numeric inventory ids and positive qty", () => {
    const parsed = parseMaterialDeltaFromLines([
      { itemId: "INV-PANEL-540", deltaQty: "3" },
      { itemId: "MAT-AC-CABLE", deltaQty: "2.5" },
    ]);
    expect(parsed).toEqual([
      { itemId: "INV-PANEL-540", deltaQty: 3 },
      { itemId: "MAT-AC-CABLE", deltaQty: 2.5 },
    ]);
  });

  it("drops empty item ids and zero quantities; keeps negative qty for scope reduction", () => {
    const parsed = parseMaterialDeltaFromLines([
      { itemId: "", deltaQty: "5" },
      { itemId: "INV-1", deltaQty: "0" },
      { itemId: "   ", deltaQty: "1" },
      { itemId: "INV-PANEL", deltaQty: "-2" },
    ]);
    expect(parsed).toEqual([{ itemId: "INV-PANEL", deltaQty: -2 }]);
  });

  it("does not treat legacy numeric-only filter semantics as valid guard", () => {
    expect(isApplicableMaterialDelta({ itemId: "INV-99", deltaQty: 1 })).toBe(true);
    expect(isApplicableMaterialDelta({ itemId: "", deltaQty: 1 })).toBe(false);
    // String "0" id is invalid; numeric coercion `> 0` wrongly dropped real string ids before fix.
    expect(parseMaterialDeltaFromLines([{ itemId: "0", deltaQty: "1" }])).toEqual([
      { itemId: "0", deltaQty: 1 },
    ]);
  });
});
