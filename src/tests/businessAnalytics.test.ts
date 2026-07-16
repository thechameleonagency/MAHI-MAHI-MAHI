import { describe, expect, it } from "vitest";
import {
  bucketKey,
  buildTimeSeries,
  computeChannelAnalytics,
  computeEnquiryAnalytics,
  computeInventoryOpsAnalytics,
  computeInvoiceGstAnalytics,
  computeLoanAnalytics,
  computePayrollAnalytics,
  computeProfitAnalytics,
  computeSalesActionQueue,
  computeTaskAnalytics,
  extractPincode,
  parseKw,
  trendPct,
  type BusinessWindow,
} from "@/lib/analytics/business";
import { lostReasonGroupKey } from "@/lib/enquiryLostReasons";
import type { Enquiry, InventoryItem, Project, SiteRecord, Task, Tool } from "@/types/project";
import type {
  Agent,
  AgentCommissionPayment,
  EmployeePayrollRecord,
  Invoice,
  Loan,
  LoanRepayment,
  Partner,
  PartnerTransaction,
} from "@/types/finance";
import type { Blockage } from "@/types/blockage";
import type { VendorBill } from "@/types/inventory";

const win = (fromIso: string, toIso: string): BusinessWindow => ({
  from: new Date(`${fromIso}T00:00:00`),
  to: new Date(`${toIso}T23:59:59`),
});

describe("timeBuckets", () => {
  it("buckets by day, week, and month", () => {
    const d = new Date("2026-07-15T10:00:00");
    expect(bucketKey(d, "daily")).toBe("2026-07-15");
    expect(bucketKey(d, "weekly")).toBe("2026-07-13"); // Monday of that week
    expect(bucketKey(d, "monthly")).toBe("2026-07");
  });

  it("builds a zero-filled series with sums", () => {
    const items = [
      { date: "2026-01-10", amount: 100 },
      { date: "2026-01-20", amount: 50 },
      { date: "2026-03-05", amount: 25 },
    ];
    const series = buildTimeSeries(
      items,
      (i) => i.date,
      win("2026-01-01", "2026-03-31"),
      "monthly",
      (i) => i.amount,
    );
    expect(series.map((p) => p.value)).toEqual([150, 0, 25]);
    expect(series[0].key).toBe("2026-01");
  });

  it("computes trend % of last bucket vs previous", () => {
    expect(
      trendPct([
        { key: "a", label: "a", value: 100 },
        { key: "b", label: "b", value: 150 },
      ]),
    ).toBe(50);
    expect(trendPct([{ key: "a", label: "a", value: 5 }])).toBeNull();
  });
});

describe("geo helpers", () => {
  it("extracts a 6-digit pincode from free text", () => {
    expect(extractPincode("Plot 4, MG Road, Pune 411001")).toBe("411001");
    expect(extractPincode(undefined, "no pin here", "Indore - 452010, MP")).toBe("452010");
    expect(extractPincode("only 12345 five digits")).toBeNull();
    expect(extractPincode("012345 starts with zero")).toBeNull();
  });

  it("parses kW from capacity strings", () => {
    expect(parseKw("5.5 kW")).toBe(5.5);
    expect(parseKw("10KW")).toBe(10);
    expect(parseKw("")).toBe(0);
    expect(parseKw(undefined)).toBe(0);
  });
});

describe("lost reason grouping", () => {
  it("groups structured codes and falls back to unspecified", () => {
    expect(lostReasonGroupKey({ lostReasonCode: "price_too_high" })).toBe("price_too_high");
    expect(lostReasonGroupKey({ lostReason: "legacy free text only" })).toBe("unspecified");
    expect(lostReasonGroupKey({})).toBe("unspecified");
    expect(lostReasonGroupKey({ lostReasonCode: "bogus_code" })).toBe("unspecified");
  });
});

const enquiry = (over: Partial<Enquiry>): Enquiry =>
  ({
    id: "e1",
    customerName: "C",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerType: "individual",
    source: "phone",
    systemCapacity: "5",
    estimatedBudget: 0,
    requirements: "",
    status: "new",
    priority: "medium",
    assignedTo: "",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-05",
    notes: [],
    ...over,
  }) as Enquiry;

