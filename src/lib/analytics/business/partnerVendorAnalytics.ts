/**
 * Channel analytics: agents (referrals → conversions → commissions),
 * partners (project share + money flows), and vendors (spend, outstanding,
 * bill discipline).
 */
import type { Enquiry, Project, Vendor } from "@/types/project";
import type { Agent, AgentCommissionPayment, Partner, PartnerTransaction } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import {
  buildTimeSeries,
  inWindow,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

export interface AgentStats {
  agentId: string;
  name: string;
  status: string;
  referrals: number;
  converted: number;
  conversionPct: number;
  projectsWon: number;
  commissionPaid: number;
}

export interface PartnerStats {
  partnerId: string;
  name: string;
  active: boolean;
  projects: number;
  given: number;
  received: number;
  /** received − given within the window (positive = net inflow from partner). */
  net: number;
}

export interface VendorStats {
  vendorId: string;
  name: string;
  billCount: number;
  spend: number;
  paid: number;
  outstanding: number;
}

export interface ChannelAnalytics {
  agents: AgentStats[];
  totalCommissionPaid: number;
  commissionSeries: SeriesPoint[];
  partners: PartnerStats[];
  partnerGivenTotal: number;
  partnerReceivedTotal: number;
  partnerFlowSeries: { key: string; label: string; given: number; received: number }[];
  vendors: VendorStats[];
  vendorSpendTotal: number;
  vendorOutstandingTotal: number;
  billStatusMix: { status: string; count: number; amount: number }[];
}

const isGiven = (t: PartnerTransaction): boolean =>
  t.direction === "given" || t.type === "Given to Partner" || t.type === "Profit Payment";

export function computeChannelAnalytics(
  agents: Agent[],
  agentCommissionPayments: AgentCommissionPayment[],
  enquiries: Enquiry[],
  projects: Project[],
  partners: Partner[],
  partnerTransactions: PartnerTransaction[],
  vendors: Vendor[],
  vendorBills: VendorBill[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
): ChannelAnalytics {
  // ---- Agents.
  const commissionsInPeriod = agentCommissionPayments.filter((c) => inWindow(c.date, window));
  const enquiriesInPeriod = enquiries.filter((e) => inWindow(e.createdAt, window));
  const agentStats: AgentStats[] = agents
    .map((a) => {
      const referrals = enquiriesInPeriod.filter((e) => e.agentId === a.id);
      const converted = referrals.filter((e) => e.status === "converted").length;
      const projectsWon = projects.filter(
        (p) =>
          (p.agentId === a.id || p.scope?.agentId === a.id) &&
          inWindow(p.startDate || p.createdAt, window),
      ).length;
      const commissionPaid = commissionsInPeriod
        .filter((c) => c.agentId === a.id)
        .reduce((s, c) => s + c.amount, 0);
      return {
        agentId: a.id,
        name: a.name,
        status: a.status,
        referrals: referrals.length,
        converted,
        conversionPct: referrals.length ? Math.round((converted / referrals.length) * 100) : 0,
        projectsWon,
        commissionPaid: Math.round(commissionPaid),
      };
    })
    .filter((a) => a.referrals > 0 || a.projectsWon > 0 || a.commissionPaid > 0)
    .sort((a, b) => b.converted - a.converted || b.referrals - a.referrals);

  // ---- Partners.
  const txInPeriod = partnerTransactions.filter((t) => inWindow(t.date, window));
  const partnerStats: PartnerStats[] = partners
    .map((p) => {
      const tx = txInPeriod.filter((t) => t.partnerId === p.id);
      const given = tx.filter(isGiven).reduce((s, t) => s + t.amount, 0);
      const received = tx.filter((t) => !isGiven(t)).reduce((s, t) => s + t.amount, 0);
      const projectCount = projects.filter(
        (pr) => pr.scope?.partnerId === p.id && inWindow(pr.startDate || pr.createdAt, window),
      ).length;
      return {
        partnerId: p.id,
        name: p.name,
        active: !p.endedAt,
        projects: projectCount,
        given: Math.round(given),
        received: Math.round(received),
        net: Math.round(received - given),
      };
    })
    .filter((p) => p.projects > 0 || p.given > 0 || p.received > 0)
    .sort((a, b) => b.projects - a.projects || b.received - a.received);

  const partnerGivenSeries = buildTimeSeries(
    txInPeriod.filter(isGiven),
    (t) => t.date,
    window,
    granularity,
    (t) => t.amount,
  );
  const partnerReceivedSeries = buildTimeSeries(
    txInPeriod.filter((t) => !isGiven(t)),
    (t) => t.date,
    window,
    granularity,
    (t) => t.amount,
  );

  // ---- Vendors.
  const billsInPeriod = vendorBills.filter(
    (b) => b.status !== "draft" && inWindow(b.billDate, window),
  );
  const vendorNameById = new Map(vendors.map((v) => [String(v.id), v.name]));
  const vendorMap = new Map<string, VendorStats>();
  const billStatusMap = new Map<string, { count: number; amount: number }>();
  for (const b of billsInPeriod) {
    const id = String(b.vendorId);
    const entry =
      vendorMap.get(id) ??
      ({
        vendorId: id,
        name: b.vendorName || vendorNameById.get(id) || id,
        billCount: 0,
        spend: 0,
        paid: 0,
        outstanding: 0,
      } as VendorStats);
    entry.billCount++;
    entry.spend += b.total || 0;
    entry.paid += b.amountPaid || 0;
    entry.outstanding += Math.max(0, (b.total || 0) - (b.amountPaid || 0));
    vendorMap.set(id, entry);

    const st = billStatusMap.get(b.status) ?? { count: 0, amount: 0 };
    st.count++;
    st.amount += b.total || 0;
    billStatusMap.set(b.status, st);
  }
  const vendorStats = [...vendorMap.values()]
    .map((v) => ({
      ...v,
      spend: Math.round(v.spend),
      paid: Math.round(v.paid),
      outstanding: Math.round(v.outstanding),
    }))
    .sort((a, b) => b.spend - a.spend);

  return {
    agents: agentStats,
    totalCommissionPaid: Math.round(commissionsInPeriod.reduce((s, c) => s + c.amount, 0)),
    commissionSeries: buildTimeSeries(commissionsInPeriod, (c) => c.date, window, granularity, (c) => c.amount),
    partners: partnerStats,
    partnerGivenTotal: Math.round(txInPeriod.filter(isGiven).reduce((s, t) => s + t.amount, 0)),
    partnerReceivedTotal: Math.round(
      txInPeriod.filter((t) => !isGiven(t)).reduce((s, t) => s + t.amount, 0),
    ),
    partnerFlowSeries: partnerGivenSeries.map((g, i) => ({
      key: g.key,
      label: g.label,
      given: g.value,
      received: partnerReceivedSeries[i]?.value ?? 0,
    })),
    vendors: vendorStats,
    vendorSpendTotal: Math.round(billsInPeriod.reduce((s, b) => s + (b.total || 0), 0)),
    vendorOutstandingTotal: Math.round(
      billsInPeriod.reduce((s, b) => s + Math.max(0, (b.total || 0) - (b.amountPaid || 0)), 0),
    ),
    billStatusMix: [...billStatusMap.entries()]
      .map(([status, v]) => ({ status, count: v.count, amount: Math.round(v.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
