import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type { MovementType } from "@/application/services/InventoryMovementService";
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

function findProjectSiteChecklistLineIndex(
  checklist: ProjectSiteChecklistItem[],
  options: { checklistLineId?: string; inventoryItem?: Pick<InventoryItem, "id" | "name"> },
): number {
  if (options.checklistLineId) {
    const byId = checklist.findIndex((line) => line.id === options.checklistLineId);
    if (byId >= 0) return byId;
  }
  if (options.inventoryItem) {
    return checklist.findIndex(
      (line) => line.name.toLowerCase() === options.inventoryItem!.name.toLowerCase(),
    );
  }
  return -1;
}

/** Bump BOQ sent/returned/consumed quantities when material moves at a project. */
export function applyProjectSiteChecklistMaterialMovement(
  checklist: ProjectSiteChecklistItem[] | undefined,
  inventoryItem: Pick<InventoryItem, "id" | "name">,
  movementType: MovementType,
  quantity: number,
  checklistLineId?: string,
): ProjectSiteChecklistItem[] | undefined {
  if (!checklist?.length || quantity <= 0) return checklist;

  const idx = findProjectSiteChecklistLineIndex(checklist, { checklistLineId, inventoryItem });
  if (idx < 0) return checklist;

  const line = checklist[idx];
  let nextLine = line;

  if (movementType === "IssueToProject" || movementType === "IssueToSite") {
    nextLine = {
      ...line,
      qtySent: Math.min(line.qtyPlanned, line.qtySent + quantity),
    };
  } else if (movementType === "ReturnToWarehouse") {
    nextLine = { ...line, qtyReturned: line.qtyReturned + quantity };
  } else if (movementType === "ConsumptionAtSite" || movementType === "ScrapSite") {
    nextLine = { ...line, qtyConsumed: line.qtyConsumed + quantity };
  } else {
    return checklist;
  }

  if (
    nextLine.qtySent === line.qtySent &&
    nextLine.qtyReturned === line.qtyReturned &&
    nextLine.qtyConsumed === line.qtyConsumed
  ) {
    return checklist;
  }

  const next = [...checklist];
  next[idx] = nextLine;
  return next;
}

/** Full dispatch from site execution view — marks BOQ line fully sent. */
export function applyProjectSiteChecklistDispatch(
  project: Project,
  checklistLineId: string,
  qty: number,
): Project {
  if (!project.siteChecklist?.length || qty <= 0) return project;

  const idx = findProjectSiteChecklistLineIndex(project.siteChecklist, { checklistLineId });
  if (idx < 0) return project;

  const line = project.siteChecklist[idx];
  const qtySent = Math.min(line.qtyPlanned, Math.max(line.qtySent, qty));
  if (qtySent === line.qtySent) return project;

  const siteChecklist = [...project.siteChecklist];
  siteChecklist[idx] = { ...line, qtySent };
  return { ...project, siteChecklist };
}

/** Repair BOQ quantities from persisted site material ledger (hydrate / legacy drift). */
export function reconcileProjectsSiteChecklistFromMaterialLedger(
  projects: Project[],
  inventoryItems: InventoryItem[],
): Project[] {
  const invById = new Map(inventoryItems.map((item) => [String(item.id), item]));

  return projects.map((project) => {
    if (!project.siteChecklist?.length || !project.siteMaterialLedger?.length) {
      return project;
    }

    let changed = false;
    const siteChecklist = project.siteChecklist.map((line) => {
      const entry = project.siteMaterialLedger?.find((ledgerLine) => {
        const inv = invById.get(String(ledgerLine.itemId));
        return inv?.name.toLowerCase() === line.name.toLowerCase();
      });
      if (!entry) return line;

      const qtySent = Math.min(line.qtyPlanned, entry.issuedQty ?? 0);
      const qtyReturned = entry.returnedQty ?? 0;
      const qtyConsumed = (entry.consumedQty ?? 0) + (entry.scrapAtSiteQty ?? 0);

      if (
        line.qtySent === qtySent &&
        line.qtyReturned === qtyReturned &&
        line.qtyConsumed === qtyConsumed
      ) {
        return line;
      }

      changed = true;
      return { ...line, qtySent, qtyReturned, qtyConsumed };
    });

    return changed ? { ...project, siteChecklist } : project;
  });
}

/** Repair BOQ sent qty from dispatched site execution lines when ledger is empty (legacy dispatch). */
export function reconcileProjectsSiteChecklistFromDispatchedSites(
  projects: Project[],
  sites: SiteRecord[],
): Project[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  let nextProjects = projects;
  let anyChanged = false;

  for (const site of sites) {
    if (!site.projectId || !site.checklistItems?.length) continue;
    const project = projectById.get(site.projectId);
    if (!project?.siteChecklist?.length) continue;

    let projectChanged = false;
    let siteChecklist = project.siteChecklist;

    for (const siteLine of site.checklistItems) {
      if (siteLine.status !== "dispatched" && siteLine.status !== "partially-dispatched") continue;
      const idx = findProjectSiteChecklistLineIndex(siteChecklist, { checklistLineId: siteLine.id });
      if (idx < 0) continue;

      const line = siteChecklist[idx];
      const dispatchedQty =
        siteLine.status === "dispatched"
          ? Math.max(line.qtyPlanned, siteLine.requiredQuantity ?? line.qtyPlanned)
          : Math.min(line.qtyPlanned, Math.max(line.qtySent, siteLine.requiredQuantity ?? 1));
      const qtySent = Math.min(line.qtyPlanned, Math.max(line.qtySent, dispatchedQty));
      if (qtySent === line.qtySent) continue;

      if (!projectChanged) {
        siteChecklist = [...siteChecklist];
        projectChanged = true;
      }
      siteChecklist[idx] = { ...line, qtySent };
    }

    if (projectChanged) {
      anyChanged = true;
      const updated = { ...project, siteChecklist };
      projectById.set(project.id, updated);
      nextProjects = nextProjects.map((row) => (row.id === project.id ? updated : row));
    }
  }

  return anyChanged ? nextProjects : projects;
}

/**
 * Hydration repair: align project BOQ quantities with ledger + legacy site dispatch,
 * then resync site execution checklists from project BOQ.
 */
export function reconcileSiteChecklistNeedToGetState(
  projects: Project[],
  sites: SiteRecord[],
  inventoryItems: InventoryItem[],
): { projects: Project[]; sites: SiteRecord[] } {
  const fromLedger = reconcileProjectsSiteChecklistFromMaterialLedger(projects, inventoryItems);
  const fromSites = reconcileProjectsSiteChecklistFromDispatchedSites(fromLedger, sites);
  const syncedSites = syncSitesChecklistFromProjects(fromSites, sites, inventoryItems);
  return { projects: fromSites, sites: syncedSites };
}
