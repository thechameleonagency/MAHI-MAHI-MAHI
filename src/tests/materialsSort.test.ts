import { describe, expect, it } from "vitest";
import { materialCategorySortKey } from "@/lib/formCategories";
import type { InventoryItem } from "@/types/inventory";

/** Mirrors Materials.tsx table sort — must not throw when category is missing. */
function sortMaterialsLikePage(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    const cat = materialCategorySortKey(a.category ?? "", b.category ?? "");
    if (cat !== 0) return cat;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

describe("Materials inventory sort", () => {
  it("sorts by category then name without throwing when category is undefined", () => {
    const forSort: InventoryItem[] = [
      { id: "1", name: "Zeta Panel", stock: 1, buyPrice: 1, salePrice: 1, unit: "pcs" } as InventoryItem,
      { id: "2", name: "Alpha Cable", category: "Cable", stock: 1, buyPrice: 1, salePrice: 1, unit: "m" } as InventoryItem,
      { id: "3", name: "Beta Panel", category: "Panel", stock: 1, buyPrice: 1, salePrice: 1, unit: "pcs" } as InventoryItem,
    ];

    expect(() => sortMaterialsLikePage(forSort)).not.toThrow();
    const sorted = sortMaterialsLikePage(forSort);
    expect(sorted.map((i) => i.name)).toEqual(["Beta Panel", "Alpha Cable", "Zeta Panel"]);
  });

  it("materialCategorySortKey accepts empty strings for unknown categories", () => {
    expect(materialCategorySortKey("", "Cable")).toBeGreaterThan(0);
    expect(materialCategorySortKey("Cable", "")).toBeLessThan(0);
  });
});
