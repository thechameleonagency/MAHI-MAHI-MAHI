import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROCUREMENT_LEAD_DAYS,
  resolveProcurementNeedByDate,
} from "@/lib/procurementNeedByDate";

describe("resolveProcurementNeedByDate", () => {
  it("uses workStartDate minus lead days when set", () => {
    expect(
      resolveProcurementNeedByDate({ workStartDate: "2026-05-10" }),
    ).toBe("2026-05-09");
  });

  it("falls back to projectStartDate when work start is missing", () => {
    expect(
      resolveProcurementNeedByDate({ projectStartDate: "2026-05-12" }),
    ).toBe("2026-05-11");
  });

  it("prefers workStartDate over projectStartDate", () => {
    expect(
      resolveProcurementNeedByDate({
        workStartDate: "2026-06-01",
        projectStartDate: "2026-05-12",
      }),
    ).toBe("2026-05-31");
  });

  it("uses fallbackDate when no schedule anchor exists", () => {
    expect(
      resolveProcurementNeedByDate({
        fallbackDate: new Date("2026-03-15T12:00:00"),
      }),
    ).toBe("2026-03-15");
  });

  it("exports one-day lead constant", () => {
    expect(DEFAULT_PROCUREMENT_LEAD_DAYS).toBe(1);
  });
});
