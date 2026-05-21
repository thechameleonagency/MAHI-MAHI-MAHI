import { describe, expect, it } from "vitest";

import { applyQuotationPatch } from "@/domain/quotation/applyQuotationPatch";
import { buildQuotationCloneDraft } from "@/lib/createFromContext";
import {
  PROJECT_SCOPE_CHANGE_GUIDANCE,
  QUOTATION_ONE_SHOT_CONVERSION_HELP,
  canEditQuotationFields,
  rejectQuotationTerminalEdit,
  rejectSecondProjectFromQuotation,
} from "@/lib/quotationProjectConversionPolicy";
import type { Quotation } from "@/types/project";

const convertedQuotation = (): Quotation => ({
  id: "Q-CONV",
  quotationNumber: "Q-001",
  status: "converted_to_project",
  quotationType: "solar",
  clientName: "Client",
  clientPhone: "9000000001",
  clientEmail: "c@x.com",
  clientCity: "J",
  clientState: "RJ",
  systemCategory: "residential",
  systemCapacity: "5",
  paymentType: "cash",
  totalAmount: 100_000,
  linkedProjectId: "PROJ-1",
  createdAt: "2026-01-01",
});

describe("E2 quotation → project one-shot conversion", () => {
  it("documents one-shot and scope-change guidance", () => {
    expect(QUOTATION_ONE_SHOT_CONVERSION_HELP).toContain("one");
    expect(PROJECT_SCOPE_CHANGE_GUIDANCE).toContain("Change requests");
  });

  it("rejectSecondProjectFromQuotation blocks a second project", () => {
    const reject = rejectSecondProjectFromQuotation(convertedQuotation());
    expect(reject.ok).toBe(false);
    if (reject.ok) return;
    expect(reject.code).toBe("QUOTATION_ALREADY_CONVERTED");
  });

  it("rejectQuotationTerminalEdit blocks field updates on converted quotes", () => {
    const reject = rejectQuotationTerminalEdit(convertedQuotation(), { clientName: "New Name" });
    expect(reject.ok).toBe(false);
    expect(canEditQuotationFields(convertedQuotation())).toBe(false);
  });

  it("applyQuotationPatch rejects mutations on converted quotations", () => {
    const result = applyQuotationPatch(convertedQuotation(), { notes: "try edit" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("QUOTATION_TERMINAL");
  });

  it("buildQuotationCloneDraft omits project link (new quotation, not re-conversion)", () => {
    const draft = buildQuotationCloneDraft(convertedQuotation());
    expect(draft.banner).toContain("new quotation");
    expect("linkedProjectId" in draft).toBe(false);
    expect("status" in draft).toBe(false);
  });
});
