import { useMemo } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useAppData } from "@/contexts/AppDataContext";
import {
  deriveBusinessAlertDescriptors,
  filterDismissedBusinessAlerts,
  type BusinessAlertDescriptor,
} from "@/lib/businessAlerts";
import { filterBusinessAlertsForActorScope } from "@/lib/businessAlertsActorScope";
import { buildProjectActorScopeContext } from "@/lib/projectActorScope";
import { useDismissedAlertIds } from "@/hooks/useDismissedAlertIds";

export type SessionBusinessAlerts = {
  descriptors: BusinessAlertDescriptor[];
  visible: BusinessAlertDescriptor[];
  dismissed: ReadonlySet<string>;
  dismissOne: (id: string) => void;
  dismissAll: (ids: readonly string[]) => void;
  restoreAll: () => void;
  undismissedCount: number;
};

/** Notifications page + header badge — same derivation, role scope, and per-actor dismissals (EC2 / MD5). */
export function useBusinessAlertsForSession(): SessionBusinessAlerts {
  const { currentRole, sessionUserId, demoUserName, memberId } = useAppSession();
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
    deletionRequests,
    enquiries,
    teams,
    employees,
    settingsTeamMembers,
    scheduledInstallations,
  } = useAppData();

  const actorMemberId = memberId.trim() || sessionUserId;

  const vendorNamesById = useMemo(
    () => new Map(vendors.map((v) => [String(v.id), v.name] as const)),
    [vendors],
  );

  const scopeCtx = useMemo(
    () =>
      buildProjectActorScopeContext({
        role: currentRole,
        actorMemberId,
        actorDisplayName: demoUserName,
        quotations,
        enquiries,
        teams,
        employees,
        settingsTeamMembers,
        scheduledInstallations,
        projects,
      }),
    [
      currentRole,
      actorMemberId,
      demoUserName,
      quotations,
      enquiries,
      teams,
      employees,
      settingsTeamMembers,
      scheduledInstallations,
      projects,
    ],
  );

  const descriptors = useMemo(() => {
    const raw = deriveBusinessAlertDescriptors({
      invoices,
      loans,
      lowStockItems: lowStockItems ?? [],
      blockages: blockages ?? [],
      quotations,
      projects,
      projectTimelineByProjectId,
      vendorBills,
      vendorNamesById,
      deletionRequests,
    });
    return filterBusinessAlertsForActorScope(raw, scopeCtx, {
      projects,
      quotations,
      invoices,
      blockages: blockages ?? [],
    });
  }, [
    invoices,
    loans,
    lowStockItems,
    blockages,
    quotations,
    projects,
    projectTimelineByProjectId,
    vendorBills,
    vendorNamesById,
    deletionRequests,
    scopeCtx,
  ]);

  const activeAlertIds = useMemo(() => descriptors.map((d) => d.id), [descriptors]);
  const { dismissed, dismissOne, dismissAll, restoreAll } = useDismissedAlertIds(
    sessionUserId,
    activeAlertIds,
  );

  const visible = useMemo(
    () => filterDismissedBusinessAlerts(descriptors, dismissed),
    [descriptors, dismissed],
  );

  return {
    descriptors,
    visible,
    dismissed,
    dismissOne,
    dismissAll,
    restoreAll,
    undismissedCount: visible.length,
  };
}
