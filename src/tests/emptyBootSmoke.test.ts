import { describe, expect, it } from "vitest";
import { buildEmptyAppState, buildSequencedAppSeed } from "@/data/appSeedBuilder";
import { APP_DATA_RESET_EPOCH } from "@/lib/clearAppStorage";

const COLLECTION_KEYS = [
  "customers",
  "projects",
  "quotations",
  "enquiries",
  "vendors",
  "inventoryItems",
  "employees",
  "teams",
  "invoices",
  "expenses",
  "vendorBills",
  "procurementNeedLines",
  "attendanceRecords",
] as const;

describe("emptyBootSmoke", () => {
  it("buildEmptyAppState has zero rows for major collections", () => {
    const s = buildEmptyAppState();
    for (const key of COLLECTION_KEYS) {
      const rows = s[key];
      expect(Array.isArray(rows) ? rows.length : 0, key).toBe(0);
    }
  });

  it("buildSequencedAppSeed has demo rows (explicit loader only)", () => {
    const s = buildSequencedAppSeed();
    expect(s.customers.length).toBeGreaterThan(0);
    expect(s.projects.length).toBeGreaterThan(0);
  });

  it("reset epoch targets empty boot policy", () => {
    expect(APP_DATA_RESET_EPOCH).toContain("empty-boot");
  });
});
