import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import { countFor, pushAudit } from "./seedHelpers";
import { buildInventoryCatalog } from "./seedInventoryCatalog";

/** L1 — catalog templates and presets. */
export function buildL1Catalog(state: AppState, profile: SeedProfile): AppState {
  const segments = ["residential", "commercial", "industrial", "custom"] as const;
  const templateCount = countFor(profile, 6);
  state.quotationTemplates = Array.from({ length: templateCount }, (_, i) => ({
    id: seedId(SEED_ID_PREFIX.quoteTemplate),
    name: `${["Home", "Office", "Factory", "Farm", "Hospital", "School"][i]} Solar Package Template`,
    segment: segments[i % segments.length],
    panelBrand: ["Waaree", "Trina", "Adani", "Vikram", "RenewSys", "Goldi"][i % 6],
    panelWattage: 540,
    inverterCapacity: `${[3, 5, 10, 25, 50, 100][i % 6]}kW`,
    structureType: "RCC Flat Roof",
    materialItems: [
      { inventoryItemId: "", name: "Mono PERC 540W Panel", quantity: 6 + i, unit: "pcs" },
      { inventoryItemId: "", name: "String Inverter 5kW", quantity: 1, unit: "pcs" },
    ],
    services: [{ description: "Installation & Commissioning", sac: "995462", rate: 25000, gstRate: 18 }],
    createdAt: seedDayAt(0.05 + i * 0.01),
  }));

  state.siteChecklistTemplates = [
    {
      id: seedId(SEED_ID_PREFIX.checklistTemplate),
      name: "Standard Rooftop Solar BOQ",
      segment: "residential" as const,
      subtype: "solar_package" as const,
      capacityKW: 5,
      items: [
        { inventoryItemId: "", name: "Solar Panel 540W", quantity: 10, unit: "pcs" },
        { inventoryItemId: "", name: "String Inverter", quantity: 1, unit: "pcs" },
        { inventoryItemId: "", name: "MS Structure", quantity: 1, unit: "set" },
        { inventoryItemId: "", name: "DC Cable 4sqmm", quantity: 30, unit: "m" },
      ],
      materialsBom: [
        { id: seedId("BOM"), category: "Panel", materialName: "Mono PERC 540W Panel", quantity: 10, rate: 14500, unit: "pcs" },
        { id: seedId("BOM"), category: "Inverter", materialName: "String Inverter 5kW", quantity: 1, rate: 42000, unit: "pcs" },
      ],
      createdAt: seedDayAt(0.06),
    },
    {
      id: seedId(SEED_ID_PREFIX.checklistTemplate),
      name: "Generic Site Checklist",
      segment: "custom" as const,
      subtype: "generic" as const,
      items: [
        { inventoryItemId: "", name: "Site survey checklist", quantity: 1, unit: "set" },
      ],
      createdAt: seedDayAt(0.061),
    },
    {
      id: seedId(SEED_ID_PREFIX.checklistTemplate),
      name: "Commercial 50kW Package",
      segment: "commercial" as const,
      subtype: "solar_package" as const,
      capacityKW: 50,
      items: [
        { inventoryItemId: "", name: "Commercial Panel 550W", quantity: 90, unit: "pcs" },
        { inventoryItemId: "", name: "Central Inverter 50kW", quantity: 1, unit: "pcs" },
      ],
      materialsBom: [
        { id: seedId("BOM"), category: "Panel", materialName: "Commercial Panel 550W", quantity: 90, rate: 13800, unit: "pcs" },
      ],
      createdAt: seedDayAt(0.062),
    },
  ];

  state.servicePresets = [
    {
      id: seedId(SEED_ID_PREFIX.servicePreset),
      name: "Rooftop Installation",
      services: [{ description: "Installation per kW", sac: "995462", rate: 8000, gstRate: 18 }],
      createdAt: seedDayAt(0.065),
    },
    {
      id: seedId(SEED_ID_PREFIX.servicePreset),
      name: "Annual Maintenance",
      services: [{ description: "AMC visit", sac: "998719", rate: 12000, gstRate: 18 }],
      createdAt: seedDayAt(0.066),
    },
    {
      id: seedId(SEED_ID_PREFIX.servicePreset),
      name: "Net Meter Filing Support",
      services: [{ description: "DISCOM filing", sac: "998719", rate: 5000, gstRate: 18 }],
      createdAt: seedDayAt(0.067),
    },
    {
      id: seedId(SEED_ID_PREFIX.servicePreset),
      name: "Structure Fabrication",
      services: [{ description: "MS structure work", sac: "995462", rate: 15000, gstRate: 18 }],
      createdAt: seedDayAt(0.068),
    },
  ];

  const visPresets = [
    { systemDetails: true, materials: true, hideAmounts: false, whatYouGet: true, paymentTerms: true, warranty: true, termsConditions: true },
    { systemDetails: true, materials: false, hideAmounts: true, whatYouGet: true, paymentTerms: true, warranty: false, termsConditions: true },
    { systemDetails: false, materials: true, hideAmounts: false, whatYouGet: false, paymentTerms: true, warranty: true, termsConditions: false },
  ];
  state.quotationVisibilityPresets = visPresets.map((v, i) => ({
    id: seedId(SEED_ID_PREFIX.visibilityPreset),
    name: ["Full disclosure", "Client summary", "Materials-only"][i],
    visibility: v,
    createdAt: seedDayAt(0.07 + i * 0.005),
  }));

  state.solarPackagePresets = [
    {
      id: seedId(SEED_ID_PREFIX.solarPreset),
      name: "3kW Residential Waaree",
      category: "residential" as const,
      capacityKW: 3,
      panelBrand: "Waaree",
      panelWattage: 540,
      panelCount: 6,
      inverterBrand: "Growatt",
      inverterCapacity: "3kW",
      structureType: "Tin Shed Raised",
      estimatedCost: 185000,
    },
    {
      id: seedId(SEED_ID_PREFIX.solarPreset),
      name: "10kW Commercial Trina",
      category: "commercial" as const,
      capacityKW: 10,
      panelBrand: "Trina",
      panelWattage: 550,
      panelCount: 19,
      inverterBrand: "Solis",
      inverterCapacity: "10kW",
      structureType: "RCC Flat Roof",
      estimatedCost: 520000,
    },
    {
      id: seedId(SEED_ID_PREFIX.solarPreset),
      name: "50kW Industrial",
      category: "industrial" as const,
      capacityKW: 50,
      panelBrand: "Adani",
      panelWattage: 545,
      panelCount: 92,
      inverterBrand: "Fronius",
      inverterCapacity: "50kW",
      structureType: "Ground Mount",
      estimatedCost: 2450000,
    },
  ];

  state.inventoryItems = buildInventoryCatalog();

  pushAudit(state, { action: "create", entityType: "QuotationTemplate", entityId: state.quotationTemplates[0]?.id ?? "", entityName: "Catalog seed", fraction: 0.08 });
  return state;
}
