import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

/** FC7 — bind direct-exception project to a customer with no other projects (so completion can auto-archive). */
export const applyDirectExceptionProject: NarrativeApply = (state) => {
  const p = state.projects.find((x) =>
    x.directCreationReason?.includes("Urgent hospital backup power"),
  );
  if (!p) return;

  const projectCountByCustomer = new Map<string, number>();
  for (const proj of state.projects) {
    if (!proj.customerId || proj.id === p.id) continue;
    projectCountByCustomer.set(
      proj.customerId,
      (projectCountByCustomer.get(proj.customerId) ?? 0) + 1,
    );
  }
  const dedicated =
    state.customers.find(
      (c) =>
        c.customerKind !== "inventory" &&
        !c.archivedAt &&
        (projectCountByCustomer.get(c.id) ?? 0) === 0,
    ) ?? state.customers.find((c) => c.customerKind !== "inventory" && !c.archivedAt);

  if (dedicated) {
    p.customerId = dedicated.id;
    p.client = dedicated.name;
    p.clientAddress = dedicated.address;
    p.clientPhone = dedicated.phone;
    p.clientEmail = dedicated.email;
    p.clientGstin = dedicated.gstin;
  }

  p.quotationId = undefined;
  p.lifecycleStatus = "In Progress";
  p.progressStage = "work-in-progress";
  p.executionPhase = "Panel installation";
  p.startedAt = p.startedAt ?? seedDateAt(0.72);
  p.status = "Ongoing";
};
