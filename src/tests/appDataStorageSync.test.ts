import { describe, expect, it, beforeEach } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import {
  APP_DATA_STORAGE_KEY,
  APP_DATA_STORAGE_VERSION_KEY,
  isAppDataStorageSyncKey,
  persistFreshAppStateSeed,
  readPersistedAppState,
  serializeAppState,
} from "@/lib/appDataStorage";
import { APP_DATA_RESET_EPOCH_KEY } from "@/lib/clearAppStorage";
import { isPrototypeRepositoryStorageKey } from "@/infrastructure/repositories/prototypeRepositoryManifest";

describe("appDataStorage cross-tab helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("recognizes sync keys for storage listener", () => {
    expect(isAppDataStorageSyncKey(APP_DATA_STORAGE_KEY)).toBe(true);
    expect(isAppDataStorageSyncKey(APP_DATA_STORAGE_VERSION_KEY)).toBe(true);
    expect(isAppDataStorageSyncKey(APP_DATA_RESET_EPOCH_KEY)).toBe(true);
    expect(isAppDataStorageSyncKey("mss.roleMatrix.v1")).toBe(false);
    expect(isAppDataStorageSyncKey(null)).toBe(false);
    expect(isPrototypeRepositoryStorageKey("mss.repo.quotations")).toBe(true);
    expect(isPrototypeRepositoryStorageKey(APP_DATA_STORAGE_KEY)).toBe(false);
  });

  it("round-trips serialize and readPersistedAppState", () => {
    const seed = buildEmptyAppState();
    seed.customers = [{ id: "CUST-0001", name: "Tab A" } as never];
    persistFreshAppStateSeed(seed);

    const loaded = readPersistedAppState();
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.customers[0]?.name).toBe("Tab A");
  });

  it("readPersistedAppState picks up a later localStorage write (other-tab simulation)", () => {
    persistFreshAppStateSeed(buildEmptyAppState());
    expect(readPersistedAppState().projects).toHaveLength(0);

    const tabAUpdate = buildEmptyAppState();
    tabAUpdate.projects = [{ id: "PRJ-2", name: "From other tab" } as never];
    localStorage.setItem(APP_DATA_STORAGE_KEY, serializeAppState(tabAUpdate));

    const tabBReloaded = readPersistedAppState();
    expect(tabBReloaded.projects).toHaveLength(1);
    expect(tabBReloaded.projects[0]?.name).toBe("From other tab");
  });
});
