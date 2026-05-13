/** Centralized category options for inventory / vendors / tools (UA11). */

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