describe("computeEnquiryAnalytics", () => {
  const window = win("2026-01-01", "2026-03-31");
  const enquiries = [
    enquiry({ id: "e1", status: "converted", assignedToMemberId: "m1", assignedTo: "Asha", updatedAt: "2026-01-15" }),
    enquiry({ id: "e2", status: "lost", assignedToMemberId: "m1", assignedTo: "Asha", lostReasonCode: "price_too_high" }),
    enquiry({ id: "e3", status: "lost", assignedToMemberId: "m2", assignedTo: "Ravi", lostReason: "old text" }),
    enquiry({ id: "e4", status: "new", assignedToMemberId: "m2", assignedTo: "Ravi", estimatedBudget: 200000 }),
    enquiry({ id: "e5", status: "new", createdAt: "2025-06-01" }), // outside window
  ];

  it("counts totals, conversion, and lost reasons in window", () => {
    const a = computeEnquiryAnalytics(enquiries, [], window, "monthly");
    expect(a.total).toBe(4);
    expect(a.converted).toBe(1);
    expect(a.lost).toBe(2);
    expect(a.conversionPct).toBe(25);
    expect(a.openPipelineValue).toBe(200000);
    const priceReason = a.lostReasons.find((r) => r.code === "price_too_high");
    const unspecified = a.lostReasons.find((r) => r.code === "unspecified");
    expect(priceReason?.count).toBe(1);
    expect(priceReason?.enquiries.map((e) => e.id)).toEqual(["e2"]);
    expect(unspecified?.count).toBe(1);
  });

  it("ranks salespeople with a composite score and resolves names from assignedTo", () => {
    const a = computeEnquiryAnalytics(enquiries, [], window, "monthly");
    const asha = a.perEmployee.find((e) => e.name === "Asha");
    const ravi = a.perEmployee.find((e) => e.name === "Ravi");
    expect(asha?.converted).toBe(1);
    expect(ravi?.converted).toBe(0);
    expect((asha?.score ?? 0) > (ravi?.score ?? 0)).toBe(true);
    expect(ravi?.openPipelineValue).toBe(200000);
  });

  it("tracks site-visit outcomes and the documents pipeline", () => {
    const list = [
      enquiry({
        id: "v1", status: "quotation_sent", siteVisitDate: "2026-01-10",
        siteVisitOutcome: "confirmed", docsStatus: "collected", docsCollectedAt: "2026-01-10",
      }),
      enquiry({
        id: "v2", status: "meeting_scheduled", siteVisitDate: "2026-01-12",
        siteVisitOutcome: "confirmed", docsStatus: "promised", docsPromisedDate: "2026-02-01",
      }),
      enquiry({ id: "v3", status: "lost", siteVisitDate: "2026-01-14", siteVisitOutcome: "rejected" }),
      enquiry({ id: "v4", status: "meeting_scheduled", siteVisitDate: "2026-01-20", siteVisitOutcome: "postponed" }),
      enquiry({ id: "v5", status: "meeting_scheduled", meetingDate: "2026-02-05" }), // planned, not done
      enquiry({ id: "v6", status: "meeting_scheduled", siteVisitOutcome: "confirmed" }), // confirmed, docs untracked
    ];
    const a = computeEnquiryAnalytics(list, [], window, "monthly");
    expect(a.visitsDone).toBe(5);
    expect(a.visitsPlanned).toBe(5); // v1–v4 have dates, v5 has a meeting; v6 has no date
    expect(a.visitOutcomes.find((o) => o.outcome === "confirmed")?.count).toBe(3);
    expect(a.visitOutcomes.find((o) => o.outcome === "rejected")?.count).toBe(1);
    expect(a.visitOutcomes.find((o) => o.outcome === "postponed")?.count).toBe(1);
    expect(a.docsCollected.map((e) => e.id)).toEqual(["v1"]);
    expect(a.docsPromised.map((e) => e.id)).toEqual(["v2"]);
    expect(a.docsPendingNoDate.map((e) => e.id)).toEqual(["v6"]);
    expect(a.upcomingDocCollections[0]?.id).toBe("v2");
  });

  it("computes funnel drop-off percentages", () => {
    const list = [
      enquiry({ id: "f1", status: "converted", quotationId: "q1" }),
      enquiry({ id: "f2", status: "quotation_sent" }),
      enquiry({ id: "f3", status: "meeting_scheduled", meetingDate: "2026-01-10" }),
      enquiry({ id: "f4", status: "new" }),
    ];
    const a = computeEnquiryAnalytics(list, [], window, "monthly");
    expect(a.funnel[0]).toMatchObject({ stage: "Enquiries", count: 4, pctOfPrevious: 100 });
    const engaged = a.funnel[1];
    expect(engaged.count).toBe(3); // all but the bare "new" one
    expect(engaged.pctOfPrevious).toBe(75);
    const quoted = a.funnel.find((s) => s.stage === "Quotation sent");
    expect(quoted?.count).toBe(2);
    const won = a.funnel.find((s) => s.stage === "Converted");
    expect(won?.count).toBe(1);
    expect(won?.pctOfPrevious).toBe(50);
  });

  it("buckets the open pipeline by age", () => {
    const now = new Date("2026-03-20T12:00:00");
    const list = [
      enquiry({ id: "a1", status: "new", createdAt: "2026-03-19", estimatedBudget: 100 }), // 1d
      enquiry({ id: "a2", status: "new", createdAt: "2026-03-01", estimatedBudget: 200 }), // 19d
      enquiry({ id: "a3", status: "quotation_sent", createdAt: "2026-01-05", estimatedBudget: 400 }), // 74d
    ];
    const a = computeEnquiryAnalytics(list, [], window, "monthly", now);
    expect(a.aging[0].count).toBe(1); // 0–3 days
    expect(a.aging[3].count).toBe(1); // 15–30 days
    expect(a.aging[4].count).toBe(1); // 30+
    expect(a.aging[4].value).toBe(400);
    expect(a.aging[4].enquiries[0].id).toBe("a3");
  });
});

