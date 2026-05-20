/** Qty above this requires a written reason in Notes (Mn15). */
export const MATERIAL_DAMAGE_NOTES_QTY_THRESHOLD = 5;

/** Cost impact (₹) above this requires a written reason in Notes (Mn15). */
export const MATERIAL_DAMAGE_NOTES_COST_THRESHOLD_INR = 5000;

export type MaterialDamageFormValues = {
  qty: number;
  costImpact?: number;
  notes: string;
};

export function materialDamageRequiresReason(values: MaterialDamageFormValues): boolean {
  if (values.qty > MATERIAL_DAMAGE_NOTES_QTY_THRESHOLD) return true;
  if (
    values.costImpact != null &&
    Number.isFinite(values.costImpact) &&
    values.costImpact > MATERIAL_DAMAGE_NOTES_COST_THRESHOLD_INR
  ) {
    return true;
  }
  return false;
}

export function materialDamageReasonHint(): string {
  return `Required when quantity is more than ${MATERIAL_DAMAGE_NOTES_QTY_THRESHOLD} or cost impact exceeds ₹${MATERIAL_DAMAGE_NOTES_COST_THRESHOLD_INR.toLocaleString("en-IN")}.`;
}

export { parsePhotoUrlLines } from "@/lib/photoUrlLines";

export function validateMaterialDamageForm(
  raw: {
    qty: string;
    costImpact: string;
    notes: string;
  },
): { ok: true; qty: number; cost?: number; notes?: string } | { ok: false; message: string } {
  const q = Number.parseFloat(raw.qty);
  if (!Number.isFinite(q) || q <= 0) {
    return { ok: false, message: "Enter a valid quantity greater than zero." };
  }

  let cost: number | undefined;
  const costTrim = raw.costImpact.trim();
  if (costTrim) {
    cost = Number.parseFloat(costTrim);
    if (!Number.isFinite(cost) || cost <= 0) {
      return {
        ok: false,
        message: "Enter a positive cost impact amount or leave the field empty.",
      };
    }
  }

  const notesTrim = raw.notes.trim();
  if (materialDamageRequiresReason({ qty: q, costImpact: cost, notes: notesTrim }) && !notesTrim) {
    return {
      ok: false,
      message: `Provide a reason in Notes. ${materialDamageReasonHint()}`,
    };
  }

  return {
    ok: true,
    qty: q,
    cost,
    notes: notesTrim || undefined,
  };
}
