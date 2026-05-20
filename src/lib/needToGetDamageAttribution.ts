import type { MaterialDamage } from "@/types/operations";

export type DamageQtyIndex = {
  totalByItem: Map<string, number>;
  projectByItem: Map<string, Map<string, number>>;
};

export function buildDamageQtyIndex(records: MaterialDamage[]): DamageQtyIndex {
  const totalByItem = new Map<string, number>();
  const projectByItem = new Map<string, Map<string, number>>();
  for (const record of records) {
    const itemId = String(record.itemId);
    totalByItem.set(itemId, (totalByItem.get(itemId) ?? 0) + record.qty);
    if (record.projectId) {
      let byProject = projectByItem.get(itemId);
      if (!byProject) {
        byProject = new Map();
        projectByItem.set(itemId, byProject);
      }
      byProject.set(record.projectId, (byProject.get(record.projectId) ?? 0) + record.qty);
    }
  }
  return { totalByItem, projectByItem };
}

export type DamageShortfallAttribution = {
  shortfallIncludesDamage: boolean;
  damageQtyAttributed: number;
};

/**
 * Compare shortfall against stock with vs without damage write-offs already applied to `item.stock`.
 */
export function attributeDamageToShortfall(params: {
  requiredQty: number;
  effectiveStock: number;
  totalDamageQty: number;
  projectDamageQty: number;
}): DamageShortfallAttribution {
  const { requiredQty, effectiveStock, totalDamageQty, projectDamageQty } = params;
  if (totalDamageQty <= 0 || requiredQty <= effectiveStock) {
    return { shortfallIncludesDamage: false, damageQtyAttributed: 0 };
  }
  const shortfallActual = requiredQty - effectiveStock;
  const stockBeforeDamage = effectiveStock + totalDamageQty;
  const shortfallWithoutDamage = Math.max(0, requiredQty - stockBeforeDamage);
  const includesDamage = shortfallWithoutDamage < shortfallActual;
  const damageQtyAttributed = includesDamage
    ? projectDamageQty > 0
      ? projectDamageQty
      : totalDamageQty
    : 0;
  return { shortfallIncludesDamage: includesDamage, damageQtyAttributed };
}
