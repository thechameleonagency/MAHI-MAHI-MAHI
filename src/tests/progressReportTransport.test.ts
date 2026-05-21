import { describe, expect, it } from "vitest";
import {
  countPendingTransportSubItems,
  sumTransportedQtyForStage,
} from "@/lib/progressReportTransport";

describe("progressReportTransport", () => {
  const materials = [
    { itemName: "Solar Panel 550W Mono", quantity: 12 },
    { itemName: "GI Mounting Rail", quantity: 4 },
  ];

  it("sums transported qty by stage keywords", () => {
    expect(sumTransportedQtyForStage("panel", materials)).toBe(12);
    expect(sumTransportedQtyForStage("structure", materials)).toBe(4);
  });

  it("counts pending transport sub-items when nothing issued for stage", () => {
    expect(countPendingTransportSubItems("panel", [])).toBeGreaterThan(0);
    expect(countPendingTransportSubItems("panel", materials)).toBe(0);
  });
});
