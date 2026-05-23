import { describe, expect, it, beforeEach } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { readPersistedAppState } from "@/lib/appDataStorage";
import { persistDefaultBusinessBoot } from "@/lib/defaultAppBoot";

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
  beforeEach(() => {
    localStorage.clear();
  });
  it("buildEmptyAppState has zero rows for major collections", () => {
    const s = buildEmptyAppState();
    for (const key of COLLECTION_KEYS) {
      const rows = s[key];
      expect(Array.isArray(rows) ? rows.length : 0, key).toBe(0);
    }
  });

  it("persists user data across reload without epoch wipe", () => {
    const seeded = persistDefaultBusinessBoot();
    const firstCount = seeded.projects.length;
    localStorage.setItem("mahi_solar_app_reset_epoch", "stale-epoch-value");
    const reloaded = readPersistedAppState({ persistOnBootstrap: true });
    expect(reloaded.projects.length).toBe(firstCount);
  });
});
