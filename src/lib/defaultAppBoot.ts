import type { AppState } from "@/contexts/AppDataContext";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { buildBusinessSeed, type SeedProfile } from "@/data/seed";
import { persistMastersData } from "@/data/seed/seedMastersSync";
import { bootstrapSessionAfterSeed } from "@/lib/seedSessionBootstrap";
import { clearAllAppStorage } from "@/lib/clearAppStorage";
import { persistFreshAppStateSeed } from "@/lib/appDataStorage";

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

/** Build full business seed in memory (hydrated). */
export function materializeDefaultBusinessBoot(profile: SeedProfile = "full"): AppState {
  const { state } = buildBusinessSeed(profile);
  return state;
}

/**
 * Default opening state: full business seed + masters + super_admin session.
 * Used on first visit, localStorage clear, and legacy empty upgrades.
 */
export function persistDefaultBusinessBoot(profile: SeedProfile = "full"): AppState {
  clearAllAppStorage();
  const state = materializeDefaultBusinessBoot(profile);
  setWorkspaceMode("business");
  persistFreshAppStateSeed(state);
  persistMastersData();
  bootstrapSessionAfterSeed(state);
  if (import.meta.env.DEV) {
    console.info(
      `[MSS] Default boot — business seed (${state.projects.length} projects, ${state.customers.length} customers).`,
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
