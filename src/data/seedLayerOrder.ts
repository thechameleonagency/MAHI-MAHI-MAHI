/**
 * Ordered seed / smoke layers (Z-phase + D1 provenance).
 * Each layer must be applied only after `dependsOn` layers exist in storage.
 * After inserting a layer in the DB, run smoke on `smokeRoutes` before moving on.
 */
export type SeedLayerId =
  | "L0_auth_settings"
  | "L1_masters_catalog"
  | "L2_partners_agents_vendors"
  | "L3_customers"
  | "L4_employees_teams"
  | "L5_projects_sites"
  | "L6_attendance_tasks"
  | "L7_inventory_movements"
  | "L8_quotations_enquiries"
  | "L9_finance_documents"
  | "L10_loans_partner_cash"
  | "L11_audit_logs";

export interface SeedLayer {
  id: SeedLayerId;
  label: string;
  /** Human-readable provenance: what must already exist. */
  dependsOn: SeedLayerId[];
  /** Routes to open after seeding this layer (manual smoke). */
  smokeRoutes: string[];
}

export const SEED_LAYERS: readonly SeedLayer[] = [
  {
    id: "L0_auth_settings",
    label: "Session + company/profile settings",
    dependsOn: [],
    smokeRoutes: ["/settings"],
  },
  {
    id: "L1_masters_catalog",
    label: "Inventory catalog, templates, HSN/SAC masters",
    dependsOn: ["L0_auth_settings"],
    smokeRoutes: ["/inventory/materials", "/templates"],
  },
  {
    id: "L2_partners_agents_vendors",
    label: "Partners, agents, vendors",
    dependsOn: ["L0_auth_settings"],
    smokeRoutes: ["/partners", "/agents", "/vendors"],
  },
  {
    id: "L3_customers",
    label: "Customers",
    dependsOn: ["L0_auth_settings"],
    smokeRoutes: ["/customers"],
  },
  {
    id: "L4_employees_teams",
    label: "Employees + teams (HR base)",
    dependsOn: ["L0_auth_settings"],
    smokeRoutes: ["/employees", "/teams"],
  },
  {
    id: "L5_projects_sites",
    label: "Projects + installation sites + checklists",
    dependsOn: ["L3_customers", "L4_employees_teams", "L2_partners_agents_vendors"],
    smokeRoutes: ["/projects", "/active-sites"],
  },
  {
    id: "L6_attendance_tasks",
    label: "Attendance + site tasks (requires employees + projects)",
    dependsOn: ["L4_employees_teams", "L5_projects_sites"],
    smokeRoutes: ["/attendance", "/projects"],
  },
  {
    id: "L7_inventory_movements",
    label: "Materials sent / site issues (requires inventory + projects)",
    dependsOn: ["L1_masters_catalog", "L5_projects_sites"],
    smokeRoutes: ["/inventory/materials", "/materials"],
  },
  {
    id: "L8_quotations_enquiries",
    label: "Enquiries + quotations",
    dependsOn: ["L3_customers", "L2_partners_agents_vendors"],
    smokeRoutes: ["/enquiries", "/quotations"],
  },
  {
    id: "L9_finance_documents",
    label: "Invoices, expenses, income, payments",
    dependsOn: ["L5_projects_sites", "L3_customers", "L1_masters_catalog"],
    smokeRoutes: ["/invoices", "/finance"],
  },
  {
    id: "L10_loans_partner_cash",
    label: "Loans, partner flows, owner movements",
    dependsOn: ["L5_projects_sites", "L2_partners_agents_vendors"],
    smokeRoutes: ["/loans", "/partners", "/finance"],
  },
  {
    id: "L11_audit_logs",
    label: "Audit log rows tied to real entities above",
    dependsOn: ["L9_finance_documents", "L5_projects_sites"],
    smokeRoutes: ["/audit/logs", "/audit"],
  },
] as const;

/** D1: ordered IDs for programmatic seed application. */
export const SEED_LAYER_ORDER: SeedLayerId[] = SEED_LAYERS.map((l) => l.id);
