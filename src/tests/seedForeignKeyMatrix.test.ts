import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findSeedForeignKeyViolations,
  formatSeedForeignKeyErrors,
} from "@/data/seed/seedForeignKeyMatrix";

describe("seedForeignKeyMatrix (ER8)", () => {
  it("smoke seed has no FK violations after hydration", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);
    const violations = findSeedForeignKeyViolations(hydrated);
    expect(violations, formatSeedForeignKeyErrors(violations).join("; ")).toEqual([]);
  });

  it("full seed verifySeedState includes ER8 matrix (no violations)", () => {
    const { verification } = buildBusinessSeed("full");
    const er8 = verification.errors.filter((e) => e.startsWith("ER8:"));
    expect(er8).toEqual([]);
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });

  it("detects missing project FK on payments", () => {
    const { state } = buildBusinessSeed("smoke");
    const broken = {
      ...state,
      payments: [
        {
          ...state.payments[0],
          id: "PAY-BROKEN",
          projectId: "PROJECT-DOES-NOT-EXIST",
        },
      ],
    };
    const violations = findSeedForeignKeyViolations(broken);
    expect(violations.some((v) => v.entity === "payment" && v.field === "projectId")).toBe(true);
  });
});
