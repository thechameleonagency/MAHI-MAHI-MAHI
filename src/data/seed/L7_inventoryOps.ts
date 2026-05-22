import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import { countFor, pushAudit } from "./seedHelpers";
import { seedIncludesProjects } from "./seedProjectPhase";

/** L7 — tools + supplemental inventory + procurement lines (catalog seeded in L1). */
export function buildL7InventoryOps(state: AppState, profile: SeedProfile): AppState {
  const extra = countFor(profile, 10);
  state.inventoryItems.push(
    ...Array.from({ length: extra }, (_, i) => ({
      id: seedId(SEED_ID_PREFIX.inventory),
      name: `Consumable Item ${i + 1}`,
      category: "Consumables",
      stock: 5 + i,
      unit: "pcs",
      buyPrice: 100 + i * 20,
      salePrice: 150 + i * 25,
      value: (100 + i * 20) * (5 + i),
      hsn: "85369090",
      minStock: 10,
      alert: i % 3 === 0,
      movementHistory: [],
    })),
  );

  const toolCount = countFor(profile, 18);
  const statuses = ["In Use", "Available", "Under Repair", "Retired"] as const;
  const conditions = ["Good", "Fair", "Poor", "Damaged"] as const;
  state.tools = Array.from({ length: toolCount }, (_, i) => {
    const emp = state.employees[i % state.employees.length];
    const site = state.sites[i % Math.max(1, state.sites.length)];
    return {
      id: seedId(SEED_ID_PREFIX.tool),
      name: ["Digital Multimeter", "Hydraulic Crimping Tool", "Torque Wrench Set", "Drill Machine", "Safety Harness", "Laser Level", "Cable Puller", "Heat Gun"][i % 8],
      assignedTo: emp?.name ?? "Shop",
      assignedToEmployeeId: i % 4 !== 3 ? emp?.id : undefined,
      site: site?.name ?? "Main Warehouse",
      assignedToSiteId: site?.id,
      status: statuses[i % 4],
      condition: conditions[i % 4],
      category: "Hand Tools",
      purchaseRate: 2500 + i * 500,
      purchaseDate: seedDayAt(0.02 + i * 0.005).slice(0, 10),
      lastUpdated: seedDayAt(0.5 + i * 0.01),
      movementHistory: i % 2 === 0 ? [{
        id: seedId("TMV"),
        type: "issue" as const,
        siteId: site?.id,
        siteName: site?.name,
        date: seedDayAt(0.3 + i * 0.01),
        employeeId: emp?.id,
        employeeName: emp?.name,
        createdAt: seedDayAt(0.3 + i * 0.01),
      }] : [],
    };
  });

  if (!seedIncludesProjects()) {
    pushAudit(state, {
      action: "create",
      entityType: "InventoryItem",
      entityId: state.inventoryItems[0]?.id ?? "",
      entityName: state.inventoryItems[0]?.name ?? "",
      fraction: 0.4,
      role: "admin",
    });
    return state;
  }

  // Procurement need lines for shortfall scenarios
  const projects = state.projects.filter((p) => p.lifecycleStatus === "In Progress").slice(0, countFor(profile, 15));
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const site = state.sites.find((s) => s.projectId === project.id);
    const item = state.inventoryItems[i % state.inventoryItems.length];
    if (!site || !item) continue;
    state.procurementNeedLines.push({
      id: seedId(SEED_ID_PREFIX.procurement),
      lineKey: `${project.id}|${site.id}|${item.id}|${seedDayAt(0.6 + i * 0.01)}`,
      projectId: project.id,
      siteId: site.id,
      materialId: item.id,
      materialName: item.name,
      qtyNeeded: 5 + i,
      needByDate: seedDayAt(0.65 + i * 0.01),
      lastPurchaseRate: item.buyPrice,
      vendorId: state.vendors[i % state.vendors.length]?.id,
      status: "pending",
    });
  }

  pushAudit(state, {
    action: "create",
    entityType: "InventoryItem",
    entityId: state.inventoryItems[0]?.id ?? "",
    entityName: state.inventoryItems[0]?.name ?? "",
    fraction: 0.4,
    role: "admin",
  });

  return state;
}
