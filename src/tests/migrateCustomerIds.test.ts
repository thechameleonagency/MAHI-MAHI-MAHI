import { describe, expect, it } from "vitest";
import { migrateOpaqueCustomerIds } from "@/lib/migrateCustomerIds";

describe("migrateOpaqueCustomerIds (T2)", () => {
  it("remaps opaque customer ids and FKs to sequential CUST-NNNN", () => {
    const state = {
      customers: [
        { id: "C001", name: "Seed" },
        { id: "CUST-2026-K2J5L9MX9KAS3F2P", name: "Opaque" },
      ],
      projects: [{ customerId: "CUST-2026-K2J5L9MX9KAS3F2P" }],
      quotations: [{ customerId: "CUST-2026-K2J5L9MX9KAS3F2P" }],
      invoices: [{ customerId: "CUST-2026-K2J5L9MX9KAS3F2P" }],
      saleBills: [] as Array<{ customerId?: string }>,
      payments: [{ customerId: "CUST-2026-K2J5L9MX9KAS3F2P" }],
      enquiries: [{ customerId: "CUST-2026-K2J5L9MX9KAS3F2P" }],
      auditLogs: [
        { entityType: "Customer", entityId: "CUST-2026-K2J5L9MX9KAS3F2P" },
        { entityType: "Invoice", entityId: "INV-1" },
      ],
    };

    const next = migrateOpaqueCustomerIds(state);
    const newId = next.customers.find((c) => c.name === "Opaque")?.id;
    expect(newId).toBe("CUST-0002");
    expect(next.projects[0].customerId).toBe("CUST-0002");
    expect(next.quotations[0].customerId).toBe("CUST-0002");
    expect(next.invoices[0].customerId).toBe("CUST-0002");
    expect(next.payments[0].customerId).toBe("CUST-0002");
    expect(next.enquiries[0].customerId).toBe("CUST-0002");
    expect(next.auditLogs[0].entityId).toBe("CUST-0002");
    expect(next.auditLogs[1].entityId).toBe("INV-1");
  });

  it("is a no-op when all customer ids are recognized", () => {
    const state = {
      customers: [{ id: "CUST-0003" }],
      projects: [{ customerId: "CUST-0003" }],
      quotations: [] as Array<{ customerId?: string }>,
      invoices: [] as Array<{ customerId?: string }>,
      saleBills: [] as Array<{ customerId?: string }>,
      payments: [] as Array<{ customerId?: string }>,
      enquiries: [] as Array<{ customerId?: string }>,
      auditLogs: [] as Array<{ entityType?: string; entityId?: string }>,
    };
    expect(migrateOpaqueCustomerIds(state)).toEqual(state);
  });
});
