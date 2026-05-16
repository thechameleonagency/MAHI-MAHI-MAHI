import type { AnalyticsSlices, MetricRow } from "./types";

export interface InventoryMetrics {
  stockValueCost: number;
  stockValueSale: number;
  reservationQty: number;
  onHandUnits: number;
  slowMoverCount: number;
  summaryRows: MetricRow[];
}

export function computeInventoryMetrics(slices: AnalyticsSlices): InventoryMetrics {
  const { inventoryItems, materialReservations = [] } = slices;

  let stockValueCost = 0;
  let stockValueSale = 0;
  let onHandUnits = 0;
  let slowMoverCount = 0;

  for (const item of inventoryItems) {
    const stock = item.stock ?? 0;
    onHandUnits += stock;
    stockValueCost += stock * (item.buyPrice ?? 0);
    stockValueSale += stock * (item.salePrice ?? 0);
    if (stock > 0 && stock <= (item.minStock ?? 5)) slowMoverCount++;
  }

  const reservationQty = materialReservations
    .filter((r) => !r.releasedAt)
    .reduce((s, r) => s + r.qty, 0);

  const summaryRows: MetricRow[] = [
    { label: "Stock value (cost)", value: Math.round(stockValueCost) },
    { label: "Stock value (sale)", value: Math.round(stockValueSale) },
    { label: "On-hand units", value: onHandUnits },
    { label: "Reserved qty", value: reservationQty },
    { label: "Low / slow SKUs", value: slowMoverCount },
  ];

  return {
    stockValueCost,
    stockValueSale,
    reservationQty,
    onHandUnits,
    slowMoverCount,
    summaryRows,
  };
}
