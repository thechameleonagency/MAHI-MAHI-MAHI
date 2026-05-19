import { describe, expect, it } from "vitest";
import {
  seedCustomers,
  seedEmployees,
  seedInventoryItems,
  seedInvoices,
  seedPayments,
  seedProjects,
  seedSites,
  seedTasks,
  seedTeams,
  seedVendors,
} from "@/data/seedData";
import { seedVendorBills } from "@/data/seedData";

describe("migrationIntegrity", () => {
  it("all employee ids are string EMP prefix", () => {
    for (const e of seedEmployees) {
      expect(typeof e.id).toBe("string");
      expect(e.id).toMatch(/^EMP\d+$/);
    }
  });

  it("all inventory item ids are string INV prefix", () => {
    for (const i of seedInventoryItems) {
      expect(typeof i.id).toBe("string");
      expect(i.id).toMatch(/^INV\d+$/);
    }
  });

  it("all site ids are string SITE prefix", () => {
    for (const s of seedSites) {
      expect(typeof s.id).toBe("string");
      expect(s.id).toMatch(/^SITE\d+$/);
    }
  });

  it("project customerId resolves to a customer", () => {
    const customerIds = new Set(seedCustomers.map((c) => c.id));
    for (const p of seedProjects) {
      if (p.customerId) expect(customerIds.has(p.customerId)).toBe(true);
    }
  });

  it("invoice customerId resolves", () => {
    const customerIds = new Set(seedCustomers.map((c) => c.id));
    for (const inv of seedInvoices) {
      expect(customerIds.has(inv.customerId)).toBe(true);
    }
  });

  it("attendance employeeId resolves", () => {
    const empIds = new Set(seedEmployees.map((e) => e.id));
    for (const t of seedTasks) {
      if (t.employeeId) expect(empIds.has(t.employeeId)).toBe(true);
    }
  });

  it("team memberIds and leadId resolve", () => {
    const empIds = new Set(seedEmployees.map((e) => e.id));
    for (const team of seedTeams) {
      for (const mid of team.memberIds) expect(empIds.has(mid)).toBe(true);
      if (team.leadId) expect(empIds.has(team.leadId)).toBe(true);
    }
  });

  it("task siteId matches a site on the same project", () => {
    const sitesByProject = new Map<string, Set<string>>();
    for (const s of seedSites) {
      const set = sitesByProject.get(s.projectId) ?? new Set();
      set.add(s.id);
      sitesByProject.set(s.projectId, set);
    }
    for (const t of seedTasks) {
      const keys = sitesByProject.get(t.projectId);
      expect(keys?.has(t.siteId)).toBe(true);
    }
  });

  it("vendor ids are strings", () => {
    for (const v of seedVendors) {
      expect(typeof v.id).toBe("string");
    }
  });

  it("vendor bills use string vendorId when present", () => {
    const vendorIds = new Set(seedVendors.map((v) => v.id));
    for (const b of seedVendorBills as { vendorId?: string }[]) {
      if (b.vendorId != null) {
        expect(typeof b.vendorId).toBe("string");
        expect(vendorIds.has(b.vendorId)).toBe(true);
      }
    }
  });

  it("payments with invoiceId reference existing invoices", () => {
    const invIds = new Set(seedInvoices.map((i) => i.id));
    for (const p of seedPayments) {
      if (p.invoiceId) expect(invIds.has(p.invoiceId)).toBe(true);
    }
  });
});
