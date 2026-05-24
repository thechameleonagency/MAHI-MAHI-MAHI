import { filterProjectsForSubcontractor } from "@/lib/subcontractorProjectLink";
import type { SubcontractorTransaction } from "@/types/finance";
import type { Project } from "@/types/project";

export function subcontractorTransactionSignedAmount(tx: SubcontractorTransaction): number {
  return tx.type === "payment" ? tx.amount : -Math.abs(tx.amount);
}

export function sumSubcontractorPayments(transactions: SubcontractorTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + subcontractorTransactionSignedAmount(tx), 0);
}

function subcontractorContractAmount(project: Project): number {
  return project.outsource?.total ?? 0;
}

export type SubcontractorEconomics = {
  linkedProjectCount: number;
  completedProjectCount: number;
  contract: number;
  paid: number;
  pending: number;
};

export function deriveSubcontractorEconomics(
  subcontractorId: string,
  projects: Project[],
  transactions: SubcontractorTransaction[],
): SubcontractorEconomics {
  const linked = filterProjectsForSubcontractor(projects, subcontractorId);
  const subcontractorTxns = transactions.filter((t) => t.subcontractorId === subcontractorId);
  const contract = linked.reduce((sum, p) => sum + subcontractorContractAmount(p), 0);
  const paid = sumSubcontractorPayments(subcontractorTxns);
  const completedProjectCount = linked.filter(
    (p) =>
      p.lifecycleStatus === "Completed" ||
      p.lifecycleStatus === "Closed" ||
      p.status === "Completed" ||
      p.status === "Closed",
  ).length;

  return {
    linkedProjectCount: linked.length,
    completedProjectCount,
    contract,
    paid,
    pending: Math.max(0, contract - paid),
  };
}

export function deriveSubcontractorProjectPaid(
  projectId: string,
  transactions: SubcontractorTransaction[],
): number {
  return sumSubcontractorPayments(transactions.filter((t) => t.projectId === projectId));
}
