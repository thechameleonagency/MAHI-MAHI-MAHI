import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ScheduleInstallationSheet (Mn17)", () => {
  it("requires double-booking reason textarea when conflicts exist", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/projects/ScheduleInstallationSheet.tsx"),
      "utf8",
    );
    expect(source).toContain("findScheduledInstallationConflicts");
    expect(source).toContain("validateDoubleBookingOverride");
    expect(source).toContain("Reason for double-booking");
    expect(source).toContain("doubleBookingOverrideReason");
    expect(source).not.toMatch(/this is just a heads-up/i);
  });
});
