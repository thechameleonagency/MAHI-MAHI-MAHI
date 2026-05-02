/** Aligns with product note: `mms-nav-pins` storage key; uses `mms-nav-pins` for localStorage compatibility. */
export const NAV_PINS_STORAGE_KEY = "mms-nav-pins";
export const NAV_PINS_CHANGED_EVENT = "mms-nav-pins-changed";

export function readPinnedPaths(): string[] {
  try {
    const raw = localStorage.getItem(NAV_PINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function writePinnedPaths(paths: string[]): void {
  localStorage.setItem(NAV_PINS_STORAGE_KEY, JSON.stringify(paths));
  window.dispatchEvent(new CustomEvent(NAV_PINS_CHANGED_EVENT, { detail: paths }));
}

export function togglePinnedPath(path: string, current: string[]): string[] {
  if (current.includes(path)) {
    return current.filter((p) => p !== path);
  }
  return [...current, path];
}