describe("computeSalesActionQueue", () => {
  const now = new Date("2026-03-20T09:00:00");

  it("builds today's operational queue", () => {
    const list = [
      enquiry({ id: "q1", createdAt: "2026-03-20T08:00:00" }), // new today
      enquiry({ id: "q2", status: "meeting_scheduled", siteVisitDate: "2026-03-20" }), // visit today
      enquiry({ id: "q3", status: "meeting_scheduled", meetingDate: "2026-03-20" }), // meeting today
      enquiry({
        id: "q4", status: "meeting_scheduled",
        siteVisitOutcome: "confirmed", docsStatus: "promised", docsPromisedDate: "2026-03-19",
      }), // docs overdue
      enquiry({ id: "q5", status: "quotation_sent", followUpDate: "2026-03-10" }), // overdue follow-up
      enquiry({ id: "q6", status: "meeting_scheduled", siteVisitDate: "2026-03-15" }), // visit passed, no outcome
      enquiry({ id: "q7", status: "converted", followUpDate: "2026-03-01" }), // closed → not overdue
    ];
    const q = computeSalesActionQueue(list, now);
    expect(q.newToday.map((e) => e.id)).toEqual(["q1"]);
    expect(q.visitsToday.map((e) => e.id).sort()).toEqual(["q2", "q3"]);
    expect(q.docsDue.map((e) => e.id)).toEqual(["q4"]);
    expect(q.overdueFollowUps.map((e) => e.id)).toEqual(["q5"]);
    expect(q.visitsAwaitingOutcome.map((e) => e.id)).toEqual(["q6"]);
    expect(q.docsPipeline.map((e) => e.id)).toEqual(["q4"]);
  });
});

