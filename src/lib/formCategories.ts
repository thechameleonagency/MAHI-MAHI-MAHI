/** Centralized category options for inventory / vendors / tools (UA11). */

/** Tool registry categories (slug `value` stored on `Tool.category`). */
export const TOOL_CATEGORY_SELECT_ITEMS = [
  { value: "power-tool", label: "Power Tool" },
  { value: "hand-tool", label: "Hand Tool" },
  { value: "measuring-tool", label: "Measuring Tool" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "machinery", label: "Machinery" },
  { value: "digging-tool", label: "Digging Tool" },
  { value: "others", label: "Others" },
] as const;

/** Display / filter order for material inventory categories (includes legacy seed labels). */
export const MATERIAL_CATEGORY_ORDER = [
  "Structure",
  "Panel/Module",
  "Panel",
  "Panels",
  "Inverter",
  "Inverters",
  "Wiring",
  "Earthing",
  "Meter",
  "Cable",
  "Electrical",
  "Civil",
  "BOS",
  "Consumable",
  "Service",
  "Other",
] as const;

export function materialCategorySortKey(a: string, b: string): number {
  const ia = MATERIAL_CATEGORY_ORDER.indexOf(a as (typeof MATERIAL_CATEGORY_ORDER)[number]);
  const ib = MATERIAL_CATEGORY_ORDER.indexOf(b as (typeof MATERIAL_CATEGORY_ORDER)[number]);
  const ra = ia === -1 ? MATERIAL_CATEGORY_ORDER.length : ia;
  const rb = ib === -1 ? MATERIAL_CATEGORY_ORDER.length : ib;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

export const VENDOR_CATEGORY_OPTIONS = [
  "Panels",
  "Inverters",
  "Batteries",
  "Structure",
  "Cables",
  "Tools",
  "Civil",
  "Transport",
  "Other",
] as const;

export const TOOL_CATEGORY_OPTIONS = [
  "Hand Tools",
  "Power Tools",
  "Measuring",
  "Safety",
  "Lifting",
  "Electrical",
  "Other",
] as const;

export const MATERIAL_CATEGORY_OPTIONS = [
  "Panel",
  "Inverter",
  "Structure",
  "Cable",
  "Electrical",
  "Civil",
  "Consumable",
  "Service",
  "Other",
] as const;

export const CANONICAL_GST_RATES = [0, 5, 12, 18, 28] as const;

export function validateGstin(gstin: string): { ok: boolean; error?: string } {
  const g = gstin.trim().toUpperCase();
  if (!g) return { ok: true };
  if (g.length !== 15) return { ok: false, error: "GSTIN must be 15 characters." };
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
    return { ok: false, error: "GSTIN format is invalid." };
  }
  return { ok: true };
}
