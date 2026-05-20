import { describe, expect, it } from "vitest";
import {
  computeInventoryLineTotal,
  inventoryAmountDiffersFromSuggestion,
  isExpenseAmountEmpty,
} from "@/lib/inventoryExpenseAmount";

describe("inventoryExpenseAmount", () => {
  it("computes qty × buyPrice rounded to paise", () => {
    expect(computeInventoryLineTotal(10, 125.555)).toBe(1255.55);
  });

  it("treats blank and zero as empty amount", () => {
    expect(isExpenseAmountEmpty("")).toBe(true);
    expect(isExpenseAmountEmpty("  ")).toBe(true);
    expect(isExpenseAmountEmpty("0")).toBe(true);
    expect(isExpenseAmountEmpty("5000")).toBe(false);
  });

  it("detects when current amount differs from inventory suggestion", () => {
    expect(inventoryAmountDiffersFromSuggestion("5000", 1200)).toBe(true);
    expect(inventoryAmountDiffersFromSuggestion("1200", 1200)).toBe(false);
    expect(inventoryAmountDiffersFromSuggestion("1200.005", 1200)).toBe(false);
  });
});
