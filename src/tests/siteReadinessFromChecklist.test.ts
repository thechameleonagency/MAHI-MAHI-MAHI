import { describe, expect, it } from "vitest";
import {
  deriveSiteReadinessPatch,
  isSiteChecklistLineComplete,
  projectSiteChecklistCompletion,
  SITE_READINESS_DERIVED_MARKED_BY,
  syncProjectsSiteReadinessFromChecklist,
} from "@/lib/siteReadinessFromChecklist";
import type { Project, SiteRecord } from "@/types/project";

const baseProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "PROJ-1",
    name: "Test",
    projectKind: "SOLO_EPC",
    lifecycleStatus: "New",
    status: "New",
    ...overrides,
  }) as Project;

const line = (id: string, status: "pending" | "dispatched" = "pending") => ({
  id,
  requiresMaterial: true,
  inventoryItemId: "INV1",
  materialName: "Panel",
  requiredQuantity: 1,
  status,
});

describe("siteReadinessFromChecklist (E5)", () => {
  it("treats dispatched and partially-dispatched lines as complete", () => {
    expect(isSiteChecklistLineComplete(line("a", "dispatched"))).toBe(true);
    expect(isSiteChecklistLineComplete({ ...line("b"), status: "partially-dispatched" })).toBe(true);
    expect(isSiteChecklistLineComplete(line("c", "pending"))).toBe(false);
  });

  it("aggregates completion across all project sites", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "dispatched"), line("2", "pending")],
      },
      {
        id: "S2",
        name: "B",
        projectId: "PROJ-1",
        checklistItems: [line("3", "dispatched")],
      },
    ];
    expect(projectSiteChecklistCompletion("PROJ-1", sites)).toEqual({
      hasChecklist: true,
      complete: false,
      totalLines: 3,
      completeLines: 2,
    });
  });

  it("auto-sets ready when every checklist line is dispatched (pre-start only)", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "dispatched"), line("2", "dispatched")],
      },
    ];
    const patch = deriveSiteReadinessPatch(baseProject(), sites);
    expect(patch?.siteReadiness?.ready).toBe(true);
    expect(patch?.siteReadiness?.markedBy).toBe(SITE_READINESS_DERIVED_MARKED_BY);
    expect(patch?.siteReadiness?.note).toMatch(/dispatched/i);
  });

  it("does not derive when project already started", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "dispatched")],
      },
    ];
    const patch = deriveSiteReadinessPatch(
      baseProject({ startedAt: "2026-05-01T00:00:00.000Z", lifecycleStatus: "In Progress" }),
      sites,
    );
    expect(patch).toBeNull();
  });

  it("clears derived ready when a line becomes pending again", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "pending")],
      },
    ];
    const patch = deriveSiteReadinessPatch(
      baseProject({
        siteReadiness: {
          ready: true,
          markedAt: "2026-01-01",
          markedBy: SITE_READINESS_DERIVED_MARKED_BY,
        },
      }),
      sites,
    );
    expect(patch?.siteReadiness?.ready).toBe(false);
  });

  it("does not clear manual ready when checklist is incomplete", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "pending")],
      },
    ];
    const patch = deriveSiteReadinessPatch(
      baseProject({
        siteReadiness: {
          ready: true,
          markedAt: "2026-01-01",
          markedBy: "actor-admin",
        },
      }),
      sites,
    );
    expect(patch).toBeNull();
  });

  it("syncProjectsSiteReadinessFromChecklist updates only affected project", () => {
    const sites: SiteRecord[] = [
      {
        id: "S1",
        name: "A",
        projectId: "PROJ-1",
        checklistItems: [line("1", "dispatched")],
      },
    ];
    const projects = [
      baseProject({ id: "PROJ-1" }),
      baseProject({ id: "PROJ-2", name: "Other" }),
    ];
    const next = syncProjectsSiteReadinessFromChecklist(projects, sites, ["PROJ-1"]);
    expect(next[0].siteReadiness?.ready).toBe(true);
    expect(next[1].siteReadiness).toBeUndefined();
  });
});
