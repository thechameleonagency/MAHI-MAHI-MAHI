import { WORK_STATUS_STAGES } from "@/types/blockage";

/** Stage key → material name keywords (matches Progress Report transport sub-items). */
export const TRANSPORT_MATERIAL_KEYWORDS: Record<string, string[]> = {
  structure: ["structure", "mounting", "rail", "clamp", "l-angle", "channel", "gi"],
  panel: ["panel", "solar", "module", "waaree", "540w", "mono"],
  inverter: ["inverter", "growatt"],
  civil: ["cement", "sand", "chemical", "pharma"],
};

export type MaterialSentLine = {
  itemName: string;
  quantity: number;
};

function matchesKeywords(itemName: string, keywords: string[]): boolean {
  const lower = itemName.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/** Total issued quantity for materials matching this work stage. */
export function sumTransportedQtyForStage(
  stageKey: string,
  materialsSent: MaterialSentLine[] | undefined,
): number {
  const keywords = TRANSPORT_MATERIAL_KEYWORDS[stageKey] ?? [];
  if (!keywords.length) return 0;
  return (materialsSent ?? []).reduce((sum, line) => {
    if (matchesKeywords(line.itemName, keywords)) {
      return sum + Math.max(0, line.quantity ?? 0);
    }
    return sum;
  }, 0);
}

/** Whether any material line has been issued for this stage's transport keywords. */
export function hasTransportMaterialForStage(
  stageKey: string,
  materialsSent: MaterialSentLine[] | undefined,
): boolean {
  const keywords = TRANSPORT_MATERIAL_KEYWORDS[stageKey] ?? [];
  if (!keywords.length) return false;
  return (materialsSent ?? []).some((line) => matchesKeywords(line.itemName, keywords));
}

/** Count transport sub-items on a stage that still have no matching issued material. */
export function countPendingTransportSubItems(
  stageKey: string,
  materialsSent: MaterialSentLine[] | undefined,
): number {
  const stage = WORK_STATUS_STAGES.find((s) => s.value === stageKey);
  if (!stage?.subItems?.length) return 0;
  const hasMaterial = hasTransportMaterialForStage(stageKey, materialsSent);
  const transportSubs = stage.subItems.filter((sub) => sub.value.includes("transport"));
  if (transportSubs.length === 0) return 0;
  return hasMaterial ? 0 : transportSubs.length;
}
