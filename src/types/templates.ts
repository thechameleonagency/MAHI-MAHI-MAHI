import type { InventoryPresetItem } from "@/types/project";

export type TemplateCapacitySegment = "residential" | "commercial" | "industrial" | "custom";

export interface QuotationTemplateServiceLine {
  description: string;
  sac: string;
  rate: number;
  gstRate: number;
}

/** Sales-facing boilerplate: materials (catalog) + service lines. */
export interface QuotationTemplate {
  id: string;
  name: string;
  segment: TemplateCapacitySegment;
  panelBrand?: string;
  panelWattage?: number;
  inverterCapacity?: string;
  structureType?: string;
  materialItems: InventoryPresetItem[];
  services: QuotationTemplateServiceLine[];
  createdAt: string;
}

/** Optional rich BOM line (categories, sizes, rates) used by Solar package subtype. */
export interface SiteChecklistTemplateBomLine {
  id: string;
  category: string;
  materialName: string;
  size?: string;
  quantity: number;
  rate: number;
  unit: string;
}

/**
 * Site dispatch template: materials and quantities only (simple form),
 * with optional rich solar-package metadata for the "Solar package" subtype.
 *
 * Replaces the deprecated `InventoryPreset` type; the rich fields below
 * migrated from the old `/presets` page after the Templates merge.
 */
export interface SiteChecklistTemplate {
  id: string;
  name: string;
  segment: TemplateCapacitySegment;
  items: InventoryPresetItem[];
  createdAt: string;
  /** "solar_package" enables the rich solar metadata + BOM table; defaults to "generic". */
  subtype?: "generic" | "solar_package";
  capacityKW?: number;
  panelBrand?: string;
  panelWattage?: number;
  panelCount?: number;
  inverterBrand?: string;
  inverterCapacity?: string;
  structureType?: string;
  estimatedCost?: number;
  /** Detailed BOM with categories/sizes/rates (rich solar-package layout). */
  materialsBom?: SiteChecklistTemplateBomLine[];
}
