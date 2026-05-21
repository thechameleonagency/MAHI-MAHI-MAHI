import { useBusinessAlertsForSession } from "@/hooks/useBusinessAlertsForSession";

/** Count of actionable business alerts (matches Notifications page; excludes per-actor dismissals). */
export function useDerivedAlertCount(): number {
  const { undismissedCount } = useBusinessAlertsForSession();
  return undismissedCount;
}
