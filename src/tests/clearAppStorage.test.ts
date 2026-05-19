import { beforeEach, describe, expect, it } from "vitest";
import {
  APP_DATA_RESET_EPOCH,
  APP_DATA_RESET_EPOCH_KEY,
  clearAllAppStorage,
} from "@/lib/clearAppStorage";

describe("clearAllAppStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes mahi_solar, mss.*, and masters_data keys", () => {
    localStorage.setItem("mahi_solar_app_data", "{}");
    localStorage.setItem("mahi_solar_app_data_version", "6");
    localStorage.setItem("mss.roleMatrix.v1", "{}");
    localStorage.setItem("mss.draft.quotation", "{}");
    localStorage.setItem("mss.repo.projects", "[]");
    localStorage.setItem("masters_data", "{}");
    localStorage.setItem("mms-nav-pins", "[]");
    localStorage.setItem("mss.schema.version", "1");
    localStorage.setItem("unrelated_app", "keep");

    const removed = clearAllAppStorage();
    expect(removed.length).toBeGreaterThanOrEqual(7);
    expect(localStorage.getItem("mahi_solar_app_data")).toBeNull();
    expect(localStorage.getItem("masters_data")).toBeNull();
    expect(localStorage.getItem("unrelated_app")).toBe("keep");
  });

  it("reset epoch key is defined for boot wipe", () => {
    expect(APP_DATA_RESET_EPOCH_KEY).toBe("mahi_solar_app_reset_epoch");
    expect(APP_DATA_RESET_EPOCH.length).toBeGreaterThan(0);
  });
});
