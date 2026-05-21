import type { InventoryItem } from "@/types/project";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";

const CATALOG_DEF: Omit<InventoryItem, "id" | "movementHistory">[] = [
  { name: "Mono PERC 540W Solar Panel", category: "Panels", stock: 120, unit: "pcs", buyPrice: 13200, salePrice: 14500, value: 13200 * 120, hsn: "85414300", minStock: 20 },
  { name: "Trina 550W Commercial Panel", category: "Panels", stock: 85, unit: "pcs", buyPrice: 12800, salePrice: 13800, value: 12800 * 85, hsn: "85414300", minStock: 15 },
  { name: "Growatt 5kW String Inverter", category: "Inverters", stock: 18, unit: "pcs", buyPrice: 38000, salePrice: 42000, value: 38000 * 18, hsn: "85044090", minStock: 5 },
  { name: "Solis 10kW Three Phase Inverter", category: "Inverters", stock: 8, unit: "pcs", buyPrice: 72000, salePrice: 78000, value: 72000 * 8, hsn: "85044090", minStock: 3 },
  { name: "MS Hot-Dip Structure Leg", category: "Structure", stock: 200, unit: "pcs", buyPrice: 850, salePrice: 1100, value: 850 * 200, hsn: "73089090", minStock: 40 },
  { name: "RCC Flat Roof Mounting Kit", category: "Structure", stock: 25, unit: "set", buyPrice: 18500, salePrice: 22000, value: 18500 * 25, hsn: "73089090", minStock: 5 },
  { name: "Polycab 4sqmm DC Solar Cable", category: "Cables", stock: 450, unit: "m", buyPrice: 42, salePrice: 55, value: 42 * 450, hsn: "85447090", minStock: 100 },
  { name: "Finolex 6sqmm AC Cable", category: "Cables", stock: 3, unit: "m", buyPrice: 68, salePrice: 85, value: 68 * 3, hsn: "85447090", minStock: 50, alert: true },
  { name: "Earthing Rod 16mm Copper", category: "Electrical", stock: 45, unit: "pcs", buyPrice: 1200, salePrice: 1500, value: 1200 * 45, hsn: "74081100", minStock: 10 },
  { name: "MC4 Connector Pair", category: "Electrical", stock: 280, unit: "pcs", buyPrice: 35, salePrice: 50, value: 35 * 280, hsn: "85369090", minStock: 50 },
  { name: "Net Meter Single Phase", category: "Meters", stock: 12, unit: "pcs", buyPrice: 4500, salePrice: 5500, value: 4500 * 12, hsn: "90283019", minStock: 4 },
  { name: "ACDB 63A Distribution Box", category: "Electrical", stock: 22, unit: "pcs", buyPrice: 3200, salePrice: 4000, value: 3200 * 22, hsn: "85371000", minStock: 6 },
  { name: "DCDB 2-String Box", category: "Electrical", stock: 30, unit: "pcs", buyPrice: 2800, salePrice: 3500, value: 2800 * 30, hsn: "85371000", minStock: 8 },
  { name: "Lightning Arrestor Kit", category: "Electrical", stock: 15, unit: "set", buyPrice: 4200, salePrice: 5200, value: 4200 * 15, hsn: "85354000", minStock: 4 },
  { name: "Exide 150Ah Tubular Battery", category: "Batteries", stock: 6, unit: "pcs", buyPrice: 14500, salePrice: 16500, value: 14500 * 6, hsn: "85072000", minStock: 2 },
];

export function buildInventoryCatalog(): InventoryItem[] {
  return CATALOG_DEF.map((item) => ({
    ...item,
    id: seedId(SEED_ID_PREFIX.inventory),
    movementHistory: [{
      id: seedId("MV"),
      type: "purchase" as const,
      qty: item.stock,
      date: seedDayAt(0.05),
      notes: "Opening stock Jan 2026",
      createdAt: seedDayAt(0.05),
    }],
  }));
}

export function findCatalogItem(items: InventoryItem[], hint: string): InventoryItem {
  return items.find((i) => i.name.toLowerCase().includes(hint.toLowerCase())) ?? items[0]!;
}

export function panelItem(items: InventoryItem[]) { return findCatalogItem(items, "540w"); }
export function inverterItem(items: InventoryItem[]) { return findCatalogItem(items, "5kw"); }
export function structureItem(items: InventoryItem[]) { return findCatalogItem(items, "structure leg"); }
export function cableItem(items: InventoryItem[]) { return findCatalogItem(items, "4sqmm"); }
