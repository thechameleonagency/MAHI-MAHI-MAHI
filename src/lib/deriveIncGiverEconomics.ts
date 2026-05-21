import { filterProjectsForIncGiverCompany } from "@/lib/incGiverProjectLink";
import type { INCGiverTransaction } from "@/types/finance";
import type { INCGiverCompany } from "@/types/finance";
import type { Project } from "@/types/project";

export function incGiverTransactionSignedAmount(tx: INCGiverTransaction): number {
  return tx.type === "collection" ? tx.amount : -Math.abs(tx.amount);
}

export function sumIncGiverCollections(transactions: INCGiverTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + incGiverTransactionSignedAmount(tx), 0);
}

export type IncGiverCompanyEconomics = {
  linkedProjectCount: number;
  completedProjectCount: number;
  toCollect: number;
  collected: number;
  pending: number;
};

export function deriveIncGiverCompanyEconomics(
  companyId: string,
  projects: Project[],
  transactions: INCGiverTransaction[],
  companies: INCGiverCompany[],
): IncGiverCompanyEconomics {
  const linked = filterProjectsForIncGiverCompany(projects, companyId, companies);
  const companyTxns = transactions.filter((t) => t.incGiverCompanyId === companyId);
  const toCollect = linked.reduce((sum, p) => sum + (p.contractAmount || 0), 0);
  const collected = sumIncGiverCollections(companyTxns);
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
    toCollect,
    collected,
    pending: Math.max(0, toCollect - collected),
  };
}

export function deriveIncGiverProjectCollected(
  projectId: string,
  transactions: INCGiverTransaction[],
): number {
  return sumIncGiverCollections(transactions.filter((t) => t.projectId === projectId));
}
