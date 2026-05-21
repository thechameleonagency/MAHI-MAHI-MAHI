import { describe, expect, it, beforeEach } from "vitest";
import {
  countUndismissedBusinessAlerts,
  deriveBusinessAlertDescriptors,
  filterDismissedBusinessAlerts,
} from "@/lib/businessAlerts";
import {
  dismissedAlertsStorageKey,
  loadDismissedAlertIds,
  persistDismissedAlertIds,
  pruneDismissedAlertIds,
  subscribeNotificationDismissals,
} from "@/lib/notificationDismissals";

describe("notificationDismissals (MD5)", () => {
  const actor = "mem-admin-1";

  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and reloads dismissed ids per actor", () => {
    persistDismissedAlertIds(actor, new Set(["inv-1", "loan-2"]));
    expect(loadDismissedAlertIds(actor)).toEqual(new Set(["inv-1", "loan-2"]));
    expect(loadDismissedAlertIds("other-actor")).toEqual(new Set());
  });

  it("clears storage when all dismissals removed", () => {
    persistDismissedAlertIds(actor, new Set(["inv-1"]));
    persistDismissedAlertIds(actor, new Set());
    expect(localStorage.getItem(dismissedAlertsStorageKey(actor))).toBeNull();
  });

  it("prunes dismissals when alert no longer active", () => {
    const pruned = pruneDismissedAlertIds(new Set(["inv-1", "loan-2"]), ["inv-1"]);
    expect(pruned).toEqual(new Set(["inv-1"]));
  });

  it("notifies subscribers when dismissals persist", () => {
    let calls = 0;
    const unsub = subscribeNotificationDismissals(() => {
      calls += 1;
    });
    persistDismissedAlertIds(actor, new Set(["inv-1"]));
    unsub();
    expect(calls).toBe(1);
  });

  it("countUndismissedBusinessAlerts matches filtered list length", () => {
    const descriptors = deriveBusinessAlertDescriptors({
      invoices: [
        {
          id: "INV1",
          invoiceNumber: "MS-1",
          status: "overdue",
          dueDate: "2020-01-01",
          total: 1000,
          amountReceived: 0,
          customerName: "Acme",
        } as never,
      ],
      loans: [],
      lowStockItems: [],
      blockages: [],
      quotations: [],
      projects: [],
      projectTimelineByProjectId: {},
      vendorBills: [],
    });
    const dismissed = new Set([descriptors[0]?.id].filter(Boolean));
    expect(countUndismissedBusinessAlerts(descriptors, dismissed)).toBe(0);
    expect(filterDismissedBusinessAlerts(descriptors, dismissed)).toHaveLength(0);
  });
});
