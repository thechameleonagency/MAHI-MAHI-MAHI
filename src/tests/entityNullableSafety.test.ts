/**
 * Phase 1.6 closure — nullable safety regression net.
 *
 * Walks every seeded entity through the public selector and accessor functions used by the UI
 * and asserts none of them throw on optional / undefined fields. If a new selector is added
 * that mishandles optional fields, this test surfaces the crash with a clear seed id.
 */
import { describe, it, expect } from "vitest";
import {
  seedProjects,
  seedCustomers,
  seedQuotations,
  seedEnquiries,
  seedInvoices,
  seedInventoryItems,
  seedTools,
} from "@/data/seedData";
import {
  getProjectKind,
  isCustomerArchived,
  getCustomerKind,
} from "@/lib/selectors";
import {
  getProjectIdleAging,
  getInvoiceOverdueAging,
  getEnquiryFollowUpAging,
  getQuotationNoResponseAging,
  isProjectCompleted,
  isProjectOpen,
} from "@/lib/agingHelpers";

describe("Phase 1.6 — nullable safety on seeded entities", () => {
  it("every seeded project survives kind + aging + lifecycle selectors", () => {
    for (const p of seedProjects) {
      expect(() => getProjectKind(p)).not.toThrow();
      expect(() => getProjectIdleAging(p)).not.toThrow();
      expect(() => isProjectCompleted(p)).not.toThrow();
      expect(() => isProjectOpen(p)).not.toThrow();
      // Spot check: forbidden patterns like .includes on undefined kind.
      const kind = getProjectKind(p);
      expect(typeof kind).toBe("string");
    }
  });

  it("every seeded customer survives kind + archive selectors", () => {
    for (const c of seedCustomers) {
      expect(() => getCustomerKind(c)).not.toThrow();
      expect(() => isCustomerArchived(c)).not.toThrow();
    }
  });

  it("every seeded quotation survives no-response aging", () => {
    for (const q of seedQuotations) {
      expect(() => getQuotationNoResponseAging(q)).not.toThrow();
    }
  });

  it("every seeded enquiry survives follow-up aging", () => {
    for (const e of seedEnquiries) {
      expect(() => getEnquiryFollowUpAging(e)).not.toThrow();
    }
  });

  it("every seeded invoice survives overdue aging + null sanitization shape", () => {
    for (const inv of seedInvoices) {
      expect(() => getInvoiceOverdueAging(inv)).not.toThrow();
      expect(typeof (inv.total ?? 0)).toBe("number");
      expect(typeof (inv.amountReceived ?? 0)).toBe("number");
    }
  });

  it("every seeded inventory item exposes a stable numeric stock", () => {
    for (const it of seedInventoryItems) {
      const stock = it.stock ?? 0;
      const min = it.minStock ?? 0;
      expect(Number.isFinite(stock)).toBe(true);
      expect(Number.isFinite(min)).toBe(true);
    }
  });

  it("every seeded tool has a status from the allowed enum", () => {
    const allowed = new Set(["In Use", "Available", "Under Repair", "Retired"]);
    for (const t of seedTools) {
      expect(allowed.has(t.status)).toBe(true);
    }
  });
});
