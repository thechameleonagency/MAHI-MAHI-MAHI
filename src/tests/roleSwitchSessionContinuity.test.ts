import { describe, expect, it, beforeEach } from "vitest";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { deriveBusinessAlertDescriptors } from "@/lib/businessAlerts";
import { filterBusinessAlertsForActorScope } from "@/lib/businessAlertsActorScope";
import { buildProjectActorScopeContext } from "@/lib/projectActorScope";
import {
  dismissedAlertsStorageKey,
  loadDismissedAlertIds,
  notifySessionActorChanged,
  persistDismissedAlertIds,
} from "@/lib/notificationDismissals";

describe("EC2 — role switch in same session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("notification dismissals are isolated per authenticated member id", () => {
    const sal = DEMO_LOGIN_USERS.find((u) => u.memberId === "SAL-001")!;
    const admin = DEMO_LOGIN_USERS.find((u) => u.memberId === "ADM-001")!;
    persistDismissedAlertIds(sal.memberId, new Set(["inv-1"]));
    persistDismissedAlertIds(admin.memberId, new Set(["loan-2"]));
    expect(loadDismissedAlertIds(sal.memberId)).toEqual(new Set(["inv-1"]));
    expect(loadDismissedAlertIds(admin.memberId)).toEqual(new Set(["loan-2"]));
    expect(dismissedAlertsStorageKey(sal.memberId)).not.toBe(
      dismissedAlertsStorageKey(admin.memberId),
    );
  });

  it("notifySessionActorChanged invalidates dismissal snapshot without error", () => {
    expect(() => notifySessionActorChanged()).not.toThrow();
    persistDismissedAlertIds("SAL-001", new Set(["a"]));
    expect(loadDismissedAlertIds("SAL-001").size).toBe(1);
  });

  it("salesperson role scope hides admin-only deletion request alerts", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const raw = deriveBusinessAlertDescriptors({
      invoices: hydrated.invoices,
      loans: hydrated.loans,
      lowStockItems: hydrated.inventoryItems ?? [],
      blockages: hydrated.blockages ?? [],
      quotations: hydrated.quotations,
      projects: hydrated.projects,
      projectTimelineByProjectId: hydrated.projectTimelineByProjectId,
      vendorBills: hydrated.vendorBills,
      deletionRequests: hydrated.deletionRequests,
    });
    expect(raw.some((d) => d.kind === "deletion_request")).toBe(true);

    const sal = DEMO_LOGIN_USERS.find((u) => u.memberId === "SAL-001")!;
    const salCtx = buildProjectActorScopeContext({
      role: "salesperson",
      actorMemberId: sal.memberId,
      actorDisplayName: sal.name,
      quotations: hydrated.quotations,
      enquiries: hydrated.enquiries,
      teams: hydrated.teams,
      employees: hydrated.employees,
      settingsTeamMembers: hydrated.settingsTeamMembers,
      scheduledInstallations: hydrated.scheduledInstallations,
      projects: hydrated.projects,
    });
    const scoped = filterBusinessAlertsForActorScope(raw, salCtx, {
      projects: hydrated.projects,
      quotations: hydrated.quotations,
      invoices: hydrated.invoices,
      blockages: hydrated.blockages ?? [],
    });
    expect(scoped.some((d) => d.kind === "deletion_request")).toBe(false);

    const admin = DEMO_LOGIN_USERS.find((u) => u.memberId === "ADM-001")!;
    const adminCtx = buildProjectActorScopeContext({
      role: "admin",
      actorMemberId: admin.memberId,
      quotations: hydrated.quotations,
      enquiries: hydrated.enquiries,
      teams: hydrated.teams,
      employees: hydrated.employees,
      settingsTeamMembers: hydrated.settingsTeamMembers,
      scheduledInstallations: hydrated.scheduledInstallations,
      projects: hydrated.projects,
    });
    const adminAlerts = filterBusinessAlertsForActorScope(raw, adminCtx, {
      projects: hydrated.projects,
      quotations: hydrated.quotations,
      invoices: hydrated.invoices,
      blockages: hydrated.blockages ?? [],
    });
    expect(adminAlerts.some((d) => d.kind === "deletion_request")).toBe(true);
  });
});
