/** Tracks whether background auto-seed has completed for the current workspace. */
export const AUTO_SEED_DONE_KEY = "mahi_solar_auto_seed_done";

/** Set before reload to trigger generation immediately after clear-and-regenerate. */
export const AUTO_SEED_PENDING_KEY = "mahi_solar_auto_seed_pending";

export function isAutoSeedDone(): boolean {
  try {
    return localStorage.getItem(AUTO_SEED_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAutoSeedDone(): void {
  try {
    localStorage.setItem(AUTO_SEED_DONE_KEY, "1");
    localStorage.removeItem(AUTO_SEED_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Mark auto-seed done only when canonical pipeline rows exist in persisted workspace. */
export function markAutoSeedDoneIfSeeded(counts: {
  projects: number;
  customers: number;
  enquiries: number;
  quotations: number;
}): boolean {
  const seeded =
    counts.projects > 0 &&
    counts.customers > 0 &&
    counts.enquiries > 0 &&
    counts.quotations > 0;
  if (seeded) {
    markAutoSeedDone();
  }
  return seeded;
}

export function clearAutoSeedDone(): void {
  try {
    localStorage.removeItem(AUTO_SEED_DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function isAutoSeedPending(): boolean {
  try {
    return localStorage.getItem(AUTO_SEED_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAutoSeedPending(): void {
  try {
    localStorage.setItem(AUTO_SEED_PENDING_KEY, "1");
    localStorage.removeItem(AUTO_SEED_DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAutoSeedPending(): void {
  try {
    localStorage.removeItem(AUTO_SEED_PENDING_KEY);
  } catch {
    /* ignore */
  }
}
