import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type {
  InventoryItem,
  Project,
  ProjectSiteChecklistItem,
  SiteChecklistItem,
  SiteRecord,
} from "@/types/project";

/** Map project BOQ checklist rows → site execution checklist lines that drive Need-to-Get. */
export function projectSiteChecklistToSiteChecklistItems(
  checklist: ProjectSiteChecklistItem[] | undefined,
  inventoryItems: InventoryItem[],
  existingItems?: SiteChecklistItem[],
): SiteChecklistItem[] {
  if (!checklist?.length) return [];
  const invByName = new Map(inventoryItems.map((i) => [i.name.toLowerCase(), i]));

  return checklist.map((cl) => {
    const inv = invByName.get(cl.name.toLowerCase());
    const existing = existingItems?.find(
      (e) =>
        e.id === cl.id ||
        (e.materialName?.toLowerCase() === cl.name.toLowerCase() && e.requiresMaterial === Boolean(inv)),
    );
    const qtyPlanned = cl.qtyPlanned;
    const qtySent = cl.qtySent;
    const dispatched =
      qtySent >= qtyPlanned ? "dispatched" : qtySent > 0 ? "partially-dispatched" : "pending";

    if (inv) {
      return {
        id: existing?.id ?? cl.id,
        requiresMaterial: true,
        inventoryItemId: inv.id,
        materialName: cl.name,
        requiredQuantity: qtyPlanned,
        status: dispatched,
        masterPresetId: existing?.masterPresetId,
      };
    }

    return {
      id: existing?.id ?? cl.id,
      requiresMaterial: false,
      materialName: cl.name,
      status: dispatched,
      masterPresetId: existing?.masterPresetId,
    };
  });
}

/** Keep `site.checklistItems` aligned with `project.siteChecklist` for Need-to-Get shortfall math (FC9). */
export function syncSitesChecklistFromProjects(
  projects: Project[],
  sites: SiteRecord[],
  inventoryItems: InventoryItem[],
  onlyProjectIds?: string[],
): SiteRecord[] {
  const scope = onlyProjectIds ? new Set(onlyProjectIds) : null;
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return sites.map((site) => {
    if (!site.projectId) return site;
    if (scope && !scope.has(site.projectId)) return site;
    const project = projectById.get(site.projectId);
    if (!project?.siteChecklist?.length) return site;

    const checklistItems = projectSiteChecklistToSiteChecklistItems(
      project.siteChecklist,
      inventoryItems,
      site.checklistItems,
    );
    return { ...site, checklistItems };
  });
}

export type StaleSiteChecklistNeedToGet = {
  siteId: string;
  projectId: string;
  reason: "checklist_drift";
};

function checklistSignature(items: SiteChecklistItem[] | undefined): string {
  return JSON.stringify(
    (items ?? [])
      .map((i) => ({
        id: i.id,
        requiresMaterial: i.requiresMaterial,
        inventoryItemId: i.inventoryItemId,
        materialName: i.materialName,
        requiredQuantity: i.requiredQuantity,
        status: i.status,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

/** Detect sites whose execution checklist no longer matches project BOQ (blocks Need-to-Get). */
export function findStaleSiteChecklistNeedToGetDrift(
  projects: Project[],
  sites: SiteRecord[],
  inventoryItems: InventoryItem[],
): StaleSiteChecklistNeedToGet[] {
  const stale: StaleSiteChecklistNeedToGet[] = [];
  const projectById = new Map(projects.map((p) => [p.id, p]));

  for (const site of sites) {
    if (!site.projectId || (site.status && site.status !== "active")) continue;
    const project = projectById.get(site.projectId);
    if (!project?.siteChecklist?.length) continue;
    const lifecycle = canonicalizeProjectLifecycleStatus(project.lifecycleStatus ?? project.status);
    if (lifecycle === "Completed" || lifecycle === "Closed") continue;

    const expected = projectSiteChecklistToSiteChecklistItems(
      project.siteChecklist,
      inventoryItems,
      site.checklistItems,
    );
    if (checklistSignature(site.checklistItems) !== checklistSignature(expected)) {
      stale.push({ siteId: String(site.id), projectId: site.projectId, reason: "checklist_drift" });
    }
  }
  return stale;
}
