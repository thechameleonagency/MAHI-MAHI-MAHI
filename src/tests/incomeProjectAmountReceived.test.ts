import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  applyIncomeUpdateToProjects,
  applyProjectReceivedFromIncomeDelta,
  getProjectAmountReceived,
  incomeCountsTowardProjectReceived,
  reconcileProjectsAmountReceived,
} from "@/lib/billingSelectors";
import type { Income, Payment } from "@/types/finance";
import type { Project } from "@/types/project";

const project = (id: string, amountReceived = 0): Project =>
  ({
    id,
    name: `Project ${id}`,
    amountReceived,
    amountInvoiced: 0,
    contractAmount: 100000,
    totalCost: 0,
    capacity: "5kW",
    location: "Pune",
    lifecycleStatus: "Active",
    assignees: [],
    onSite: 0,
    photos: 0,
    startDate: "2026-01-01",
    endDate: null,
    createdAt: "2026-01-01",
  }) as Project;

describe("M6 — income ↔ project.amountReceived", () => {
  it("incomeCountsTowardProjectReceived excludes linked payments and outgoing rows", () => {
    expect(
      incomeCountsTowardProjectReceived({
        projectId: "P1",
        mainCategory: "project",
        isOutgoing: false,
        linkedPaymentId: undefined,
      }),
    ).toBe(true);
    expect(
      incomeCountsTowardProjectReceived({
        projectId: "P1",
        mainCategory: "project",
        isOutgoing: false,
        linkedPaymentId: "pay-1",
      }),
    ).toBe(false);
    expect(
      incomeCountsTowardProjectReceived({
        projectId: "P1",
        mainCategory: "project",
        isOutgoing: true,
        linkedPaymentId: undefined,
      }),
    ).toBe(false);
  });

  it("partner/employee-linked incomes with projectId do not count toward amountReceived", () => {
    expect(
      incomeCountsTowardProjectReceived({
        projectId: "P1",
        mainCategory: "partner",
        isOutgoing: false,
      }),
    ).toBe(false);
    expect(
      incomeCountsTowardProjectReceived({
        projectId: "P1",
        mainCategory: "employee-payment",
        isOutgoing: false,
      }),
    ).toBe(false);
  });

  it("applyIncomeUpdateToProjects ignores partner income edits", () => {
    const projects = [project("P1", 100000)];
    const partnerIncome: Income = {
      id: "inc-partner",
      date: "2026-05-01",
      amount: 50000,
      mainCategory: "partner",
      category: "partner-site-investment",
      projectId: "P1",
      partnerId: "PTR-1",
      paymentMode: "Bank Transfer",
      createdAt: "2026-05-01",
    };
    const next = applyIncomeUpdateToProjects(projects, partnerIncome, {
      ...partnerIncome,
      amount: 80000,
    });
    expect(next[0].amountReceived).toBe(100000);
  });

  it("applyIncomeUpdateToProjects syncs project-category income amount changes", () => {
    const projects = [project("P1", 20000)];
    const oldIncome: Income = {
      id: "inc-proj",
      date: "2026-05-01",
      amount: 20000,
      mainCategory: "project",
      category: "client-payment",
      projectId: "P1",
      paymentMode: "Cash",
      createdAt: "2026-05-01",
    };
    const next = applyIncomeUpdateToProjects(projects, oldIncome, {
      ...oldIncome,
      amount: 35000,
    });
    expect(next[0].amountReceived).toBe(35000);
  });

  it("getProjectAmountReceived avoids double-count when income links a payment", () => {
    const payments: Payment[] = [
      {
        id: "pay-1",
        date: "2026-05-01",
        amount: 40000,
        direction: "in",
        paymentMode: "Bank Transfer",
        counterpartyType: "customer",
        projectId: "P1",
        linkedIncomeId: "inc-1",
      },
    ];
    const incomes: Income[] = [
      {
        id: "inc-1",
        date: "2026-05-01",
        amount: 40000,
        mainCategory: "project",
        category: "client-payment",
        paymentMode: "Bank Transfer",
        projectId: "P1",
        linkedPaymentId: "pay-1",
        createdAt: "2026-05-01",
      },
    ];
    expect(getProjectAmountReceived("P1", payments, incomes)).toBe(40000);
  });

  it("reconcileProjectsAmountReceived derives from payments + standalone incomes", () => {
    const projects = [project("P1", 99999)];
    const payments: Payment[] = [
      {
        id: "pay-2",
        date: "2026-05-02",
        amount: 10000,
        direction: "in",
        paymentMode: "Cash",
        counterpartyType: "customer",
        projectId: "P1",
      },
    ];
    const incomes: Income[] = [
      {
        id: "inc-2",
        date: "2026-05-03",
        amount: 15000,
        mainCategory: "project",
        category: "client-payment",
        paymentMode: "Cash",
        projectId: "P1",
        createdAt: "2026-05-03",
      },
    ];
    const reconciled = reconcileProjectsAmountReceived(projects, payments, incomes);
    expect(reconciled[0].amountReceived).toBe(25000);
  });

  it("applyProjectReceivedFromIncomeDelta moves amount between projects", () => {
    const projects = [project("P1", 50000), project("P2", 0)];
    let next = applyProjectReceivedFromIncomeDelta(projects, "P1", -20000);
    next = applyProjectReceivedFromIncomeDelta(next, "P2", 20000);
    expect(next[0].amountReceived).toBe(30000);
    expect(next[1].amountReceived).toBe(20000);
  });

  it("updateIncome uses applyIncomeUpdateToProjects in AppDataContext", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
      "utf8",
    );
    expect(source).toMatch(
      /const updateIncome = useCallback[\s\S]*?applyIncomeUpdateToProjects\(prev\.projects, old, next\)/,
    );
    expect(source).toContain("applyIncomeUpdateToProjects(prev.projects, removedIncome, undefined)");
  });

  it("hydrated seed: partner site income on project does not inflate amountReceived", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const partnerOnProject = hydrated.incomes.find(
      (i) => i.mainCategory === "partner" && i.category === "partner-site-investment" && i.amount === 75000,
    );
    expect(partnerOnProject?.projectId).toBeTruthy();
    const projectId = partnerOnProject!.projectId!;
    const withPartner = getProjectAmountReceived(projectId, hydrated.payments, hydrated.incomes);
    const withoutPartner = getProjectAmountReceived(
      projectId,
      hydrated.payments,
      hydrated.incomes.filter((i) => i.id !== partnerOnProject!.id),
    );
    expect(withPartner).toBe(withoutPartner);
    const project = hydrated.projects.find((p) => p.id === projectId);
    expect(Math.abs((project?.amountReceived ?? 0) - withPartner)).toBeLessThan(0.02);
  });
});
