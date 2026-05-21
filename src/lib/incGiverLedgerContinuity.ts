import type { AppState } from "@/contexts/AppDataContext";
import { getProjectAmountReceived } from "@/lib/billingSelectors";
import { deriveIncGiverProjectCollected } from "@/lib/deriveIncGiverEconomics";
import { resolveIncGiverCompanyIdForProject } from "@/lib/incGiverProjectLink";
import type { INCGiverTransaction } from "@/types/finance";
import type { Project } from "@/types/project";

const DRIFT_EPS = 0.01;

export function isIncGivenProject(project: Project): boolean {
  return project.projectKind === "INC_GIVEN" || project.projectMode === "INC_GIVEN_TO_US";
}

/** Canonical received cash on an INC_GIVEN job: ledger first, else finance inflows. */
export function resolveIncGivenProjectAmountReceived(
  project: Project,
  transactions: INCGiverTransaction[],
  payments: AppState["payments"],
  incomes: AppState["incomes"],
): number {
  const ledger = deriveIncGiverProjectCollected(project.id, transactions);
  if (ledger > DRIFT_EPS) return ledger;
  return getProjectAmountReceived(project.id, payments, incomes);
}

export function syncIncGivenProjectsAmountReceived(state: AppState, projects: Project[]): Project[] {
  const transactions = state.incGiverTransactions ?? [];
  let changed = false;
  const next = projects.map((project) => {
    if (!isIncGivenProject(project)) return project;
    const resolved = resolveIncGivenProjectAmountReceived(
      project,
      transactions,
      state.payments,
      state.incomes,
    );
    if (Math.abs((project.amountReceived ?? 0) - resolved) <= DRIFT_EPS) return project;
    changed = true;
    return { ...project, amountReceived: resolved };
  });
  return changed ? next : projects;
}

export type StaleIncGiverLedger = {
  entity: "project" | "incGiverTransaction" | "incGiverCompany";
  id: string;
  reason:
    | "missing_giver_link"
    | "invalid_giver_customer"
    | "giver_scope_mismatch"
    | "amount_received_drift"
    | "orphan_transaction_giver"
    | "transaction_giver_project_mismatch"
    | "inc_project_without_ledger";
};

export function findStaleIncGiverLedger(state: AppState): StaleIncGiverLedger[] {
  const stale: StaleIncGiverLedger[] = [];
  const companies = state.incGiverCompanies ?? [];
  const companyIds = new Set(companies.map((c) => c.id));
  const transactions = state.incGiverTransactions ?? [];

  for (const project of state.projects) {
    if (!isIncGivenProject(project)) continue;

    const giverId = resolveIncGiverCompanyIdForProject(project, companies);
    if (!giverId) {
      stale.push({ entity: "project", id: project.id, reason: "missing_giver_link" });
      continue;
    }

    const expectedCustomerId = `inc-${giverId}`;
    if (project.customerId && project.customerId !== expectedCustomerId) {
      stale.push({ entity: "project", id: project.id, reason: "invalid_giver_customer" });
    }

    if (project.scope?.incGiverCompanyId && project.scope.incGiverCompanyId !== giverId) {
      stale.push({ entity: "project", id: project.id, reason: "giver_scope_mismatch" });
    }

    const resolved = resolveIncGivenProjectAmountReceived(
      project,
      transactions,
      state.payments,
      state.incomes,
    );
    if (Math.abs((project.amountReceived ?? 0) - resolved) > DRIFT_EPS) {
      stale.push({ entity: "project", id: project.id, reason: "amount_received_drift" });
    }

    const ledger = deriveIncGiverProjectCollected(project.id, transactions);
    if ((project.contractAmount ?? 0) > 0 && ledger <= DRIFT_EPS && (project.amountReceived ?? 0) <= DRIFT_EPS) {
      stale.push({ entity: "project", id: project.id, reason: "inc_project_without_ledger" });
    }
  }

  for (const tx of transactions) {
    if (!companyIds.has(tx.incGiverCompanyId)) {
      stale.push({
        entity: "incGiverTransaction",
        id: tx.id,
        reason: "orphan_transaction_giver",
      });
      continue;
    }
    if (!tx.projectId) continue;
    const project = state.projects.find((p) => p.id === tx.projectId);
    if (!project || !isIncGivenProject(project)) {
      stale.push({
        entity: "incGiverTransaction",
        id: tx.id,
        reason: "transaction_giver_project_mismatch",
      });
      continue;
    }
    const giverId = resolveIncGiverCompanyIdForProject(project, companies);
    if (giverId !== tx.incGiverCompanyId) {
      stale.push({
        entity: "incGiverTransaction",
        id: tx.id,
        reason: "transaction_giver_project_mismatch",
      });
    }
  }

  return stale;
}

/** Apply ledger-derived amountReceived for INC_GIVEN projects after transaction changes. */
export function applyIncGiverLedgerToProjects(
  state: Pick<AppState, "payments" | "incomes" | "incGiverTransactions">,
  projects: Project[],
  projectIds?: string[],
): Project[] {
  const idFilter = projectIds ? new Set(projectIds) : undefined;
  const transactions = state.incGiverTransactions ?? [];
  return projects.map((project) => {
    if (idFilter && !idFilter.has(project.id)) return project;
    if (!isIncGivenProject(project)) return project;
    const resolved = resolveIncGivenProjectAmountReceived(
      project,
      transactions,
      state.payments,
      state.incomes,
    );
    return { ...project, amountReceived: resolved };
  });
}

export function projectIdsAffectedByIncTransaction(
  before: INCGiverTransaction | undefined,
  after: INCGiverTransaction | undefined,
): string[] {
  const ids = new Set<string>();
  if (before?.projectId) ids.add(before.projectId);
  if (after?.projectId) ids.add(after.projectId);
  return [...ids];
}
