import { describe, expect, it } from "vitest";
import {
  buildQuotationTerminalBannerConfig,
  getQuotationTerminalKind,
  quotationTerminalRowClassName,
} from "@/lib/quotationTerminalUi";
import type { Quotation } from "@/types/project";

const base = (): Quotation =>
  ({
    id: "Q-1",
    quotationNumber: "QT-001",
    status: "draft",
    clientName: "Test",
  }) as Quotation;

describe("quotationTerminalUi (DS2)", () => {
  it("classifies withdrawn, rejected, and converted quotations", () => {
    expect(getQuotationTerminalKind({ ...base(), status: "withdrawn" })).toBe("withdrawn");
    expect(getQuotationTerminalKind({ ...base(), status: "rejected" })).toBe("rejected");
    expect(
      getQuotationTerminalKind({
        ...base(),
        status: "converted_to_project",
        linkedProjectId: "P-1",
      }),
    ).toBe("converted");
    expect(getQuotationTerminalKind({ ...base(), status: "approved" })).toBeNull();
  });

  it("buildQuotationTerminalBannerConfig exposes clone CTA for terminal non-converted rows", () => {
    const withdrawn = buildQuotationTerminalBannerConfig({ ...base(), status: "withdrawn" });
    expect(withdrawn?.primaryActionLabel).toBe("Clone & re-quote");
    const converted = buildQuotationTerminalBannerConfig({
      ...base(),
      status: "converted_to_project",
      linkedProjectId: "P-99",
    });
    expect(converted?.primaryActionLabel).toBe("View project");
    expect(converted?.secondaryActionLabel).toBe("Clone for new quote");
  });

  it("quotationTerminalRowClassName highlights terminal rows", () => {
    expect(quotationTerminalRowClassName("withdrawn")).toContain("border-l-4");
    expect(quotationTerminalRowClassName("converted")).toContain("success");
    expect(quotationTerminalRowClassName(null)).toBe("");
  });
});
