import type { AnalyticsSlices, MetricRow } from "./types";

export interface CustomerMetrics {
  byKind: Record<string, number>;
  archived: number;
  repeatCustomers: number;
  summaryRows: MetricRow[];
}

export function computeCustomerMetrics(slices: AnalyticsSlices): CustomerMetrics {
  const { customers, projects, invoices } = slices;
  const byKind: Record<string, number> = { project: 0, inventory: 0, both: 0 };
  let archived = 0;

  for (const c of customers) {
    const kind = c.customerKind ?? "project";
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (c.archivedAt) archived++;
  }

  const projectCountByCustomer = new Map<string, number>();
  for (const p of projects) {
    if (!p.customerId) continue;
    projectCountByCustomer.set(
      p.customerId,
      (projectCountByCustomer.get(p.customerId) ?? 0) + 1,
    );
  }
  const repeatCustomers = [...projectCountByCustomer.values()].filter((n) => n > 1).length;

  const ltvSample = customers.slice(0, 20).map((c) => {
    const rev = invoices
      .filter((i) => i.customerId === c.id && i.status !== "voided")
      .reduce((s, i) => s + (i.amountReceived ?? 0), 0);
    return { id: c.id, name: c.name, revenue: rev };
  });

  const summaryRows: MetricRow[] = [
    { label: "Project customers", value: byKind.project ?? 0 },
    { label: "Inventory customers", value: byKind.inventory ?? 0 },
    { label: "Both", value: byKind.both ?? 0 },
    { label: "Archived", value: archived },
    { label: "Repeat (2+ projects)", value: repeatCustomers },
    {
      label: "Top LTV (sample)",
      value: ltvSample.sort((a, b) => b.revenue - a.revenue)[0]?.name ?? "—",
    },
  ];

  return { byKind, archived, repeatCustomers, summaryRows };
}
