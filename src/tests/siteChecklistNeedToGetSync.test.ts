import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleSiteChecklistNeedToGetDrift,
  projectSiteChecklistToSiteChecklistItems,
  syncSitesChecklistFromProjects,
} from "@/lib/siteChecklistNeedToGetSync";
import { NeedToGetService } from "@/application/services/NeedToGetService";

describe("siteChecklistNeedToGetSync (FC9)", () => {
  it("hydrated seed has no checklist drift on active sites", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleSiteChecklistNeedToGetDrift(
        hydrated.projects,
        hydrated.sites,
        hydrated.inventoryItems,
      ),
    ).toEqual([]);
  });

  it("syncs project siteChecklist to site checklistItems for Need-to-Get", () => {
    const { state } = buildBusinessSeed("smoke");
    const project = state.projects.find(
      (p) =>
        p.siteChecklist?.length &&
        (p.lifecycleStatus === "In Progress" || p.status === "Ongoing"),
    );
    expect(project).toBeTruthy();
    const site = state.sites.find(
      (s) => s.projectId === project!.id && (!s.status || s.status === "active"),
    );
    expect(site).toBeTruthy();

    site!.checklistItems = [];
    const items = state.inventoryItems.map((inv) => {
      const onChecklist = project!.siteChecklist!.some((cl) => cl.name === inv.name);
      return onChecklist ? { ...inv, stock: 0 } : inv;
    });
    const synced = syncSitesChecklistFromProjects(
      state.projects,
      state.sites,
      items,
      [project!.id],
    );
    const updatedSite = synced.find((s) => s.id === site!.id);
    expect(updatedSite?.checklistItems?.length).toBe(project!.siteChecklist!.length);

    const svc = new NeedToGetService();
    const rows = svc.buildRows(
      synced,
      state.projects,
      items,
      state.vendorBills,
      state.materialReservations ?? [],
      state.materialDamageRecords ?? [],
    );
    const materialRows = rows.filter(
      (r) => r.projectId === project!.id && r.rowKind === "material" && r.qtyShort > 0,
    );
    expect(materialRows.length).toBeGreaterThan(0);
  });

  it("maps inventory by material name from project checklist", () => {
    const { state } = buildBusinessSeed("smoke");
    const project = state.projects.find((p) => p.siteChecklist?.length);
    const panel = state.inventoryItems.find((i) =>
      project?.siteChecklist?.some((cl) => cl.name === i.name),
    );
    expect(project && panel).toBeTruthy();
    const items = projectSiteChecklistToSiteChecklistItems(
      project!.siteChecklist,
      state.inventoryItems,
    );
    const mapped = items.find((i) => i.inventoryItemId === panel!.id);
    expect(mapped?.requiresMaterial).toBe(true);
    expect(mapped?.requiredQuantity).toBeGreaterThan(0);
  });
});
