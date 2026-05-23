import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { serializeAppState } from "@/lib/appDataStorage";
import { runMigrations } from "@/infrastructure/migrations/migrationManager";

describe("runMigrations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("skips legacy repo-wipe migrations when mahi_solar_app_data exists", () => {
    const state = buildEmptyAppState();
    state.projects.push({
      id: "PRJ-1",
      name: "Test Project",
      client: "Client",
      status: "New",
      lifecycleStatus: "New",
      projectKind: "SOLO_EPC",
      type: "EPC",
      projectType: "Residential",
      capacity: "5 kW",
      location: "Mumbai",
      contractAmount: 100000,
      amountInvoiced: 0,
      amountReceived: 0,
      createdAt: new Date().toISOString(),
      history: [],
      paymentType: "cash",
    } as never);

    localStorage.setItem("mahi_solar_app_data", serializeAppState(state));
    localStorage.setItem("mss.repo.projects", JSON.stringify(state.projects));

    runMigrations();

    expect(localStorage.getItem("mahi_solar_app_data")).toContain("PRJ-1");
    expect(localStorage.getItem("mss.repo.projects")).toContain("PRJ-1");
    expect(localStorage.getItem("mss.schema.version")).toBe("5");
    expect(localStorage.getItem("mss.migration.backup.v3")).toBeNull();
  });

  it("does not throw when migration backup would exceed quota", () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (String(key).startsWith("mss.migration.backup")) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      }
      originalSetItem.call(this, key, value);
    });

    localStorage.setItem("mss.repo.projects", JSON.stringify([{ id: "PRJ-legacy" }]));

    expect(() => runMigrations()).not.toThrow();
    expect(localStorage.getItem("mss.schema.version")).toBe("5");

    setItem.mockRestore();
  });
});
