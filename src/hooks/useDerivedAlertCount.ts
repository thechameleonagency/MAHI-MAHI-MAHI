import { useMemo } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useAppData } from "@/contexts/AppDataContext";
import { countUndismissedBusinessAlerts, deriveBusinessAlertDescriptors } from "@/lib/businessAlerts";
import { useDismissedAlertIds } from "@/hooks/useDismissedAlertIds";

/** Count of actionable business alerts (matches Notifications page; excludes per-actor dismissals). */
export function useDerivedAlertCount(): number {
  const { sessionUserId } = useAppSession();
  const {
    invoices,
    loans,
    lowStockItems,
    blockages,
    quotations,
    projects,
    projectTimelineByProjectId,
    vendorBills,
    vendors,
  } = useAppData();

  const vendorNamesById = useMemo(
    () => new Map(vendors.map((v) => [String(v.id), v.name] as const)),
    [vendors],
  );

  const descriptors = useMemo(
    () =>
      deriveBusinessAlertDescriptors({
        invoices,
        loans,
        lowStockItems: lowStockItems ?? [],
        blockages: blockages ?? [],
        quotations,
        projects,
        projectTimelineByProjectId,
        vendorBills,
        vendorNamesById,
      }),
    [
      invoices,
      loans,
      lowStockItems,
      blockages,
      quotations,
      projects,
      projectTimelineByProjectId,
      vendorBills,
      vendorNamesById,
    ],
  );

  const activeAlertIds = useMemo(() => descriptors.map((d) => d.id), [descriptors]);
  const { dismissed } = useDismissedAlertIds(sessionUserId, activeAlertIds);

  return useMemo(
    () => countUndismissedBusinessAlerts(descriptors, dismissed),
    [descriptors, dismissed],
  );
}
