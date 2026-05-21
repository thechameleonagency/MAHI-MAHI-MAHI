import type { AppState } from "@/contexts/AppDataContext";

export type SeedProfile = "full" | "smoke";

export type SeedLayerId =
  | "L0_settingsTeam"
  | "L1_catalog"
  | "L2_network"
  | "L3_customers"
  | "L4_hr"
  | "L8_crm"
  | "L5_projectsSites"
  | "L6_attendanceTasks"
  | "L7_inventoryOps"
  | "L9_finance"
  | "L10_capital"
  | "L11_auditBooks"
  | "narratives";

/** Build order per spec dependency graph. */
export const SEED_LAYER_ORDER: SeedLayerId[] = [
  "L0_settingsTeam",
  "L1_catalog",
  "L2_network",
  "L3_customers",
  "L4_hr",
  "L8_crm",
  "L5_projectsSites",
  "L6_attendanceTasks",
  "L7_inventoryOps",
  "L9_finance",
  "L10_capital",
  "L11_auditBooks",
  "narratives",
];

/** Routes exercised in smoke CI profile. */
export const smokeRoutes = [
  "/",
  "/projects",
  "/enquiries",
  "/quotations",
  "/customers",
  "/invoices",
  "/inventory/materials",
  "/finance",
  "/notifications",
  "/settings",
] as const;

export function scaleCount(profile: SeedProfile, fullCount: number): number {
  if (profile === "full") return fullCount;
  return Math.max(1, Math.round(fullCount * 0.3));
}

export type LayerBuilder = (state: AppState, profile: SeedProfile) => AppState;

export const SEED_COLLECTION_KEYS = Object.keys({
  projects: 1,
  quotations: 1,
  customers: 1,
  invoices: 1,
  saleBills: 1,
  expenses: 1,
  incomes: 1,
  payments: 1,
  enquiries: 1,
  agents: 1,
  employees: 1,
  teams: 1,
  attendanceRecords: 1,
  tasks: 1,
  partners: 1,
  partnerTransactions: 1,
  loans: 1,
  loanRepayments: 1,
  vendors: 1,
  inventoryItems: 1,
  tools: 1,
  vendorBills: 1,
  vendorPayments: 1,
  quotationTemplates: 1,
  siteChecklistTemplates: 1,
  servicePresets: 1,
  quotationVisibilityPresets: 1,
  sites: 1,
  holidays: 1,
  blockages: 1,
  operationalTickets: 1,
  projectTimelineByProjectId: 1,
  clientPaymentRecords: 1,
  ownerInvestments: 1,
  employeePaidHolidays: 1,
  auditLogs: 1,
  accountingVouchers: 1,
  accountingReviewQueue: 1,
  agentCommissionPayments: 1,
  employeePayrollRecords: 1,
  employeeWalletLedger: 1,
  solarPackagePresets: 1,
  settingsTeamMembers: 1,
  vendorshipCompanies: 1,
  incGiverCompanies: 1,
  bankReconciliationStatements: 1,
  materialReservations: 1,
  scheduledInstallations: 1,
  siteVisits: 1,
  projectChangeRequests: 1,
  materialDamageRecords: 1,
  agentCommissionAccruals: 1,
  procurementNeedLines: 1,
}) as (keyof AppState)[];
