import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  applyDiscomCheckChange,
  findStaleDiscomCheckOrder,
  isDiscomCheckOrderValid,
  normalizeDiscomChecks,
  reconcileProjectTimelineDiscomChecks,
} from "@/lib/progressReportDiscom";

describe("progressReportDiscom (C3 / V3)", () => {
  it("enforces sequential DISCOM checks on apply", () => {
    expect(applyDiscomCheckChange([], "net-metering", true)).toEqual({
      ok: false,
      reason: "Complete previous DISCOM steps first",
    });

    const step1 = applyDiscomCheckChange([], "meter-file-submit", true);
    expect(step1).toEqual({ ok: true, checks: ["meter-file-submit"] });

    const step2 = applyDiscomCheckChange(step1.ok ? step1.checks : [], "net-metering", true);
    expect(step2).toEqual({ ok: true, checks: ["meter-file-submit", "net-metering"] });
  });

  it("unchecking a step clears later steps", () => {
    const checks = ["meter-file-submit", "net-metering", "subsidy-apply-photo"];
    const result = applyDiscomCheckChange(checks, "meter-file-submit", false);
    expect(result).toEqual({ ok: true, checks: [] });
  });

  it("normalizeDiscomChecks drops steps after first gap", () => {
    expect(normalizeDiscomChecks(["net-metering"])).toEqual([]);
    expect(normalizeDiscomChecks(["meter-file-submit", "subsidy-apply-photo"])).toEqual([
      "meter-file-submit",
    ]);
    expect(isDiscomCheckOrderValid(["net-metering"])).toBe(false);
    expect(isDiscomCheckOrderValid(["meter-file-submit", "net-metering"])).toBe(true);
  });

  it("reconcileProjectTimelineDiscomChecks fixes persisted timelines", () => {
    const state = {
      projectTimelineByProjectId: {
        P1: {
          projectId: "P1",
          discomChecks: ["net-metering", "subsidy-apply-photo"],
        },
      },
    } as Parameters<typeof reconcileProjectTimelineDiscomChecks>[0];

    const next = reconcileProjectTimelineDiscomChecks(state);
    expect(next.projectTimelineByProjectId.P1.discomChecks).toEqual([]);
    expect(findStaleDiscomCheckOrder(next.projectTimelineByProjectId)).toEqual([]);
  });

  it("hydrated seed has valid DISCOM check order", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleDiscomCheckOrder(hydrated.projectTimelineByProjectId)).toEqual([]);
  });
});
