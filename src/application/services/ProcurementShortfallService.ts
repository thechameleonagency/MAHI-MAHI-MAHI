import { format } from "date-fns";
import type { InventoryItem, InventoryPreset, Project, Quotation } from "@/types/project";

export type ProcurementShortfall = {
  projectId: string;
  projectName: string;
  itemId: number;
  itemName: string;
  requiredQty: number;
  issuedQty: number;
  availableStock: number;
  shortfallQty: number;
  needByDate: string;
  lastPurchaseRate: number;
};

type RequirementSeed = {
  inventoryItemId: number;
  name: string;
  quantity: number;
};

type BuildShortfallsInput = {
  projects: Project[];
  inventoryItems: InventoryItem[];
  getProjectQuotation: (projectId: string) => Quotation | undefined;
  getInventoryPresetById: (presetId: string) => InventoryPreset | undefined;
};

export class ProcurementShortfallService {
  buildShortfalls(input: BuildShortfallsInput): ProcurementShortfall[] {
    const rows: ProcurementShortfall[] = [];

    input.projects.forEach((project) => {
      const requiredItems = this.getRequiredItems(project, input.getProjectQuotation, input.getInventoryPresetById);
      if (requiredItems.length === 0) {
        return;
      }

      requiredItems.forEach((required) => {
        const inventoryItem = input.inventoryItems.find((item) => item.id === required.inventoryItemId);
        if (!inventoryItem) {
          return;
        }

        const issuedQty =
          project.materialsSent
            ?.filter((entry) => entry.itemId === required.inventoryItemId)
            .reduce((sum, entry) => sum + entry.quantity, 0) || 0;
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
          availableStock: inventoryItem.stock,
          shortfallQty,
          needByDate: this.resolveNeedByDate(project.startDate),
          lastPurchaseRate: inventoryItem.buyPrice,
        });
      });
    });

    return rows.sort((a, b) => b.shortfallQty - a.shortfallQty);
  }

  private getRequiredItems(
    project: Project,
    getProjectQuotation: (projectId: string) => Quotation | undefined,
    getInventoryPresetById: (presetId: string) => InventoryPreset | undefined,
  ): RequirementSeed[] {
    const quotation = getProjectQuotation(project.id);
    const presetFromQuotation = quotation?.presetSnapshot?.map((item) => ({
      inventoryItemId: item.id,
      name: item.name,
      quantity: item.quantity,
    }));

    const presetFromProject = project.presetId
      ? getInventoryPresetById(project.presetId)?.items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          name: item.name,
          quantity: item.quantity,
        }))
      : undefined;

    return presetFromQuotation || presetFromProject || [];
  }

  private resolveNeedByDate(projectStartDate: string): string {
    if (!projectStartDate) {
      return format(new Date(), "yyyy-MM-dd");
    }
    return format(new Date(new Date(projectStartDate).getTime() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  }
}
