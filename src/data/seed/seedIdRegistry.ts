import { createId, createNextCustomerId } from "@/lib/idFactory";

/** Appendix O — entity id prefixes for seed allocation. */
export const SEED_ID_PREFIX = {
  project: "P-",
  quotation: "Q",
  customer: "CUST-",
  enquiry: "ENQ",
  invoice: "INV",
  saleBill: "SB",
  payment: "PAY",
  cpr: "CPR",
  expense: "EXP",
  income: "INC",
  employee: "EMP",
  vendor: "VND",
  vendorBill: "VB",
  vendorPayment: "VP",
  tool: "TOOL",
  inventory: "ITEM",
  site: "SITE",
  team: "TEAM",
  teamAssignment: "TA",
  partner: "PRT",
  partnerTx: "PTX",
  agent: "AGT",
  accrual: "ACA",
  commissionPay: "ACP",
  loan: "LOAN",
  loanRepayment: "LR",
  ownerInvestment: "OI",
  task: "TASK",
  blockage: "BLK",
  ticket: "TCK",
  auditLog: "LOG",
  voucher: "VCH-",
  reviewQueue: "ARQ",
  bankStatement: "BRS",
  reservation: "MR",
  installation: "SI",
  siteVisit: "SV",
  changeRequest: "PCR",
  damage: "MD",
  procurement: "PNL",
  payroll: "PR",
  wallet: "EWL",
  paidHoliday: "PH",
  quoteTemplate: "QT",
  checklistTemplate: "SCT",
  solarPreset: "SPP",
  visibilityPreset: "QVP",
  servicePreset: "SP",
  settingsTeam: "STM",
  vendorshipCo: "VSC",
  incGiver: "IGC",
  incGiverTx: "IGT",
  attendance: "ATT",
  deletionRequest: "DR-",
  quotationShare: "QSH-",
} as const;

export type SeedIdPrefix = (typeof SEED_ID_PREFIX)[keyof typeof SEED_ID_PREFIX];

export function seedId(prefix: SeedIdPrefix | string): string {
  return createId(prefix);
}

export function seedCustomerId(existing: Iterable<string>): string {
  return createNextCustomerId(existing);
}
