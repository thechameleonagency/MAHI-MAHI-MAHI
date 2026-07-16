import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Enquiry, Project, Vendor } from "@/types/project";
import type { Agent, AgentCommissionPayment, Partner, PartnerTransaction } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import { formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";
import {
  computeChannelAnalytics,
  type BusinessGranularity,
  type BusinessWindow,
} from "@/lib/analytics/business";
import {
  ChartCard,
  CHART_COLORS,
  COLOR_COST,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_WARNING,
  MetricTiles,
} from "./ChartCard";

export function ChannelsTab({
  agents,
  agentCommissionPayments,
  enquiries,
  projects,
  partners,
  partnerTransactions,
  vendors,
  vendorBills,
  window,
  granularity,
}: {
  agents: Agent[];
  agentCommissionPayments: AgentCommissionPayment[];
  enquiries: Enquiry[];
  projects: Project[];
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
  vendors: Vendor[];
  vendorBills: VendorBill[];
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [agentStatusFilter, setAgentStatusFilter] = useState("all");

  const a = useMemo(
    () =>
      computeChannelAnalytics(
        agentStatusFilter === "all" ? agents : agents.filter((x) => x.status === agentStatusFilter),
        agentCommissionPayments,
        enquiries,
        projects,
        partners,
        partnerTransactions,
        vendors,
        vendorBills,
        window,
        granularity,
      ),
    [
      agents, agentCommissionPayments, enquiries, projects, partners, partnerTransactions,
      vendors, vendorBills, window, granularity, agentStatusFilter,
    ],
  );

  const topVendors = a.vendors.slice(0, 10);

  return (
    <div className="space-y-4">
      <MetricTiles
        tiles={[
          { label: "Active referral agents", value: a.agents.length },
          { label: "Commission paid", value: formatINRCompact(a.totalCommissionPaid) },
          { label: "Partners in play", value: a.partners.length },
          {
            label: "Partner net flow",
            value: formatINRCompact(a.partnerReceivedTotal - a.partnerGivenTotal),
            sub: `in ${formatINRCompact(a.partnerReceivedTotal)} / out ${formatINRCompact(a.partnerGivenTotal)}`,
          },
          { label: "Vendor spend", value: formatINRCompact(a.vendorSpendTotal) },
          { label: "Vendor outstanding", value: formatINRCompact(a.vendorOutstandingTotal) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Agent leaderboard"
          description="Referrals → conversions, with commission paid"
          action={
            <Select value={agentStatusFilter} onValueChange={setAgentStatusFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {a.agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No agent activity in range.
            </p>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {a.agents.map((agent, i) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-sm font-medium text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.referrals} referrals · {agent.converted} converted ({agent.conversionPct}%) ·{" "}
                        {agent.projectsWon} projects
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 tabular-nums">
                    {formatINRCompact(agent.commissionPaid)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Commission payouts" description="Agent commissions paid per period">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.commissionSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="value" name="Commission" fill={COLOR_WARNING} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Partner money flow" description="Given to vs received from partners">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={a.partnerFlowSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="received" name="Received" fill={COLOR_SUCCESS} radius={[3, 3, 0, 0]} />
              <Bar dataKey="given" name="Given" fill={COLOR_COST} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
          {a.partners.length > 0 && (
            <div className="mt-2 max-h-[140px] space-y-1 overflow-y-auto pr-1">
              {a.partners.map((p) => (
                <div key={p.partnerId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    {p.name}
                    {!p.active && <span className="text-muted-foreground"> (ended)</span>}
                    <span className="text-muted-foreground"> · {p.projects} projects</span>
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      p.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {p.net >= 0 ? "+" : ""}
                    {formatINRCompact(p.net)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Vendor spend" description="Top vendors by billed amount, with open balance">
          {topVendors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vendor bills in range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(160, topVendors.length * 26)}>
                <BarChart data={topVendors} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="paid" name="Paid" stackId="v" fill={COLOR_SUCCESS} />
                  <Bar dataKey="outstanding" name="Outstanding" stackId="v" fill={COLOR_COST} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.billStatusMix.map((s, i) => (
                  <Badge key={s.status} variant="outline" className="text-2xs">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {s.status}: {s.count} · {formatINRCompact(s.amount)}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
