import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getDismissedAlertIdsSnapshot,
  loadDismissedAlertIds,
  persistDismissedAlertIds,
  pruneDismissedAlertIds,
  subscribeNotificationDismissals,
} from "@/lib/notificationDismissals";

/**
 * Per-actor dismissed business alert ids (localStorage, synced across hook instances).
 * Prunes when underlying alerts clear so the same id can surface again after re-derivation.
 */
export function useDismissedAlertIds(sessionUserId: string, activeAlertIds: readonly string[]) {
  const activeKey = useMemo(() => activeAlertIds.slice().sort().join("\0"), [activeAlertIds]);

  const dismissed = useSyncExternalStore(
    subscribeNotificationDismissals,
    () => getDismissedAlertIdsSnapshot(sessionUserId, activeAlertIds),
    () => new Set<string>(),
  );

  useEffect(() => {
    const loaded = loadDismissedAlertIds(sessionUserId);
    const pruned = pruneDismissedAlertIds(loaded, activeAlertIds);
    if (pruned.size !== loaded.size) {
      persistDismissedAlertIds(sessionUserId, pruned);
    }
  }, [sessionUserId, activeKey]);

  const dismissOne = useCallback(
    (alertId: string) => {
      const next = new Set(getDismissedAlertIdsSnapshot(sessionUserId, activeAlertIds));
      next.add(alertId);
      persistDismissedAlertIds(sessionUserId, next);
    },
    [sessionUserId, activeKey],
  );

  const dismissAll = useCallback(
    (alertIds: readonly string[]) => {
      persistDismissedAlertIds(sessionUserId, new Set(alertIds));
    },
    [sessionUserId],
  );

  const restoreAll = useCallback(() => {
    persistDismissedAlertIds(sessionUserId, new Set());
  }, [sessionUserId]);

  return { dismissed, dismissOne, dismissAll, restoreAll };
}
