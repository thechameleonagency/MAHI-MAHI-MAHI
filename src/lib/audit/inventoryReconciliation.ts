import type { InventoryItem } from "@/types/project";
import type { MaterialDamage } from "@/types/operations";

export interface InventoryMovementSummary {
  purchases: number;
  issues: number;
  damage: number;
  returns: number;
  closingUnits: number;
  closingValue: number;
}

/** Prototype reconciliation from movement history + damage records (per item name). */
export function summarizeInventoryMovements(
  items: InventoryItem[],
  damageRecords: MaterialDamage[],
): InventoryMovementSummary {
  let purchases = 0;
  let issues = 0;
  let damage = 0;
  let returns = 0;

  for (const item of items) {
    for (const m of item.movementHistory ?? []) {
      const t = m.type?.toLowerCase() ?? "";
      const q = Math.abs(m.quantity ?? 0);
      if (t.includes("purchase") || t.includes("in")) purchases += q;
      else if (t.includes("issue") || t.includes("consumption")) issues += q;
      else if (t.includes("return")) returns += q;
      else if (t.includes("damage") || t.includes("scrap")) damage += q;
    }
  }

  for (const d of damageRecords) {
    damage += d.qty;
  }

  const closingUnits = items.reduce((s, i) => s + (i.stock ?? 0), 0);
  const closingValue = items.reduce((s, i) => s + (i.stock ?? 0) * (i.buyPrice ?? 0), 0);

  return { purchases, issues, damage, returns, closingUnits, closingValue };
}
