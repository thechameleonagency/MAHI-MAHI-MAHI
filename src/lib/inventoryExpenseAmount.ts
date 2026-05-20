/** Line total for material expense from inventory buy price × quantity. */
export function computeInventoryLineTotal(qty: number, buyPrice: number): number {
  const q = Number.isFinite(qty) ? qty : 0;
  const p = Number.isFinite(buyPrice) ? buyPrice : 0;
  return Math.round(q * p * 100) / 100;
}

/** True when the amount field has no user-entered commercial value. */
export function isExpenseAmountEmpty(amount: string | undefined | null): boolean {
  const trimmed = amount?.trim() ?? "";
  if (!trimmed) return true;
  const n = Number.parseFloat(trimmed);
  return !Number.isFinite(n) || n === 0;
}

/** Whether suggested inventory total differs from the current amount (₹0.01 tolerance). */
export function inventoryAmountDiffersFromSuggestion(
  currentAmount: string,
  suggestedTotal: number,
): boolean {
  const current = Number.parseFloat(currentAmount);
  if (!Number.isFinite(current)) return true;
  return Math.abs(current - suggestedTotal) > 0.01;
}
