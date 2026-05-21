import type { NarrativeApply } from "./shared";

export const applyLowStockProcurement: NarrativeApply = (state) => {
  const item = state.inventoryItems.find((i) => i.name.includes("6sqmm")) ?? state.inventoryItems[0];
  if (!item) return;
  item.stock = Math.max(1, item.minStock - 8);
  item.alert = true;
};
