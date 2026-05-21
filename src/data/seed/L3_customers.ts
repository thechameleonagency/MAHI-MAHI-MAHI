import type { AppState } from "@/contexts/AppDataContext";
import type { Customer } from "@/types/finance";
import type { SeedProfile } from "./seedLayerOrder";
import { seedCustomerId } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import {
  companyName, personName, phoneNumber, emailFor, addressAt, gstinFor,
} from "./seedNames";
import { countFor, pushAudit } from "./seedHelpers";

/** L3 — customers (active + archived candidates). */
export function buildL3Customers(state: AppState, profile: SeedProfile): AppState {
  const count = countFor(profile, 38);
  const existingIds: string[] = [];
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    const isCompany = i % 3 !== 2;
    const name = isCompany ? companyName(i) : personName(i);
    const addr = addressAt(i);
    const id = seedCustomerId(existingIds);
    existingIds.push(id);
    const createdAt = seedDayAt(0.04 + i * 0.004);
    customers.push({
      id,
      name,
      phone: phoneNumber(600 + i),
      email: emailFor(name),
      address: addr.line,
      state: addr.state,
      type: isCompany ? "company" : "individual",
      gstin: isCompany ? gstinFor("36", i) : undefined,
      paymentTerms: i % 2 === 0 ? "30% advance, balance on completion" : "Milestone-based",
      itemsBought: i % 5 === 0 ? ["MC4 Connector", "DC Cable"] : [],
      totalPurchases: i % 5 === 0 ? 8500 + i * 500 : 0,
      amountReceived: 0,
      customerKind: i % 7 === 0 ? "both" : i % 11 === 0 ? "inventory" : "project",
      createdAt,
      archivedAt: i >= count - 3 ? seedDayAt(0.92 + (i - count + 3) * 0.01) : null,
    });
  }

  state.customers = customers;

  pushAudit(state, {
    action: "create",
    entityType: "Customer",
    entityId: customers[0]?.id ?? "",
    entityName: customers[0]?.name ?? "",
    fraction: 0.045,
    role: "salesperson",
  });

  return state;
}
