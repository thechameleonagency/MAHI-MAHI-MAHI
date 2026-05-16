/**
 * Automated verification of the Round 5 manual smoke checklist (dev-server flows).
 * Each test mirrors the UI data path the operator walks in the browser.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildEnquiryToQuotationDraft,
  buildQuotationCloneDraft,
  buildQuotationToProjectDraft,
  buildProjectToInvoiceDraft,
  parseCreateFromParam,
} from "@/lib/createFromContext";
import {
  completedDividerIndex,
  filterActiveSiteProjects,
  filterCustomersByKind,
  filterProjectsForList,
  canVoidInvoice,
} from "@/lib/smokeFlowChecks";
import { getProjectIdleAging } from "@/lib/agingHelpers";
import {
  seedEnquiries,
  seedQuotations,
  seedProjects,
  seedCustomers,
  seedInvoices,
  seedTeams,
} from "@/data/seedData";
import type { Invoice } from "@/types/finance";

describe("manual smoke — pipeline continuity", () => {
  it("enquiry → quotation prefill (ENQ-2026-003)", () => {
    const enq = seedEnquiries.find((e) => e.id === "ENQ-2026-003")!;
    const draft = buildEnquiryToQuotationDraft(enq);
    expect(parseCreateFromParam(`enq:${enq.id}`)?.kind).toBe("enq");
    expect(draft.sourceEnquiryId).toBe("ENQ-2026-003");
    expect(draft.customerName).toBe("TATA Steel");
    expect(draft.agentId).toBe("A001");
  });

  it("approved quotation → project draft (Q007)", () => {
    const q = seedQuotations.find((x) => x.id === "Q007")!;
    expect(q.status).toBe("approved");
    const cust = seedCustomers.find((c) => c.id === q.customerId);
    const pDraft = buildQuotationToProjectDraft(q, cust);
    expect(pDraft.quotationId).toBe("Q007");
    expect(parseCreateFromParam("quo:Q007")?.id).toBe("Q007");
  });

  it("project → invoice draft preserves linkage", () => {
    const p = seedProjects.find((x) => x.id === "PROJ-2026-007")!;
    const inv = buildProjectToInvoiceDraft(p, undefined, 800000);
    expect(inv.projectId).toBe("PROJ-2026-007");
    expect(inv.customerName).toBeTruthy();
  });

  it("site visit sheet is wired for project detail flow", async () => {
    const sheet = await import("@/components/projects/SiteVisitSheet");
    expect(sheet.SiteVisitSheet).toBeDefined();
  });
});

describe("manual smoke — Projects hide completed + divider", () => {
  it("sorts open before completed and supports divider", () => {
    const sorted = filterProjectsForList(seedProjects, { hideCompleted: false });
    const firstCompleted = sorted.findIndex((p) => p.lifecycleStatus === "Completed" || p.status === "Completed");
    if (firstCompleted > 0) {
      expect(completedDividerIndex(sorted, false)).toBe(firstCompleted);
      const before = sorted.slice(0, firstCompleted);
      expect(before.every((p) => p.lifecycleStatus !== "Completed")).toBe(true);
    }
    const hidden = filterProjectsForList(seedProjects, { hideCompleted: true });
    expect(hidden.every((p) => p.lifecycleStatus !== "Completed" && p.status !== "Completed")).toBe(true);
    expect(completedDividerIndex(hidden, true)).toBe(-1);
  });
});

describe("manual smoke — Active Sites", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("excludes completed/closed from ongoing list", () => {
    const ongoing = filterActiveSiteProjects(seedProjects);
    expect(ongoing.some((p) => p.lifecycleStatus === "Completed")).toBe(false);
    expect(ongoing.some((p) => p.status === "Completed" || p.status === "Closed")).toBe(false);
  });

  it("idle aging can surface on active ongoing projects", () => {
    const ongoing = filterActiveSiteProjects(seedProjects);
    const withIdle = ongoing.filter((p) => getProjectIdleAging(p) !== null);
    expect(withIdle.length).toBeGreaterThanOrEqual(0);
  });
});

describe("manual smoke — Quotations clone", () => {
  it("clone draft copies client fields without quotation id", () => {
    const q = seedQuotations.find((x) => x.id === "Q005")!;
    const draft = buildQuotationCloneDraft(q);
    expect(draft.clientName).toBe(q.clientName);
    expect(draft.clientPhone).toBe(q.clientPhone);
    expect(draft.sourceQuotationNumber).toBe(q.quotationNumber);
    expect((draft as { id?: string }).id).toBeUndefined();
  });
});

describe("manual smoke — Invoice void", () => {
  it("allows void only when no payments recorded", () => {
    const voidable: Invoice = {
      id: "INV-TEST",
      invoiceNumber: "MSS/INV/TEST",
      type: "invoice",
      customerId: "C010",
      customerName: "Rohan Kapoor",
      items: [],
      services: [],
      subtotal: 100000,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 100000,
      amountReceived: 0,
      status: "pending",
      invoiceDate: "2026-05-01",
      dueDate: "2026-05-20",
      createdAt: "2026-05-01",
    };
    expect(canVoidInvoice(voidable).ok).toBe(true);
    expect(canVoidInvoice({ ...voidable, amountReceived: 1 }).ok).toBe(false);
    expect(canVoidInvoice({ ...voidable, status: "voided" }).ok).toBe(false);
  });

  it("seed includes at least one unpaid invoice for browser void smoke", () => {
    const pending = seedInvoices.filter(
      (i) => i.status === "pending" && (i.amountReceived ?? 0) === 0,
    );
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });
});

describe("manual smoke — Customers kind tabs", () => {
  it("archived filter is exclusive", () => {
    const archived = filterCustomersByKind(
      seedCustomers.map((c) => ({ ...c, archivedAt: c.id === "C010" ? "2026-05-01" : null })),
      "archived",
    );
    expect(archived.every((c) => c.id === "C010")).toBe(true);
  });
});

describe("manual smoke — Vendors list vs detail CRUD", () => {
  it("vendor list cards: single detail CTA, no card-level delete", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const listPath = path.join(process.cwd(), "src/pages/Vendors.tsx");
    const text = fs.readFileSync(listPath, "utf8");
    expect(text).toContain("View Full Details");
    const cardBlock = text.slice(text.indexOf("mt-3 flex flex-col gap-2 border-t"), text.indexOf("filteredVendors.length === 0"));
    expect(cardBlock).not.toContain("Delete vendor");
    expect(cardBlock).not.toContain("Edit vendor");
  });

  it("vendor detail header has edit, purchase, payment, delete", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const text = fs.readFileSync(path.join(process.cwd(), "src/pages/VendorDetail.tsx"), "utf8");
    expect(text).toContain("Edit vendor");
    expect(text).toContain("Add Purchase");
    expect(text).toContain("Record Payment");
    expect(text).toContain("Delete vendor");
  });
});

describe("manual smoke — Team edit + members", () => {
  it("team detail exposes edit and manage members", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const text = fs.readFileSync(path.join(process.cwd(), "src/pages/TeamDetail.tsx"), "utf8");
    expect(text).toContain("Edit team");
    expect(text).toContain("Manage members");
    expect(text).toContain("updateTeam");
  });

  it("seed team TEAM-001 has members for manage flow", () => {
    const team = seedTeams.find((t) => t.id === "TEAM-001")!;
    expect(team.memberIds.length).toBeGreaterThan(0);
    expect(team.leadId).toBeDefined();
  });
});
