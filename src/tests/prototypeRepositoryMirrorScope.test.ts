import { beforeEach, describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { verifySeedState } from "@/data/seed/seedVerification";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { createPrototypeRepositoryContext } from "@/infrastructure/repositories/localStorage/createPrototypeRepositoryContext";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";
import {
  APP_STATE_CONTEXT_ONLY_SLICES,
  PROTOTYPE_REPOSITORY_MIRROR_SLICES,
} from "@/infrastructure/repositories/prototypeRepositoryManifest";
import {
  findPrototypeMirrorDrift,
  formatMirrorDriftError,
} from "@/lib/prototypeRepositoryMirrorScope";

describe("prototypeRepositoryMirrorScope (AR3)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mirrors sites, tasks, and vendors; keeps finance slices context-only", () => {
    expect(PROTOTYPE_REPOSITORY_MIRROR_SLICES.map((s) => s.key)).toEqual([
      "projects",
      "quotations",
      "enquiries",
      "customers",
      "invoices",
      "employees",
      "inventoryItems",
      "auditLogs",
      "sites",
      "tasks",
      "vendors",
    ]);
    expect(APP_STATE_CONTEXT_ONLY_SLICES).not.toContain("tasks");
    expect(APP_STATE_CONTEXT_ONLY_SLICES).not.toContain("vendors");
    expect(APP_STATE_CONTEXT_ONLY_SLICES).toContain("vendorBills");
  });

  it("sync keeps repositories aligned with AppState", () => {
    const repositories = createPrototypeRepositoryContext();
    const state = buildEmptyAppState();
    state.tasks = [{ id: "T-1", projectId: "P-1", siteId: "S-1", title: "Wire" } as never];
    state.vendors = [{ id: "V-1", name: "ACME", category: [], contact: "", email: "", address: "", outstandingAmount: 0, purchaseHistory: [] }];
    state.sites = [{ id: "S-1", name: "Roof", projectId: "P-1" } as never];

    syncPrototypeRepositoriesFromAppState(state, repositories);

    expect(findPrototypeMirrorDrift(state, repositories)).toEqual([]);
    expect(repositories.taskRepository.getById("T-1")?.title).toBe("Wire");
    expect(repositories.vendorRepository.getById("V-1")?.name).toBe("ACME");
  });

  it("detects drift when repo is stale", () => {
    const repositories = createPrototypeRepositoryContext();
    const state = buildEmptyAppState();
    state.tasks = [{ id: "T-1", projectId: "P-1", siteId: "S-1", title: "A" } as never];
    repositories.taskRepository.add({ id: "T-STALE", projectId: "P-1", siteId: "S-1", title: "Stale" } as never);

    const drift = findPrototypeMirrorDrift(state, repositories);
    expect(drift.length).toBeGreaterThan(0);
    expect(formatMirrorDriftError(drift[0]!)).toContain("tasks");
  });

  it("full seed passes AR3 drift check inside verifySeedState", () => {
    const { state } = buildBusinessSeed("smoke");
    const result = verifySeedState(state, "smoke");
    const ar3 = result.errors.filter((e) => e.startsWith("AR3:"));
    expect(ar3).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
