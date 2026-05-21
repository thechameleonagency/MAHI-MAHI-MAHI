import type { AppState } from "@/contexts/AppDataContext";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt } from "../seedTimeModel";

/**
 * Partner site investment attributed to a project must not inflate `project.amountReceived` (V9).
 */
export function applyPartnerSiteProjectIncome(state: AppState): void {
  const project = state.projects.find(
    (p) => p.lifecycleStatus !== "Closed" && (p.contractAmount ?? 0) > 100000,
  );
  if (!project) return;
  const partner = state.partners[0];
  if (!partner) return;
  if (
    state.incomes.some(
      (i) => i.projectId === project.id && i.mainCategory === "partner" && i.amount === 75000,
    )
  ) {
    return;
  }

  state.incomes.push({
    id: seedId(SEED_ID_PREFIX.income),
    date: seedDayAt(0.48),
    amount: 75000,
    mainCategory: "partner",
    category: "partner-site-investment",
    subCategory: "partner-site-investment",
    projectId: project.id,
    projectName: project.name,
    partnerId: partner.id,
    partnerName: partner.name,
    paymentMode: "Bank Transfer",
    notes: "Narrative: partner site investment — not client collection",
    createdAt: seedDayAt(0.48),
  });
}
