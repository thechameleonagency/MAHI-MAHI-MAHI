import { useEffect, useRef } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { notifySessionActorChanged } from "@/lib/notificationDismissals";

/**
 * EC2 — when demo user / role changes without a full page reload, refresh dismissal subscribers
 * so the header badge and Notifications page read the correct per-actor localStorage bucket.
 */
export function useSessionActorTransition(): void {
  const { sessionUserId, currentRole, memberId } = useAppSession();
  const prev = useRef({ sessionUserId, currentRole, memberId });

  useEffect(() => {
    const prevSnap = prev.current;
    if (
      prevSnap.sessionUserId === sessionUserId &&
      prevSnap.currentRole === currentRole &&
      prevSnap.memberId === memberId
    ) {
      return;
    }
    prev.current = { sessionUserId, currentRole, memberId };
    notifySessionActorChanged();
  }, [sessionUserId, currentRole, memberId]);
}
