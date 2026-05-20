import { describe, expect, it } from "vitest";
import { isProcurementHandoffOnly } from "@/lib/procurementHandoff";

describe("procurementHandoff (Mn20)", () => {
  it("is true for installation_team without vendor:record_bill", () => {
    expect(isProcurementHandoffOnly("installation_team", false)).toBe(true);
  });

  it("is false when role can record vendor bills", () => {
    expect(isProcurementHandoffOnly("installation_team", true)).toBe(false);
    expect(isProcurementHandoffOnly("management", false)).toBe(false);
    expect(isProcurementHandoffOnly("admin", true)).toBe(false);
  });
});
