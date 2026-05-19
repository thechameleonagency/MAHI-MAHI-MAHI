import { describe, expect, it } from "vitest";
import { findByRouteId } from "@/lib/resolveEntityId";
import type { InventoryItem } from "@/types/project";

describe("inventoryMovementStringIds", () => {
  const items: InventoryItem[] = [
    {
      id: "INV001",
      name: "Test panel",
      category: "Panels",
      stock: 10,
      unit: "Nos",
      minStock: 2,
      value: 100,
      buyPrice: 80,
      salePrice: 120,
      hsn: "8541",
      alert: false,
    },
  ];

  it("resolves INV001 route id with string equality", () => {
    const found = findByRouteId(items, "INV001");
    expect(found?.id).toBe("INV001");
    expect(found?.stock).toBe(10);
  });

  it("does not match numeric coercion (INV001 vs 1)", () => {
    expect(findByRouteId(items, "1")).toBeUndefined();
  });

  it("trims whitespace in route ids", () => {
    expect(findByRouteId(items, " INV001 ")?.id).toBe("INV001");
  });
});
