import { useMemo } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { deriveBusinessAlertDescriptors } from "@/lib/businessAlerts";

/** Count of actionable business alerts (matches TopHeader / notification hub intent). */
export function useDerivedAlertCount(): number {
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

  const vendorNamesByNumericId = useMemo(
    () => new Map(vendors.map((v) => [v.id, v.name] as const)),
    [vendors],
  );

  return useMemo(() => {
    return deriveBusinessAlertDescriptors({
      invoices,
      loans,
      lowStockItems: lowStockItems ?? [],
      blockages: blockages ?? [],
      quotations,
      projects,
      projectTimelineByProjectId,
      vendorBills,
      vendorNamesByNumericId,
    }).length;
  }, [
    invoices,
    loans,
    lowStockItems,
    blockages,
    quotations,
    projects,
    projectTimelineByProjectId,
    vendorBills,
    vendorNamesByNumericId,
  ]);
}
