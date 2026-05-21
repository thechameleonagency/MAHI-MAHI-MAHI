import { resolveIncGiverCompanyIdForProject } from "@/lib/incGiverProjectLink";
import { sumIncGiverCollections } from "@/lib/deriveIncGiverEconomics";
import type { AppState } from "@/contexts/AppDataContext";
import type { Customer, INCGiverTransaction } from "@/types/finance";
import type { Project } from "@/types/project";

const defaultIncScope = (giverId: string): NonNullable<Project["scope"]> => ({
  hasMaterial: false,
  hasInstallation: true,
  vendorshipOwner: "CLIENT",
  leadSource: "MSS_DIRECT",
  billingParty: "MSS",
  incGiverCompanyId: giverId,
});

function isIncGivenProject(project: Project): boolean {
  return project.projectKind === "INC_GIVEN" || project.projectMode === "INC_GIVEN_TO_US";
}

function seedTransactionId(projectId: string, suffix: string): string {
  return `IGT-SEED-${projectId}-${suffix}`;
}

/**
 * Repair INC_GIVEN project links and align collection ledger rows with received cash.
 * Idempotent on reload.
 */
function ensureIncGiverSyntheticCustomer(
  customers: Customer[],
  giverId: string,
  companyName: string,
  phone: string,
): Customer[] {
  const customerId = `inc-${giverId}`;
  if (customers.some((c) => c.id === customerId)) return customers;
  return [
    ...customers,
    {
      id: customerId,
      name: companyName,
      phone: phone || "0000000000",
      email: "",
      address: "",
      type: "company",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: new Date().toISOString().split("T")[0],
      customerKind: "project",
    },
  ];
}

export function reconcileIncGiverTransactions(state: AppState): AppState {
  const companies = state.incGiverCompanies ?? [];
  if (!companies.length) return state;

  let projects = state.projects;
  let customers = state.customers;
  let transactions = [...(state.incGiverTransactions ?? [])];
  let changed = false;

  const upsertTx = (tx: INCGiverTransaction) => {
    const idx = transactions.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      if (
        transactions[idx].amount === tx.amount &&
        transactions[idx].incGiverCompanyId === tx.incGiverCompanyId
      ) {
        return;
      }
      transactions = transactions.map((t, i) => (i === idx ? { ...t, ...tx } : t));
    } else {
      transactions = [tx, ...transactions];
    }
    changed = true;
  };

  for (const project of projects) {
    if (!isIncGivenProject(project)) continue;

    const giverId = resolveIncGiverCompanyIdForProject(project, companies);
    if (!giverId) continue;

    const customerId = `inc-${giverId}`;
    const giver = companies.find((c) => c.id === giverId);
    const nextCustomers = ensureIncGiverSyntheticCustomer(
      customers,
      giverId,
      giver?.name ?? project.client,
      giver?.phone ?? "",
    );
    if (nextCustomers.length !== customers.length) {
      customers = nextCustomers;
      changed = true;
    }

    const scopePatch = {
      ...defaultIncScope(giverId),
      ...project.scope,
      incGiverCompanyId: giverId,
    };

    if (project.customerId !== customerId || project.scope?.incGiverCompanyId !== giverId) {
      projects = projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              customerId,
              client: giver?.name ?? p.client,
              scope: scopePatch,
            }
          : p,
      );
      changed = true;
    }

    const received = project.amountReceived ?? 0;
    const projectTxns = transactions.filter((t) => t.projectId === project.id);
    const ledgerCollected = sumIncGiverCollections(projectTxns);

    if (received > ledgerCollected + 0.01) {
      upsertTx({
        id: seedTransactionId(project.id, "recv"),
        incGiverCompanyId: giverId,
        projectId: project.id,
        projectName: project.name,
        date: project.startDate || project.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        amount: Math.round(received - ledgerCollected),
        type: "collection",
        notes: "Aligned with project cash received",
      });
    } else if (received <= 0 && (project.contractAmount ?? 0) > 0 && projectTxns.length === 0) {
      const fraction =
        project.lifecycleStatus === "Completed" || project.status === "Completed" ? 0.85 : 0.35;
      upsertTx({
        id: seedTransactionId(project.id, "demo"),
        incGiverCompanyId: giverId,
        projectId: project.id,
        projectName: project.name,
        date: project.startDate || project.createdAt?.slice(0, 10) || "2026-03-01",
        amount: Math.round((project.contractAmount ?? 0) * fraction),
        type: "collection",
        notes: "Demo collection against INC job contract",
      });
      changed = true;
    }
  }

  if (!changed) return state;
  return { ...state, projects, customers, incGiverTransactions: transactions };
}
