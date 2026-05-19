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

/** Split pins into allowed vs denied for the active role. */
export function filterPinnedPaths(
  paths: string[],
  canAccessPath: (path: string) => boolean,
): { kept: string[]; removed: string[] } {
  const kept: string[] = [];
  const removed: string[] = [];
  for (const path of paths) {
    if (canAccessPath(path)) kept.push(path);
    else removed.push(path);
  }
  return { kept, removed };
}

/**
 * Drop pins the role cannot open; persists when anything was removed.
 * Returns paths that were removed (for optional toast copy).
 */
export function prunePinnedPathsForRole(canAccessPath: (path: string) => boolean): string[] {
  const current = readPinnedPaths();
  const { kept, removed } = filterPinnedPaths(current, canAccessPath);
  if (removed.length > 0) {
    writePinnedPaths(kept);
  }
  return removed;
}
