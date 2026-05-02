import type { InventoryItem, SiteChecklistItem, SiteRecord } from "@/types/project";
import type { SiteChecklistTemplate } from "@/types/templates";
import type { SiteChecklistPreset } from "@/data/masters";

/** Marks checklist lines whose `inventoryItemId` is absent from `inventoryItems`. */
export function findUnknownChecklistInventoryIds(
  checklistItems: SiteChecklistItem[] | undefined,
  inventoryItems: InventoryItem[],
): number[] {
  const catalog = new Set(inventoryItems.map((i) => i.id));
  const missing: number[] = [];
  for (const line of checklistItems ?? []) {
    if (!line.requiresMaterial || line.inventoryItemId === undefined) continue;
    if (!catalog.has(line.inventoryItemId)) {
      missing.push(line.inventoryItemId);
    }
  }
  return missing;
}

export function buildSiteChecklistFromTemplate(
  template: SiteChecklistTemplate | SiteChecklistPreset,
  idPrefix: string,
): SiteChecklistItem[] {
  const items = "items" in template ? template.items : [];
  return items.map((row: any, idx: number) => ({
    id: `${idPrefix}-chk-${idx + 1}`,
    requiresMaterial: true,
    inventoryItemId: row.inventoryItemId,
    materialName: row.materialName || row.name,
    requiredQuantity: row.requiredQuantity || row.quantity,
    masterPresetId: row.id?.toString(),
  }));
}

/** Apply template lines onto a shallow copy of `site`; does not mutate the input record. */
export function siteWithChecklistFromTemplate(
  site: SiteRecord, 
  template: SiteChecklistTemplate | SiteChecklistPreset
): SiteRecord {
  const prefix =
    `${site.projectId ?? "PX"}${typeof site.id === "number" ? `S${site.id}` : site.id}`;
  const checklistItems = buildSiteChecklistFromTemplate(template, prefix);
  
  return {
    ...site,
    checklistItems,
    presetId: template.id,
  };
}
