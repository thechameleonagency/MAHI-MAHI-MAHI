import type { VendorshipCompanyTransaction } from "@/types/finance";
import type { Project } from "@/types/project";

export function vendorshipTransactionSignedAmount(tx: VendorshipCompanyTransaction): number {
  return tx.type === "collection" ? tx.amount : -Math.abs(tx.amount);
}

export function sumVendorshipCollections(transactions: VendorshipCompanyTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + vendorshipTransactionSignedAmount(tx), 0);
}

export function deriveVendorshipCompanyEconomics(
  companyId: string,
  projects: Project[],
  transactions: VendorshipCompanyTransaction[],
) {
  const linked = projects.filter((p) => p.scope?.vendorshipCompanyId === companyId);
  const companyTxns = transactions.filter((t) => t.vendorshipCompanyId === companyId);
  const toCollect = linked.reduce(
    (sum, p) => sum + (p.scope?.vendorshipFeeAmount ?? p.vendorshipFeeReceivable ?? 0),
    0,
  );
  const collected = sumVendorshipCollections(companyTxns);
  return {
    linkedProjectCount: linked.length,
    toCollect,
    collected,
    pending: Math.max(0, toCollect - collected),
  };
}
