import type { AppState } from "@/contexts/AppDataContext";

/**
 * Prototype data architecture (MD9):
 *
 * - **Canonical store:** `mahi_solar_app_data` via `AppDataContext` / `readPersistedAppState`.
 * - **Command-bus mirrors:** `mss.repo.*` JSON repos — scratch copies for handlers only.
 * - **Single-writer:** UI and CRUD mutate `AppState` first; mirrors are refreshed from that
 *   snapshot before every command, immediately after every AppState commit (AR1), and on persist /
 *   cross-tab reload.
 *
 * Slices listed in `APP_STATE_CONTEXT_ONLY_SLICES` have no mirror; command handlers
 * must not read them from localStorage repos (use in-memory state merged after commands).
 */

export const PROTOTYPE_REPOSITORY_STORAGE_KEYS = {
  projects: "mss.repo.projects",
  quotations: "mss.repo.quotations",
  enquiries: "mss.repo.enquiries",
  customers: "mss.repo.customers",
  invoices: "mss.repo.invoices",
  employees: "mss.repo.employees",
  inventoryItems: "mss.repo.inventoryItems",
  auditLogs: "mss.repo.auditLogs",
  sites: "mss.repo.sites",
  tasks: "mss.repo.tasks",
  vendors: "mss.repo.vendors",
} as const;

export type PrototypeRepositoryKey = keyof typeof PROTOTYPE_REPOSITORY_STORAGE_KEYS;

/** Mirrors refreshed by `syncPrototypeRepositoriesFromAppState`. */
export const PROTOTYPE_REPOSITORY_MIRROR_SLICES: readonly {
  key: PrototypeRepositoryKey;
  select: (state: AppState) => unknown[];
}[] = [
  { key: "projects", select: (s) => s.projects },
  { key: "quotations", select: (s) => s.quotations },
  { key: "enquiries", select: (s) => s.enquiries },
  { key: "customers", select: (s) => s.customers },
  { key: "invoices", select: (s) => [...s.invoices, ...s.saleBills] },
  { key: "employees", select: (s) => s.employees },
  { key: "inventoryItems", select: (s) => s.inventoryItems },
  { key: "auditLogs", select: (s) => s.auditLogs },
  { key: "sites", select: (s) => s.sites },
  { key: "tasks", select: (s) => s.tasks },
  { key: "vendors", select: (s) => s.vendors },
];

/** Maps manifest keys to `AppRepositoryContext` property names (shared by sync + drift checks). */
export const PROTOTYPE_REPOSITORY_CONTEXT_MAP: Record<
  PrototypeRepositoryKey,
  keyof import("@/infrastructure/repositories/contracts").AppRepositoryContext
> = {
  projects: "projectRepository",
  quotations: "quotationRepository",
  enquiries: "enquiryRepository",
  customers: "customerRepository",
  invoices: "invoiceRepository",
  employees: "employeeRepository",
  inventoryItems: "inventoryItemRepository",
  auditLogs: "auditRepository",
  sites: "siteRepository",
  tasks: "taskRepository",
  vendors: "vendorRepository",
};

/**
 * AppState collections with no `mss.repo.*` mirror (finance / ledger slices).
 */
export const APP_STATE_CONTEXT_ONLY_SLICES = [
  "vendorBills",
  "vendorPayments",
  "payments",
  "expenses",
  "incomes",
  "agents",
  "partners",
  "partnerTransactions",
  "loans",
  "blockages",
  "materialReservations",
  "procurementNeedLines",
] as const;

const REPO_KEY_PREFIX = "mss.repo.";

export function isPrototypeRepositoryStorageKey(key: string | null): boolean {
  if (!key) return false;
  return key.startsWith(REPO_KEY_PREFIX);
}
