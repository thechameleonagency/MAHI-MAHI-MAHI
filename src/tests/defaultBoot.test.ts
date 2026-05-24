import { describe, expect, it, beforeEach } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import {
  getWorkspaceMode,
  isEmptyWorkspaceState,
  persistDefaultBusinessBoot,
  persistEmptyWorkspaceBoot,
  WORKSPACE_MODE_KEY,
} from "@/lib/defaultAppBoot";
import { readPersistedAppState } from "@/lib/appDataStorage";
import { APP_DATA_RESET_EPOCH_KEY } from "@/lib/clearAppStorage";

describe("defaultAppBoot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isEmptyWorkspaceState detects empty boot", () => {
    expect(isEmptyWorkspaceState(buildEmptyAppState())).toBe(true);
    expect(isEmptyWorkspaceState(persistDefaultBusinessBoot())).toBe(true);
  });

  it("readPersistedAppState bootstrap persists empty shell in business mode (auto-seed fills later)", () => {
    const state = readPersistedAppState({ persistOnBootstrap: true });
    expect(getWorkspaceMode()).toBe("business");
    expect(state.projects.length).toBe(0);
    expect(state.customers.length).toBe(0);
    expect(localStorage.getItem(APP_DATA_RESET_EPOCH_KEY)).toBeTruthy();
  });

  it("empty workspace mode stays empty after reload simulation", () => {
    persistEmptyWorkspaceBoot();
    expect(getWorkspaceMode()).toBe("empty");
    const state = readPersistedAppState({ persistOnBootstrap: true });
    expect(state.projects.length).toBe(0);
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe("empty");
  });

  it("cleared localStorage re-boots empty business shell on bootstrap", () => {
    persistEmptyWorkspaceBoot();
    localStorage.clear();
    const state = readPersistedAppState({ persistOnBootstrap: true });
    expect(getWorkspaceMode()).toBe("business");
    expect(state.projects.length).toBe(0);
  });
});