describe("computeProfitAnalytics", () => {
  it("computes profit per kW and variance vs company average", () => {
    const projects = [
      {
        id: "p1", name: "A", projectType: "Residential", capacity: "10 kW",
        contractAmount: 500000, totalCost: 400000, startDate: "2026-02-01", createdAt: "2026-02-01",
      },
      {
        id: "p2", name: "B", projectType: "Commercial", capacity: "20",
        contractAmount: 1200000, totalCost: 800000, startDate: "2026-02-10", createdAt: "2026-02-10",
      },
    ] as unknown as Project[];
    const a = computeProfitAnalytics(projects, [], [], win("2026-01-01", "2026-03-31"), "monthly");
    const p1 = a.rows.find((r) => r.id === "p1");
    const p2 = a.rows.find((r) => r.id === "p2");
    expect(p1?.profitPerKw).toBe(10000); // 100k / 10kW
    expect(p2?.profitPerKw).toBe(20000); // 400k / 20kW
    expect(a.companyAvgProfitPerKw).toBe(15000);
    expect(p1?.variancePerKw).toBe(-5000);
    expect(p2?.variancePerKw).toBe(5000);
  });
});

describe("computePayrollAnalytics", () => {
  const rec = (over: Partial<EmployeePayrollRecord>): EmployeePayrollRecord =>
    ({
      id: "r", employeeId: "1", employeeName: "E", month: "January", year: 2026,
      daysPresent: 26, grossAmount: 0, deductions: 0, netAmount: 0,
      paidDate: "2026-01-31", mode: "bank_transfer",
      ...over,
    }) as EmployeePayrollRecord;

  it("totals salaries, avg per employee, and highest paid", () => {
    const a = computePayrollAnalytics(
      [
        rec({ id: "r1", employeeId: "1", employeeName: "Asha", netAmount: 30000, paidDate: "2026-01-31" }),
        rec({ id: "r2", employeeId: "1", employeeName: "Asha", netAmount: 30000, paidDate: "2026-02-28" }),
        rec({ id: "r3", employeeId: "2", employeeName: "Ravi", netAmount: 20000, paidDate: "2026-02-28" }),
        rec({ id: "r4", employeeId: "3", employeeName: "Old", netAmount: 99999, paidDate: "2025-01-31" }),
      ],
      win("2026-01-01", "2026-03-31"),
      "monthly",
    );
    expect(a.totalPaid).toBe(80000);
    expect(a.employeesPaid).toBe(2);
    expect(a.avgPerEmployee).toBe(40000);
    expect(a.highest?.name).toBe("Asha");
    expect(a.highest?.total).toBe(60000);
  });
});

describe("computeLoanAnalytics", () => {
  const loan = (over: Partial<Loan>): Loan =>
    ({
      id: "l", source: "Bank", sourceType: "bank", principal: 0, interestRate: 0,
      paymentType: "emi", emiAmount: 0, tenure: 12, startDate: "2026-01-01",
      outstanding: 0, status: "Active",
      ...over,
    }) as Loan;

  it("reports debt direction and weighted interest rate", () => {
    const loans = [
      loan({ id: "l1", principal: 100000, outstanding: 90000, interestRate: 10, startDate: "2026-02-01" }),
      loan({ id: "l2", principal: 50000, outstanding: 10000, interestRate: 12, startDate: "2025-01-01" }),
    ];
    const repayments: LoanRepayment[] = [
      {
        id: "rp1", loanId: "l2", loanSource: "Bank", date: "2026-02-15",
        emiNumber: 1, principalPaid: 5000, interestPaid: 500, totalPaid: 5500,
      },
    ];
    const a = computeLoanAnalytics(loans, repayments, win("2026-01-01", "2026-03-31"), "monthly");
    expect(a.activeCount).toBe(2);
    expect(a.totalOutstanding).toBe(100000);
    expect(a.newPrincipalInPeriod).toBe(100000);
    expect(a.principalRepaidInPeriod).toBe(5000);
    expect(a.interestPaidInPeriod).toBe(500);
    expect(a.direction).toBe("increasing");
    // (10*90000 + 12*10000) / 100000 = 10.2
    expect(a.avgInterestRate).toBe(10.2);
  });
});

