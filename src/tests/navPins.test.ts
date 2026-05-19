import { beforeEach, describe, expect, it } from "vitest";
import {
  NAV_PINS_STORAGE_KEY,
  prunePinnedPathsForRole,
  readPinnedPaths,
  writePinnedPaths,
} from "@/lib/navPins";

describe("navPins", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prunePinnedPathsForRole removes denied paths and persists", () => {
    writePinnedPaths(["/finance", "/audit", "/enquiries"]);
    const removed = prunePinnedPathsForRole((path) => path !== "/audit");
    expect(removed).toEqual(["/audit"]);
    expect(readPinnedPaths()).toEqual(["/finance", "/enquiries"]);
    expect(localStorage.getItem(NAV_PINS_STORAGE_KEY)).toContain("/finance");
  });

  it("prunePinnedPathsForRole is a no-op when all pins are allowed", () => {
    writePinnedPaths(["/enquiries"]);
    const removed = prunePinnedPathsForRole(() => true);
    expect(removed).toEqual([]);
    expect(readPinnedPaths()).toEqual(["/enquiries"]);
  });
});
