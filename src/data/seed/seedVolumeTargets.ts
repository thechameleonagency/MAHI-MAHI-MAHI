import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { scaleCount } from "./seedLayerOrder";
import { isProjectClearedZeroMinimum, seedIncludesProjects } from "./seedProjectPhase";

/** §4 minimum row counts for `full` profile (Appendix J). */
export const FULL_PROFILE_MINIMUMS: Partial<Record<keyof AppState, number>> = {
  projects: 28,
  quotations: 35,
  customers: 30,
  invoices: 35,
  saleBills: 15,
  expenses: 60,
  incomes: 15,
  payments: 40,
  enquiries: 40,
  agents: 8,
  employees: 12,
  teams: 4,
  attendanceRecords: 400,
  tasks: 120,
  partners: 6,
  partnerTransactions: 20,
  loans: 8,
  loanRepayments: 30,
  vendors: 10,
  inventoryItems: 25,
  tools: 15,
  vendorBills: 25,
  vendorPayments: 20,
  quotationTemplates: 5,
  siteChecklistTemplates: 5,
  servicePresets: 4,
  quotationVisibilityPresets: 3,
  sites: 20,
  holidays: 8,
  blockages: 15,
  operationalTickets: 10,
  clientPaymentRecords: 40,
  ownerInvestments: 5,
  auditLogs: 240,
  accountingVouchers: 40,
  accountingReviewQueue: 10,
  agentCommissionPayments: 15,
  employeePayrollRecords: 12,
  employeeWalletLedger: 25,
  solarPackagePresets: 3,
  settingsTeamMembers: 6,
  vendorshipCompanies: 4,
  incGiverCompanies: 3,
  incGiverTransactions: 8,
  bankReconciliationStatements: 6,
  materialReservations: 20,
  scheduledInstallations: 20,
  siteVisits: 25,
  projectChangeRequests: 10,
  materialDamageRecords: 8,
  agentCommissionAccruals: 25,
  procurementNeedLines: 30,
};

export function volumeTarget(profile: SeedProfile, key: keyof AppState, fullMin: number): number {
  return scaleCount(profile, fullMin);
}

export function getMinimumFor(profile: SeedProfile, key: keyof AppState): number {
  if (!seedIncludesProjects() && isProjectClearedZeroMinimum(key)) {
    return 0;
  }
  const full = FULL_PROFILE_MINIMUMS[key] ?? 1;
  return profile === "full" ? full : Math.max(1, Math.round(full * 0.3));
}
