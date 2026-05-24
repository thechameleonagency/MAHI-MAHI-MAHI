import { computeSiteLedgerBalance } from "@/domain/inventory/siteLedger";
import type { InventoryItem, Project } from "@/types/project";

export type ReturnableSiteMaterialRow = {
  itemId: string;
  itemName: string;
  unit: string;
  balance: number;
  allowDecimalReturn?: boolean;
};

/** Materials still on site for a project (positive site ledger balance). */
export function getReturnableMaterialsForProject(
  project: Project | undefined,
  inventoryItems: InventoryItem[],
): ReturnableSiteMaterialRow[] {
  if (!project?.siteMaterialLedger?.length) return [];

  const rows: ReturnableSiteMaterialRow[] = [];
  for (const entry of project.siteMaterialLedger) {
    const balance = computeSiteLedgerBalance({
      materialId: Number(entry.itemId) || 0,
      openingQty: entry.openingQty,
      issuedQty: entry.issuedQty,
      returnedQty: entry.returnedQty,
      scrapAtSiteQty: entry.scrapAtSiteQty,
      consumedQty: entry.consumedQty,
    });
    if (balance <= 0) continue;

    const inv = inventoryItems.find((i) => String(i.id) === String(entry.itemId));
    const name = inv?.size ? `${inv.name} (${inv.size})` : inv?.name ?? `Item ${entry.itemId}`;
    rows.push({
      itemId: String(entry.itemId),
      itemName: name,
      unit: inv?.unit ?? "pcs",
      balance,
      allowDecimalReturn: inv?.allowDecimalReturn,
    });
  }

  return rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export function validateReturnQuantityInput(
  raw: string,
  balance: number,
  allowDecimal?: boolean,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const qty = Number.parseFloat(trimmed);
  if (!Number.isFinite(qty) || qty <= 0) return "Enter a quantity greater than zero";
  if (!allowDecimal && !Number.isInteger(qty)) return "Whole units only for this item";
  if (qty > balance + 0.0001) return `Maximum returnable: ${balance}`;
  return null;
}
