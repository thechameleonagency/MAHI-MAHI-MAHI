import type { PartnerTransaction } from "@/types/finance";
import type { Project, ProjectPartner } from "@/types/project";

/** Derives expected partner share from actual project profit. */
export function expectedPartnerProfitShare(params: {
  profitSharePercent: number;
  documentedRevenue: number;
  attributedCost: number;
}): number {
  const profit = Math.max(0, params.documentedRevenue - params.attributedCost);
  return profit * (params.profitSharePercent / 100);
}

export function calculateProjectProfit(project: Pick<Project, "contractAmount" | "totalCost">): number {
  return (project.contractAmount || 0) - (project.totalCost || 0);
}

export function calculateProjectPartnerEarning(
  project: Pick<Project, "contractAmount" | "totalCost" | "mssBackendAmount" | "partnerCustomerSellAmount">,
  partner: ProjectPartner,
): number {
  if (partner.calculatedEarning != null) return partner.calculatedEarning;

  if (partner.partnerType === "profit") {
    const percentage = partner.sharePercentage ?? partner.profitSharePercent ?? 0;
    return Math.max(0, calculateProjectProfit(project)) * (percentage / 100);
  }

  if (partner.partnerType === "fixed") {
    if (partner.fixedAmount != null) return partner.fixedAmount;
    if (project.mssBackendAmount != null) {
      const sellAmount = project.partnerCustomerSellAmount ?? project.contractAmount ?? 0;
      return Math.max(0, sellAmount - project.mssBackendAmount);
    }
  }

  return 0;
}

export function calculateProjectVendorshipFee(partner: ProjectPartner): number {
  return partner.partnerType === "vendorship" ? partner.feeAmount ?? 0 : 0;
}

export function partnerProjectLabel(partner?: ProjectPartner): string {
  if (!partner) return "Solo";
  if (partner.partnerType === "profit") {
    return `Profit partner${partner.sharePercentage != null ? ` (${partner.sharePercentage}%)` : ""}`;
  }
  if (partner.partnerType === "fixed") return "Fixed share partner";
  if (partner.partnerType === "vendorship") return "Vendorship partner";
  return "Partner";
}

export function isPartnerCreditTransaction(transaction: PartnerTransaction): boolean {
  if (transaction.direction === "given") return true;
  return (
    transaction.type === "Given to Partner" ||
    transaction.type === "Profit Payment" ||
    transaction.type === "Customer Paid Partner"
  );
}

export function isPartnerDebitTransaction(transaction: PartnerTransaction): boolean {
  if (transaction.direction === "received") return true;
  return transaction.type === "Received from Partner" || transaction.type === "Vendorship Fee";
}
