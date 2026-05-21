import type { ProjectChangeRequestMaterialDelta } from "@/types/operations";

export type MaterialDeltaLineInput = {
  itemId: string;
  deltaQty: string;
};

/** Normalize UI material lines into persisted change-request deltas. */
export function parseMaterialDeltaFromLines(
  lines: MaterialDeltaLineInput[],
): ProjectChangeRequestMaterialDelta[] {
  return lines
    .map((line) => ({
      itemId: String(line.itemId).trim(),
      deltaQty: Number.parseFloat(line.deltaQty) || 0,
    }))
    .filter((row) => row.itemId !== "" && row.deltaQty !== 0);
}

/** Guard for approval / replay paths (legacy rows may have used numeric-only filters). */
export function isApplicableMaterialDelta(
  md: ProjectChangeRequestMaterialDelta,
): boolean {
  return String(md.itemId).trim() !== "" && md.deltaQty !== 0;
}
