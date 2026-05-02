import type { CommercialBaseline, CommercialBaselineLine, ExecutionLineItem } from "@/types/project";
import type { Quotation } from "@/types/project";

/** Build immutable commercial baseline + execution rows from quotation material snapshot. */
export function commercialBaselineFromQuotation(q: Quotation): { baseline: CommercialBaseline; executionLineItems: ExecutionLineItem[] } {
  const mats = q.presetSnapshot ?? [];
  const lines: CommercialBaselineLine[] = mats.map((m, i) => {
    const id = `BL-${q.id}-${m.id}-${i}`;
    const qty = typeof m.quantity === "number" ? m.quantity : 0;
    const rate = typeof m.rate === "number" ? m.rate : 0;
    return {
      id,
      quotationMaterialId: m.id,
      inventoryItemId: typeof m.id === "number" ? m.id : undefined,
      description: m.name,
      quantity: qty,
      unit: m.unit,
      rate,
      total: qty * rate,
    };
  });

  const materialsTotal = lines.reduce((s, l) => s + l.total, 0);
  const baseline: CommercialBaseline = {
    id: `CB-${q.id}`,
    quotationId: q.id,
    customerId: q.customerId ?? "",
    capturedAt: new Date().toISOString(),
    lines,
    materialsTotal,
    servicesTotal: Math.max((q.totalAmount ?? 0) - materialsTotal, 0),
  };

  const executionLineItems: ExecutionLineItem[] = lines.map((l) => ({
    ...l,
    source: "quotation" as const,
    issuedQty: 0,
  }));

  return { baseline, executionLineItems };
}

/** Fallback baseline for non-quote intakes — single line from contract intent. */
export function commercialBaselineFromIntake(params: {
  projectId: string;
  contractAmount: number;
  summaryLine: string;
  customerId: string;
}): { baseline: CommercialBaseline; executionLineItems: ExecutionLineItem[] } {
  const baseline: CommercialBaseline = {
    id: `CB-${params.projectId}-intake`,
    capturedAt: new Date().toISOString(),
    customerId: params.customerId,
    lines: [
      {
        id: `BL-${params.projectId}-sum`,
        description: params.summaryLine,
        quantity: 1,
        unit: "job",
        rate: params.contractAmount,
        total: params.contractAmount,
      },
    ],
    materialsTotal: 0,
    servicesTotal: params.contractAmount,
  };
  const executionLineItems: ExecutionLineItem[] = baseline.lines.map((l) => ({
    ...l,
    source: "intake" as const,
    issuedQty: 0,
  }));
  return { baseline, executionLineItems };
}
