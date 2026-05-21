const DISMISSED_ALERTS_KEY_PREFIX = "mahi_solar_dismissed_alerts_v1_";

/** Stable localStorage key per signed-in / demo actor. */
export function dismissedAlertsStorageKey(actorUserId: string): string {
  const slug = actorUserId.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return `${DISMISSED_ALERTS_KEY_PREFIX}${slug || "anonymous"}`;
}

export function loadDismissedAlertIds(actorUserId: string): Set<string> {
  if (!actorUserId.trim()) return new Set();
  try {
    const raw = localStorage.getItem(dismissedAlertsStorageKey(actorUserId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

const EMPTY_DISMISSED = new Set<string>();

let cachedSnapshotKey = "";
let cachedSnapshotSet: Set<string> = EMPTY_DISMISSED;

function dismissedIdsSignature(ids: ReadonlySet<string>): string {
  return [...ids].sort().join("\0");
}

/** Invalidate memoized snapshot after writes (useSyncExternalStore stability). */
export function invalidateDismissedAlertSnapshotCache(): void {
  cachedSnapshotKey = "";
  cachedSnapshotSet = EMPTY_DISMISSED;
}

const dismissalListeners = new Set<() => void>();

/** Subscribe to dismissal writes (same-tab Notifications ↔ header badge). */
export function subscribeNotificationDismissals(listener: () => void): () => void {
  dismissalListeners.add(listener);
  return () => {
    dismissalListeners.delete(listener);
  };
}

function emitNotificationDismissalsChanged(): void {
  invalidateDismissedAlertSnapshotCache();
  for (const listener of dismissalListeners) listener();
}

/** EC2 — force badge/list hooks to reload dismissals after actor or role changes in-session. */
export function notifySessionActorChanged(): void {
  emitNotificationDismissalsChanged();
}

/**
 * Stable snapshot for useSyncExternalStore — new Set only when storage or active ids change.
 */
export function getDismissedAlertIdsSnapshot(
  actorUserId: string,
  activeAlertIds: readonly string[],
): Set<string> {
  const storageKey = dismissedAlertsStorageKey(actorUserId);
  let raw = "";
  try {
    raw = localStorage.getItem(storageKey) ?? "";
  } catch {
    raw = "";
  }
  const activeKey = activeAlertIds.slice().sort().join("\0");
  const composite = `${storageKey}|${activeKey}|${raw}`;
  if (composite === cachedSnapshotKey) return cachedSnapshotSet;

  const next = pruneDismissedAlertIds(loadDismissedAlertIds(actorUserId), activeAlertIds);
  cachedSnapshotKey = composite;
  cachedSnapshotSet = next.size === 0 ? EMPTY_DISMISSED : next;
  return cachedSnapshotSet;
}

export function persistDismissedAlertIds(actorUserId: string, ids: ReadonlySet<string>): void {
  if (!actorUserId.trim()) return;
  try {
    const key = dismissedAlertsStorageKey(actorUserId);
    if (ids.size === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify([...ids]));
    }
    emitNotificationDismissalsChanged();
  } catch {
    /* private mode / quota */
  }
}

/**
 * Drop dismissals for alerts that no longer exist so a resolved issue can alert again
 * when the same stable id reappears in `deriveBusinessAlertDescriptors`.
 */
export function pruneDismissedAlertIds(
  dismissed: ReadonlySet<string>,
  activeAlertIds: readonly string[],
): Set<string> {
  const active = new Set(activeAlertIds);
  const next = new Set<string>();
  for (const id of dismissed) {
    if (active.has(id)) next.add(id);
  }
  return next;
}
