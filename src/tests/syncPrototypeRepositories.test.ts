import { describe, expect, it, beforeEach } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { createPrototypeRepositoryContext } from "@/infrastructure/repositories/localStorage/createPrototypeRepositoryContext";
import {
  APP_STATE_CONTEXT_ONLY_SLICES,
  PROTOTYPE_REPOSITORY_MIRROR_SLICES,
  PROTOTYPE_REPOSITORY_STORAGE_KEYS,
  isPrototypeRepositoryStorageKey,
} from "@/infrastructure/repositories/prototypeRepositoryManifest";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";

describe("syncPrototypeRepositories (MD9)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("manifest lists every mirrored slice including sale bills in invoice repo", () => {
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
  });

  it("syncPrototypeRepositoriesFromAppState writes all mss.repo.* keys", () => {
    const repositories = createPrototypeRepositoryContext();
    const state = buildEmptyAppState();
    state.projects = [{ id: "PRJ-1", name: "Alpha" } as never];
    state.quotations = [{ id: "Q-1", quotationNumber: "Q-1" } as never];
    state.invoices = [{ id: "INV-1", invoiceNumber: "INV-1" } as never];
    state.saleBills = [{ id: "SB-1", invoiceNumber: "SB-1" } as never];
    state.tasks = [{ id: "T-1", projectId: "PRJ-1", siteId: "S-1", title: "Install" } as never];

    syncPrototypeRepositoriesFromAppState(state, repositories);

    expect(JSON.parse(localStorage.getItem(PROTOTYPE_REPOSITORY_STORAGE_KEYS.projects)!).length).toBe(1);
    expect(JSON.parse(localStorage.getItem(PROTOTYPE_REPOSITORY_STORAGE_KEYS.invoices)!).length).toBe(2);
    expect(repositories.projectRepository.getById("PRJ-1")?.name).toBe("Alpha");
    expect(repositories.taskRepository.getById("T-1")?.title).toBe("Install");
  });

  it("isPrototypeRepositoryStorageKey recognizes repo mirror writes", () => {
    expect(isPrototypeRepositoryStorageKey("mss.repo.projects")).toBe(true);
    expect(isPrototypeRepositoryStorageKey("mahi_solar_app_data")).toBe(false);
  });
});
