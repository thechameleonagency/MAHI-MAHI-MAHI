import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleProjectCustomerLinkage,
  reconcileProjectCustomerLinkage,
  resolveCustomerIdFromHints,
  syncProjectClientFromCustomer,
} from "@/lib/projectCustomerLinkage";
import type { Customer } from "@/types/finance";
import type { Project } from "@/types/project";

const customers: Customer[] = [
  {
    id: "C-A",
    name: "Alpha Solar Pvt Ltd",
    phone: "9876543210",
    email: "alpha@example.com",
    gstin: "27AAAAA0000A1Z5",
    address: "Pune",
    type: "company",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: "2026-01-01",
  },
  {
    id: "C-B",
    name: "Alpha Solar Pvt Ltd",
    phone: "9123456789",
    email: "beta@example.com",
    gstin: "27BBBBB0000B1Z5",
    address: "Mumbai",
    type: "company",
    itemsBought: [],
    totalPurchases: 0,
    createdAt: "2026-01-02",
  },
];

describe("projectCustomerLinkage (ER3)", () => {
  it("resolveCustomerIdFromHints uses unique phone, not ambiguous name", () => {
    expect(
      resolveCustomerIdFromHints({ client: "Alpha Solar Pvt Ltd", clientPhone: "9876543210" }, customers),
    ).toBe("C-A");
    expect(resolveCustomerIdFromHints({ client: "Alpha Solar Pvt Ltd" }, customers)).toBeUndefined();
  });

  it("reconcileProjectCustomerLinkage backfills from quotation.customerId", () => {
    const project: Project = {
      id: "P-1",
      name: "Test",
      client: "Alpha Solar Pvt Ltd",
      clientPhone: "9876543210",
      quotationId: "Q-1",
      lifecycleStatus: "New",
      contractAmount: 100000,
      amountReceived: 0,
      amountInvoiced: 0,
    } as Project;

    const state = {
      customers,
      projects: [project],
      quotations: [
        {
          id: "Q-1",
          clientName: "Alpha Solar Pvt Ltd",
          clientPhone: "9876543210",
          customerId: "C-A",
          status: "approved",
        },
      ],
      invoices: [],
      saleBills: [],
    } as import("@/contexts/AppDataContext").AppState;

    const next = reconcileProjectCustomerLinkage(state);
    expect(next.projects[0].customerId).toBe("C-A");
    expect(next.projects[0].client).toBe("Alpha Solar Pvt Ltd");
    expect(findStaleProjectCustomerLinkage(next)).toEqual([]);
  });

  it("syncProjectClientFromCustomer aligns denormalized fields", () => {
    const project = {
      id: "P-2",
      name: "Site",
      client: "Wrong Name",
      clientPhone: "000",
      customerId: "C-A",
      lifecycleStatus: "New",
    } as Project;
    const synced = syncProjectClientFromCustomer(project, customers[0]);
    expect(synced.client).toBe("Alpha Solar Pvt Ltd");
    expect(synced.clientPhone).toBe("9876543210");
  });

  it("smoke seed has no stale project-customer linkage after hydration", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);
    const stale = findStaleProjectCustomerLinkage(hydrated);
    expect(stale, stale.map((s) => `${s.projectId}:${s.reason}`).join("; ")).toEqual([]);
  });

  it("full seed verifySeedState passes ER3 checks", () => {
    const { verification } = buildBusinessSeed("full");
    const er3 = verification.errors.filter((e) => e.startsWith("ER3:"));
    expect(er3).toEqual([]);
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });
});
