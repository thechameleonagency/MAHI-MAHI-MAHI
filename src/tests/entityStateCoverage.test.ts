import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { verifySeedState } from "@/data/seed/seedVerification";
import {
  findInvalidMachineBackedStatuses,
  MACHINE_BACKED_ENTITIES,
  SOFT_STATE_ENTITIES,
  specById,
  stateMachineGuards,
} from "@/lib/entityStateCoverage";
import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";

describe("entityStateCoverage (AR2)", () => {
  it("catalogues machine-backed CRM entities separately from soft finance/ops", () => {
    expect(MACHINE_BACKED_ENTITIES.map((e) => e.id)).toEqual([
      "enquiry",
      "quotation",
      "project_lifecycle",
    ]);
    expect(specById("invoice")?.tier).toBe("soft_state");
    expect(SOFT_STATE_ENTITIES.length).toBeGreaterThanOrEqual(8);
  });

  it("smoke and full seeds use only valid machine-backed status literals", () => {
    for (const profile of ["smoke", "full"] as const) {
      const { state, verification } = buildBusinessSeed(profile);
      const hydrated = applyAppStateHydrationPipeline(state);
      const invalid = findInvalidMachineBackedStatuses(hydrated);
      expect(invalid, JSON.stringify(invalid)).toEqual([]);
      expect(verification.ok, verification.errors.join("; ")).toBe(true);
    }
  });

  it("hydrated seed passes AR2 check inside verifySeedState", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const result = verifySeedState(hydrated, "smoke");
    const ar2 = result.errors.filter((e) => e.startsWith("AR2:"));
    expect(ar2, ar2.join("; ")).toEqual([]);
  });

  it("exports transition guards aligned with state machine modules", () => {
    expect(stateMachineGuards.quotation("draft", "sent")).toBe(true);
    expect(canTransitionQuotationStatus("draft", "sent")).toBe(true);
    expect(stateMachineGuards.quotation("draft", "converted_to_project")).toBe(false);
  });
});
