import type { InventoryPresetItem } from "@/types/project";

export type TemplateCapacitySegment = "residential" | "commercial" | "industrial";

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

/** Site dispatch template: materials and quantities only (no pricing). */
export interface SiteChecklistTemplate {
  id: string;
  name: string;
  segment: TemplateCapacitySegment;
  items: InventoryPresetItem[];
  createdAt: string;
}
