import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import {
  evaluateAutoArchive,
  findStaleCustomerArchiveState,
  reconcileCustomersAutoArchive,
} from "@/domain/customer/customerArchive";

describe("customerArchiveContinuity (FC7)", () => {
  it("archives customer when only direct-exception project is completed", () => {
    const { state } = buildBusinessSeed("smoke");
    const dexProject = state.projects.find((p) =>
      p.directCreationReason?.includes("Urgent hospital backup power"),
    );
    expect(dexProject?.customerId).toBeTruthy();

    const hydrated = applySeedHydrationPipeline(state);
    const customer = hydrated.customers.find((c) => c.id === dexProject?.customerId);
    expect(customer?.archivedAt).toBeTruthy();
    expect(findStaleCustomerArchiveState(hydrated)).toEqual([]);
  });

  it("hydration reconciles customers who should be archived", () => {
    const { state } = buildBusinessSeed("smoke");
    const target = state.customers.find((c) => !c.archivedAt && c.customerKind !== "inventory");
    expect(target).toBeTruthy();
    const projects = state.projects.map((p) =>
      p.customerId === target!.id
        ? {
            ...p,
            lifecycleStatus: "Completed" as const,
            status: "Completed" as const,
            endDate: "2026-05-01",
          }
        : p,
    );
    const broken = { ...state, projects, enquiries: [], quotations: [] };
    const hydrated = applyAppStateHydrationPipeline(broken);
    const customer = hydrated.customers.find((c) => c.id === target!.id);
    expect(customer?.archivedAt).toBeTruthy();
  });

  it("clears archive when customer gains an open project (FC7)", () => {
    const customer = {
      id: "CUST-FC7",
      name: "Archive Reopen Test",
      phone: "9999900001",
      email: "fc7@test.local",
      address: "Test",
      type: "company" as const,
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
      archivedAt: "2026-05-01",
    };
    const projects = [
      {
        id: "P-FC7",
        customerId: "CUST-FC7",
        lifecycleStatus: "In Progress",
        status: "Ongoing",
      } as import("@/types/project").Project,
    ];
    const reconciled = reconcileCustomersAutoArchive({
      customers: [customer],
      projects,
      quotations: [],
      enquiries: [],
    });
    expect(reconciled[0]?.archivedAt).toBeUndefined();
  });

  it("reconcileCustomersAutoArchive is idempotent", () => {
    const { state } = buildBusinessSeed("smoke");
    const once = reconcileCustomersAutoArchive({
      customers: state.customers,
      projects: state.projects,
      quotations: state.quotations,
      enquiries: state.enquiries,
    });
    const twice = reconcileCustomersAutoArchive({
      customers: once,
      projects: state.projects,
      quotations: state.quotations,
      enquiries: state.enquiries,
    });
    expect(twice).toEqual(once);
  });

  it("detects archived customer with open project", () => {
    const decision = evaluateAutoArchive({
      customer: {
        id: "C1",
        name: "A",
        phone: "1",
        email: "a@b.com",
        address: "x",
        type: "company",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: "2026-01-01",
        archivedAt: "2026-05-01",
      },
      projects: [
        {
          id: "P1",
          customerId: "C1",
          lifecycleStatus: "In Progress",
          status: "Ongoing",
        } as import("@/types/project").Project,
      ],
      quotations: [],
      enquiries: [],
    });
    expect(decision.shouldArchive).toBe(false);
    const stale = findStaleCustomerArchiveState({
      customers: [
        {
          id: "C1",
          name: "A",
          phone: "1",
          email: "a@b.com",
          address: "x",
          type: "company",
          itemsBought: [],
          totalPurchases: 0,
          createdAt: "2026-01-01",
          archivedAt: "2026-05-01",
        },
      ],
      projects: [
        {
          id: "P1",
          customerId: "C1",
          lifecycleStatus: "In Progress",
          status: "Ongoing",
        } as import("@/types/project").Project,
      ],
      quotations: [],
      enquiries: [],
    });
    expect(stale).toEqual([{ customerId: "C1", reason: "archived_with_open_project" }]);
  });
});
