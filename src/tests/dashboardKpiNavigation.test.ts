import { describe, expect, it } from "vitest";
import {
  getDashboardKpiListLabel,
  getDashboardKpiListPath,
} from "@/lib/dashboardKpiNavigation";
import { filterEnquiriesForList } from "@/lib/enquiryListFilters";
import { isQuotationInFlight } from "@/lib/quotationListFilters";
import { matchesOpenReceivable } from "@/lib/billingListFilters";
import { isLoanEmiDueWithinDays } from "@/lib/loanEmiDue";
import type { Enquiry } from "@/types/project";

describe("dashboardKpiNavigation", () => {
  it("maps each KPI card to a filtered list route", () => {
    expect(getDashboardKpiListPath("enquiries")).toBe("/enquiries?status=open");
    expect(getDashboardKpiListPath("followUps")).toBe("/enquiries?status=open&followUp=overdue");
    expect(getDashboardKpiListPath("quotations")).toBe("/quotations?pipeline=inflight");
    expect(getDashboardKpiListPath("projects")).toBe("/projects?status=Ongoing");
    expect(getDashboardKpiListPath("pending")).toBe("/invoices?receivable=open");
    expect(getDashboardKpiListPath("stock")).toBe("/inventory/materials?stock=low");
    expect(getDashboardKpiListPath("emis")).toBe("/loans?status=Active&emi=due7d");
    expect(getDashboardKpiListPath("blockages")).toBe("/projects?status=On%20Hold");
    expect(getDashboardKpiListPath("unknown")).toBeNull();
  });

  it("provides human labels for sheet CTAs", () => {
    expect(getDashboardKpiListLabel("pending")).toBe("Open receivables");
    expect(getDashboardKpiListLabel("emis")).toBe("EMIs due soon");
  });
});

describe("dashboard KPI filter helpers", () => {
  it("filters overdue follow-ups in enquiry list", () => {
    const rows: Enquiry[] = [
      {
        id: "E1",
        customerName: "A",
        status: "new",
        followUpDate: "2020-01-01",
        priority: "medium",
      } as Enquiry,
      {
        id: "E2",
        customerName: "B",
        status: "new",
        followUpDate: "2099-01-01",
        priority: "medium",
      } as Enquiry,
    ];
    const filtered = filterEnquiriesForList(rows, {
      statusFilter: "open",
      followUpFilter: "overdue",
    });
    expect(filtered.map((e) => e.id)).toEqual(["E1"]);
  });

  it("matches quotation in-flight and open receivable rules", () => {
    expect(isQuotationInFlight({ status: "draft" } as never)).toBe(true);
    expect(isQuotationInFlight({ status: "approved" } as never)).toBe(false);
    expect(
      matchesOpenReceivable({
        id: "I1",
        total: 1000,
        status: "pending",
        amountReceived: 0,
      }),
    ).toBe(true);
    expect(
      matchesOpenReceivable({
        id: "I2",
        total: 1000,
        status: "paid",
        amountReceived: 1000,
      }),
    ).toBe(false);
  });

  it("detects EMI due within 7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    expect(
      isLoanEmiDueWithinDays({ dueDate: soon.toISOString().slice(0, 10) }, 7),
    ).toBe(true);
  });
});
