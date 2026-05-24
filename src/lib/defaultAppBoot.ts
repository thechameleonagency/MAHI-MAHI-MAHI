import type { AppState } from "@/contexts/AppDataContext";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { persistMastersData } from "@/data/mastersSync";
import { bootstrapSessionAfterSeed } from "@/lib/seedSessionBootstrap";
import { clearAllAppStorage } from "@/lib/clearAppStorage";
import { persistFreshAppStateSeed } from "@/lib/appDataStorage";
import { markAutoSeedPending } from "@/lib/data-engine/autoSeedStorage";

/** Tracks whether the user chose an empty workspace vs default business seed. */
export const WORKSPACE_MODE_KEY = "mahi_solar_workspace_mode";

export type WorkspaceMode = "business" | "empty";

export function getWorkspaceMode(): WorkspaceMode | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_MODE_KEY);
    if (raw === "business" || raw === "empty") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function setWorkspaceMode(mode: WorkspaceMode): void {
  try {
    localStorage.setItem(WORKSPACE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** True when persisted snapshot has no core business rows (legacy empty boot). */
export function isEmptyWorkspaceState(state: AppState): boolean {
  return (
    state.projects.length === 0 &&
    state.customers.length === 0 &&
    state.enquiries.length === 0 &&
    state.quotations.length === 0
  );
}

/** Build empty state in memory. (No longer building business seed) */
export function materializeDefaultBusinessBoot(): AppState {
  return buildEmptyAppState();
}

/**
 * Default opening state: empty shell; Autonomous Data Engine fills data in the background.
 * Used on first visit, localStorage clear, and legacy empty upgrades.
 */
export function persistDefaultBusinessBoot(): AppState {
  clearAllAppStorage();
  const state = materializeDefaultBusinessBoot();
  setWorkspaceMode("business");
  persistFreshAppStateSeed(state);
  persistMastersData();
  bootstrapSessionAfterSeed(state);
  if (import.meta.env.DEV) {
    console.info(
      `[MSS] Default boot — clean seed booted.`,
    );
  }
  return state;
}

/** Explicit empty workspace (Settings reset). */
export function persistEmptyWorkspaceBoot(): AppState {
  clearAllAppStorage();
  const empty = buildEmptyAppState();
  setWorkspaceMode("empty");
  persistFreshAppStateSeed(empty);
  if (import.meta.env.DEV) {
    console.info("[MSS] Empty workspace boot (masters only).");
  }
  return empty;
}

/**
 * Wipe data and reload into business mode with auto-generation pending (Data Engine clear & regenerate).
 */
export function persistRegenerateBusinessBoot(): AppState {
  clearAllAppStorage();
  const state = materializeDefaultBusinessBoot();
  setWorkspaceMode("business");
  persistFreshAppStateSeed(state);
  persistMastersData();
  bootstrapSessionAfterSeed(state);
  markAutoSeedPending();
  return state;
}