describe("computeTaskAnalytics", () => {
  const task = (over: Partial<Task>): Task =>
    ({
      id: "t", projectId: "p", siteId: "s", siteName: "Site A", workType: "Installation",
      notes: "", createdDate: "2026-02-01", workDate: "2026-02-10", status: "done", createdBy: "u",
      ...over,
    }) as Task;

  it("computes throughput, overdue, and delay reasons", () => {
    const tasks = [
      task({ id: "t1" }),
      task({ id: "t2", status: "started", workDate: "2026-02-05" }), // overdue vs "now"
      task({
        id: "t3",
        workDate: "2026-02-20",
        delayHistory: [
          { from: "2026-02-15", to: "2026-02-20", reason: "Material shortage", at: "2026-02-14" },
        ],
      }),
    ];
    const a = computeTaskAnalytics(
      tasks, [], [], [],
      win("2026-02-01", "2026-02-28"),
      "monthly",
      new Date("2026-02-25T12:00:00"),
    );
    expect(a.total).toBe(3);
    expect(a.done).toBe(2);
    expect(a.overdue).toBe(1);
    expect(a.delayedCount).toBe(1);
    expect(a.totalDelayDays).toBe(5);
    expect(a.delayReasons[0]).toEqual({ reason: "Material shortage", count: 1 });
    expect(a.completionPct).toBe(67);
  });

  it("summarises blockage resolution times", () => {
    const blockages = [
      {
        id: "b1", projectId: "p", title: "x", reason: "DISCOM delay", projectStage: "wip",
        status: "resolved", createdAt: "2026-02-01", resolvedAt: "2026-02-05",
      },
      {
        id: "b2", projectId: "p", title: "y", reason: "DISCOM delay", projectStage: "wip",
        status: "active", createdAt: "2026-02-10",
      },
    ] as Blockage[];
    const a = computeTaskAnalytics([], [], [], blockages, win("2026-02-01", "2026-02-28"), "monthly");
    expect(a.blockagesOpen).toBe(1);
    expect(a.blockagesResolved).toBe(1);
    expect(a.avgBlockageResolutionDays).toBe(4);
    expect(a.blockageReasons[0]).toEqual({ reason: "DISCOM delay", count: 2 });
  });
});

describe("computeInventoryOpsAnalytics", () => {
  const item = (over: Partial<InventoryItem>): InventoryItem =>
    ({
      id: "i", name: "Panel", category: "Panels", stock: 10, unit: "pcs",
      value: 0, buyPrice: 100, salePrice: 120, hsn: "", minStock: 1,
      ...over,
    }) as InventoryItem;

  it("reconstructs stock value trend from movements", () => {
    const items = [
      item({
        id: "i1",
        stock: 10,
        buyPrice: 100,
        movementHistory: [
          { id: "m1", type: "purchase", qty: 8, date: "2026-01-10", createdAt: "2026-01-10" },
          { id: "m2", type: "issue", qty: 3, date: "2026-02-10", siteName: "Site A", createdAt: "2026-02-10" },
        ],
      }),
    ];
    const a = computeInventoryOpsAnalytics(items, [], [], [], win("2026-01-01", "2026-02-28"), "monthly");
    // current 10*100=1000; window delta = +800-300=+500 → start 500 → Jan 1300 → Feb 1000
    expect(a.stockValueSeries.map((p) => p.value)).toEqual([1300, 1000]);
    expect(a.stockValueChangeInPeriod).toBe(500);
    expect(a.consumptionValue).toBe(300);
    expect(a.consumptionByCategory[0].category).toBe("Panels");
    expect(a.consumptionBySite[0].site).toBe("Site A");
  });

  it("computes per-kW consumption using site→project capacity", () => {
    const items = [
      item({
        id: "i1",
        movementHistory: [
          { id: "m1", type: "issue", qty: 5, date: "2026-02-01", siteId: "s1", siteName: "Site A", createdAt: "2026-02-01" },
        ],
      }),
    ];
    const sites = [{ id: "s1", name: "Site A", projectId: "p1" }] as SiteRecord[];
    const projects = [{ id: "p1", capacity: "5 kW" }] as Project[];
    const a = computeInventoryOpsAnalytics(items, [], sites, projects, win("2026-02-01", "2026-02-28"), "monthly");
    expect(a.consumptionByCategory[0].valuePerKw).toBe(100); // 500 ₹ / 5 kW
  });

  it("summarises tools fleet", () => {
    const tools = [
      { id: "t1", status: "In Use", condition: "Good", purchaseRate: 5000 },
      { id: "t2", status: "Available", condition: "Fair", purchaseRate: 3000 },
      { id: "t3", status: "Retired", condition: "Damaged", purchaseRate: 1000 },
    ] as Tool[];
    const a = computeInventoryOpsAnalytics([], tools, [], [], win("2026-02-01", "2026-02-28"), "monthly");
    expect(a.toolCount).toBe(3);
    expect(a.toolFleetValue).toBe(9000);
    expect(a.toolUtilizationPct).toBe(50); // 1 in use / 2 not retired
  });
});

