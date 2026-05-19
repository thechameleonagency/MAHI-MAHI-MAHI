/**
 * Wipes all MSS prototype data from browser localStorage (not application source code).
 * Used on reset epoch bumps, Settings reset, and prototype-wipe.html.
 */

const APP_KEY_PREFIXES = ["mss.", "mahi_solar_"] as const;

const APP_EXACT_KEYS = [
  "masters_data",
  "mahi_solar_app_data",
  "mahi_solar_app_data_version",
  "mahi_solar_app_reset_epoch",
  "mss.schema.version",
  "mss.app.version",
  "mss_storage_version",
  "mms-nav-pins",
] as const;

function shouldRemoveKey(key: string): boolean {
  if ((APP_EXACT_KEYS as readonly string[]).includes(key)) return true;
  return APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Remove every MSS app-data key from localStorage. Returns keys removed. */
export function clearAllAppStorage(): string[] {
  const removed: string[] = [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && shouldRemoveKey(key)) keys.push(key);
  }
  for (const key of keys) {
    localStorage.removeItem(key);
    removed.push(key);
  }
  return removed;
}

/** Bump when every browser must drop stale data and boot empty (masters only). */
export const APP_DATA_RESET_EPOCH = "2026-05-19-empty-boot-v2";
export const APP_DATA_RESET_EPOCH_KEY = "mahi_solar_app_reset_epoch";
