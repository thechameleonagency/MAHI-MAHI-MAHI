import { describe, expect, it } from "vitest";
import {
  findPresetForMaterial,
  matchMaterialToPreset,
  namesMatchBySubstring,
} from "@/lib/inventoryPresetMatch";

describe("inventoryPresetMatch", () => {
  it("matches by inventory id without comparing names", () => {
    expect(
      matchMaterialToPreset(
        { id: 42, name: "Solar Panel 540W" },
        { id: 42, name: "Solar Cable" },
      ),
    ).toBe(true);
  });

  it("does not match different SKUs on first word only", () => {
    expect(
      matchMaterialToPreset(
        { id: 1, name: "Solar Panel 540W" },
        { id: 2, name: "Solar Cable" },
      ),
    ).toBe(false);
  });

  it("allows name fallback when shared substring is at least 6 characters", () => {
    expect(namesMatchBySubstring("MC4 Connector Pair", "MC4 Connector")).toBe(true);
    expect(namesMatchBySubstring("Solar Panel 540W Mono", "Panel 540W Mono")).toBe(true);
  });

  it("rejects short shared tokens like a single word prefix", () => {
    expect(namesMatchBySubstring("Solar Panel", "Solar Cable")).toBe(false);
  });

  it("findPresetForMaterial prefers id match over ambiguous names", () => {
    const preset = findPresetForMaterial(
      { id: 10, name: "Growatt 5kW Inverter" },
      [
        { id: 10, name: "Wrong label" },
        { id: 11, name: "Growatt 5kW Inverter Extra" },
      ],
    );
    expect(preset?.id).toBe(10);
  });
});
