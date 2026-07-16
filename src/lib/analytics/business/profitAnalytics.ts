/**
 * Profitability analytics: per-project profit / profit-per-kW with variance
 * against the company average, grouped by project type, plus cash-flow trends.
 */
import type { Project } from "@/types/project";
import type { Expense, Payment } from "@/types/finance";
import { calculateProjectProfitDerived } from "@/domain/partners/derivePartnerEconomics";
import { parseKw } from "./geoAnalytics";
import {
  buildTimeSeries,
  inWindow,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

export interface ProjectProfitRow {
  id: string;
  name: string;
  type: string;
  kw: number;
  contractAmount: number;
  profit: number;
  profitPerKw: number | null;
  marginPct: number | null;
  /** profitPerKw − company average (null when either side is unknown). */
  variancePerKw: number | null;
}

export interface ProfitByType {
  type: string;
  count: number;
  totalProfit: number;
  totalKw: number;
  avgProfitPerKw: number | null;
  avgMarginPct: number | null;
}

export interface ProfitAnalytics {
  rows: ProjectProfitRow[];
  byType: ProfitByType[];
  companyAvgProfitPerKw: number | null;
  totalRevenueIn: number;
  totalExpenses: number;
  netCash: number;
  revenueSeries: SeriesPoint[];
  expenseSeries: SeriesPoint[];
  cashFlowSeries: { key: string; label: string; revenue: number; expenses: number; net: number }[];
}

const projectDateIso = (p: Project): string | undefined => p.startDate || p.createdAt;

export function computeProfitAnalytics(
  projects: Project[],
  expenses: Expense[],
  payments: Payment[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
): ProfitAnalytics {
  const inPeriod = projects.filter((p) => !p.archivedAt && inWindow(projectDateIso(p), window));

  const baseRows = inPeriod.map((p) => {
    const kw = parseKw(p.capacity);
    const profit = calculateProjectProfitDerived(p, expenses);
    return {
      id: p.id,
      name: p.name,
      type: p.projectType || "Other",
      kw,
      contractAmount: p.contractAmount || 0,
      profit,
      profitPerKw: kw > 0 ? Math.round(profit / kw) : null,
      marginPct:
        p.contractAmount && p.contractAmount > 0
          ? Math.round((profit / p.contractAmount) * 100)
          : null,
    };
  });

  const perKwValues = baseRows
    .map((r) => r.profitPerKw)
    .filter((v): v is number => v !== null);
  const companyAvgProfitPerKw = perKwValues.length
    ? Math.round(perKwValues.reduce((a, b) => a + b, 0) / perKwValues.length)
    : null;

  const rows: ProjectProfitRow[] = baseRows
    .map((r) => ({
      ...r,
      variancePerKw:
        r.profitPerKw !== null && companyAvgProfitPerKw !== null
          ? r.profitPerKw - companyAvgProfitPerKw
          : null,
    }))
    .sort((a, b) => b.profit - a.profit);

  const typeGroups = new Map<string, ProjectProfitRow[]>();
  for (const r of rows) {
    const list = typeGroups.get(r.type);
    if (list) list.push(r);
    else typeGroups.set(r.type, [r]);
  }
  const byType: ProfitByType[] = [...typeGroups.entries()]
    .map(([type, list]) => {
      const perKw = list.map((r) => r.profitPerKw).filter((v): v is number => v !== null);
      const margins = list.map((r) => r.marginPct).filter((v): v is number => v !== null);
      return {
        type,
        count: list.length,
        totalProfit: Math.round(list.reduce((s, r) => s + r.profit, 0)),
        totalKw: Math.round(list.reduce((s, r) => s + r.kw, 0) * 100) / 100,
        avgProfitPerKw: perKw.length
          ? Math.round(perKw.reduce((a, b) => a + b, 0) / perKw.length)
          : null,
        avgMarginPct: margins.length
          ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
          : null,
      };
    })
    .sort((a, b) => b.totalProfit - a.totalProfit);

  const paymentsIn = payments.filter((p) => p.direction === "in");
  const revenueSeries = buildTimeSeries(paymentsIn, (p) => p.date, window, granularity, (p) => p.amount);
  const expenseSeries = buildTimeSeries(expenses, (e) => e.date, window, granularity, (e) => e.amount);
  const cashFlowSeries = revenueSeries.map((r, i) => ({
    key: r.key,
    label: r.label,
    revenue: r.value,
    expenses: expenseSeries[i]?.value ?? 0,
    net: Math.round((r.value - (expenseSeries[i]?.value ?? 0)) * 100) / 100,
  }));

  const totalRevenueIn = Math.round(revenueSeries.reduce((s, p) => s + p.value, 0));
  const totalExpenses = Math.round(expenseSeries.reduce((s, p) => s + p.value, 0));

  return {
    rows,
    byType,
    companyAvgProfitPerKw,
    totalRevenueIn,
    totalExpenses,
    netCash: totalRevenueIn - totalExpenses,
    revenueSeries,
    expenseSeries,
    cashFlowSeries,
  };
}
