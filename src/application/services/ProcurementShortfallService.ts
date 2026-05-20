import { resolveProcurementNeedByDate } from "@/lib/procurementNeedByDate";
import type { InventoryItem, Project, Quotation } from "@/types/project";
import type { SiteChecklistTemplate } from "@/types/templates";
import type { MaterialReservation } from "@/types/operations";

export type ProcurementShortfall = {
  projectId: string;
  projectName: string;
  itemId: string;
  itemName: string;
  requiredQty: number;
  issuedQty: number;
  availableStock: number;
  /** Reservations held by other projects + manual reservations (consume effective availability). */
  reservedForOthers: number;
  shortfallQty: number;
  needByDate: string;
  lastPurchaseRate: number;
};

type RequirementSeed = {
  inventoryItemId: string;
  name: string;
  quantity: number;
};

type BuildShortfallsInput = {
  projects: Project[];
  inventoryItems: InventoryItem[];
  getProjectQuotation: (projectId: string) => Quotation | undefined;
  /**
   * Resolve a Site Checklist Template by id (used as fallback when a quotation
   * snapshot is absent). Previously `getInventoryPresetById` — renamed after
   * the Templates merge but kept as a function-typed input for backward compat.
   */
  getSiteChecklistTemplateById: (templateId: string) => SiteChecklistTemplate | undefined;
  /** Active (un-released) material reservations across all projects + manual rows. */
  materialReservations?: MaterialReservation[];
};

export class ProcurementShortfallService {
  buildShortfalls(input: BuildShortfallsInput): ProcurementShortfall[] {
    const rows: ProcurementShortfall[] = [];
    const activeReservations = (input.materialReservations ?? []).filter((r) => !r.releasedAt);

    input.projects.forEach((project) => {
      const requiredItems = this.getRequiredItems(project, input.getProjectQuotation, input.getSiteChecklistTemplateById);
      if (requiredItems.length === 0) {
        return;
      }

      requiredItems.forEach((required) => {
        const inventoryItem = input.inventoryItems.find(
          (item) => String(item.id) === String(required.inventoryItemId),
        );
        if (!inventoryItem) {
          return;
        }

        const issuedQty =
          project.materialsSent
            ?.filter((entry) => String(entry.itemId) === String(required.inventoryItemId))
            .reduce((sum, entry) => sum + entry.quantity, 0) || 0;

        // Reservations belonging to other projects + manual (no projectId) count against this
        // project's effective availability. Reservations *for this* project do not reduce its
        // own pool (it is already committed there).
        const reservedForOthers = activeReservations
          .filter(
            (r) =>
              String(r.itemId) === String(required.inventoryItemId) &&
              (r.projectId === undefined || r.projectId !== project.id),
          )
          .reduce((sum, r) => sum + r.qty, 0);

        const effectiveAvailable = Math.max(0, inventoryItem.stock - reservedForOthers);
        const shortfallQty = Math.max(0, required.quantity - issuedQty);
        if (shortfallQty <= 0) {
          return;
        }

        rows.push({
          projectId: project.id,
          projectName: project.name,
          itemId: required.inventoryItemId,
          itemName: required.name || inventoryItem.name,
          requiredQty: required.quantity,
          issuedQty,
          availableStock: effectiveAvailable,
          reservedForOthers,
          shortfallQty,
          needByDate: resolveProcurementNeedByDate({ projectStartDate: project.startDate }),
          lastPurchaseRate: inventoryItem.buyPrice,
        });
      });
    });

    return rows.sort((a, b) => b.shortfallQty - a.shortfallQty);
  }

  private getRequiredItems(
    project: Project,
    getProjectQuotation: (projectId: string) => Quotation | undefined,
    getSiteChecklistTemplateById: (templateId: string) => SiteChecklistTemplate | undefined,
  ): RequirementSeed[] {
    const quotation = getProjectQuotation(project.id);
    const presetFromQuotation = quotation?.presetSnapshot?.map((item) => ({
      inventoryItemId: item.id,
      name: item.name,
      quantity: item.quantity,
    }));

    const presetFromProject = project.presetId
      ? getSiteChecklistTemplateById(project.presetId)?.items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          name: item.name,
          quantity: item.quantity,
        }))
      : undefined;

    return presetFromQuotation || presetFromProject || [];
  }

}
