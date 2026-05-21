import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

export const applyArchivedCustomer: NarrativeApply = (state) => {
  const customer = state.customers.find((c) => !c.archivedAt && c.customerKind !== "inventory");
  if (!customer) return;
  const projects = state.projects.filter((p) => p.customerId === customer.id);
  for (const p of projects) {
    p.lifecycleStatus = "Completed";
    p.status = "Completed";
    p.endDate = "2026-04-15";
  }
  customer.archivedAt = seedDateAt(0.88);
  customer.lastProjectCompletedAt = "2026-04-15";
};