describe("computeChannelAnalytics", () => {
  it("scores agents, partner flows, and vendor spend", () => {
    const agents = [
      { id: "a1", name: "Ravi", status: "active" },
    ] as Agent[];
    const enquiries = [
      { id: "e1", agentId: "a1", status: "converted", createdAt: "2026-02-01" },
      { id: "e2", agentId: "a1", status: "lost", createdAt: "2026-02-05" },
    ] as Enquiry[];
    const commissions = [
      { id: "c1", agentId: "a1", projectId: "p1", amount: 5000, date: "2026-02-20", mode: "upi", createdAt: "2026-02-20" },
    ] as AgentCommissionPayment[];
    const partners = [{ id: "pt1", name: "SunCo", phone: "", type: "installer", createdAt: "2026-01-01" }] as Partner[];
    const partnerTx = [
      { id: "x1", partnerId: "pt1", partnerName: "SunCo", date: "2026-02-10", amount: 30000, type: "Received from Partner", notes: "" },
      { id: "x2", partnerId: "pt1", partnerName: "SunCo", date: "2026-02-12", amount: 10000, type: "Given to Partner", notes: "" },
    ] as PartnerTransaction[];
    const bills = [
      { id: "vb1", vendorId: "v1", vendorName: "Steel Traders", billNumber: "B1", billDate: "2026-02-15", items: [], total: 40000, amountPaid: 25000, status: "partial" },
    ] as unknown as VendorBill[];

    const a = computeChannelAnalytics(
      agents, commissions, enquiries, [], partners, partnerTx, [], bills,
      win("2026-02-01", "2026-02-28"), "monthly",
    );
    expect(a.agents[0].referrals).toBe(2);
    expect(a.agents[0].converted).toBe(1);
    expect(a.agents[0].conversionPct).toBe(50);
    expect(a.totalCommissionPaid).toBe(5000);
    expect(a.partners[0].net).toBe(20000);
    expect(a.vendors[0].spend).toBe(40000);
    expect(a.vendors[0].outstanding).toBe(15000);
    expect(a.vendorOutstandingTotal).toBe(15000);
  });
});

describe("computeInvoiceGstAnalytics", () => {
  it("computes collections, days to payment, and GST net", () => {
    const invoices = [
      {
        id: "in1", invoiceNumber: "I-1", type: "invoice", status: "paid", invoiceDate: "2026-02-01",
        receivedDate: "2026-02-11", total: 118000, amountReceived: 118000,
        cgst: 9000, sgst: 9000, igst: 0, customerId: "c1", customerName: "Acme",
      },
      {
        id: "in2", invoiceNumber: "I-2", type: "invoice", status: "draft", invoiceDate: "2026-02-05",
        total: 50000, amountReceived: 0, cgst: 0, sgst: 0, igst: 0, customerName: "Draft Co",
      },
    ] as unknown as Invoice[];
    const bills = [
      { id: "vb1", vendorId: "v1", billNumber: "B1", billDate: "2026-02-10", items: [], total: 23600, amountPaid: 23600, gst: 3600, status: "paid" },
    ] as unknown as VendorBill[];

    const a = computeInvoiceGstAnalytics(invoices, [], bills, win("2026-02-01", "2026-02-28"), "monthly");
    expect(a.invoiceCount).toBe(2); // drafts counted in doc count…
    expect(a.totalInvoiced).toBe(118000); // …but excluded from billing/GST totals
    expect(a.collectionPct).toBe(100);
    expect(a.avgDaysToPayment).toBe(10);
    expect(a.gstOutput).toBe(18000);
    expect(a.gstInput).toBe(3600);
    expect(a.gstNetPayable).toBe(14400);
    expect(a.topCustomers[0].name).toBe("Acme");
  });
});
