import { lifecycleTermSummary } from "@/lib/lifecycleTerminology";
import {
  PROJECT_SCOPE_CHANGE_GUIDANCE,
  QUOTATION_ONE_SHOT_CONVERSION_HELP,
} from "@/lib/quotationProjectConversionPolicy";
import { isQuotationConverted, quotationLinkedProjectId } from "@/lib/quotationProjectLink";
import type { Quotation } from "@/types/project";

export type QuotationTerminalKind = "withdrawn" | "rejected" | "converted";

type TerminalVariant = "withdrawn" | "rejected" | "completed";

export type QuotationTerminalBannerConfig = {
  kind: QuotationTerminalKind;
  variant: TerminalVariant;
  title: string;
  description: string;
  listCue: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

export function getQuotationTerminalKind(
  quotation: Pick<Quotation, "status" | "linkedProjectId" | "convertedToProjectId">,
): QuotationTerminalKind | null {
  if (quotation.status === "withdrawn") return "withdrawn";
  if (quotation.status === "rejected") return "rejected";
  if (isQuotationConverted(quotation)) return "converted";
  return null;
}

export function quotationTerminalRowClassName(kind: QuotationTerminalKind | null): string {
  if (!kind) return "";
  if (kind === "converted") {
    return "border-l-4 border-l-success/50 bg-success/[0.04]";
  }
  return "border-l-4 border-l-warning/60 bg-warning/[0.06]";
}

export function buildQuotationTerminalBannerConfig(
  quotation: Pick<
    Quotation,
    "status" | "linkedProjectId" | "convertedToProjectId" | "quotationNumber" | "withdrawnReason" | "rejectionReason"
  >,
): QuotationTerminalBannerConfig | null {
  const kind = getQuotationTerminalKind(quotation);
  if (!kind) return null;

  const projectId = quotationLinkedProjectId(quotation);

  if (kind === "withdrawn") {
    return {
      kind,
      variant: "withdrawn",
      title: `Quotation withdrawn — ${quotation.quotationNumber}`,
      description: `${lifecycleTermSummary("quotationWithdraw")} It cannot be revised — clone to start a new draft.`,
      listCue: lifecycleTermSummary("quotationWithdraw"),
      primaryActionLabel: "Clone & re-quote",
    };
  }

  if (kind === "rejected") {
    return {
      kind,
      variant: "rejected",
      title: `Quotation rejected — ${quotation.quotationNumber}`,
      description: `${lifecycleTermSummary("quotationReject")} Clone to revise pricing and re-quote.`,
      listCue: lifecycleTermSummary("quotationReject"),
      primaryActionLabel: "Clone & re-quote",
    };
  }

  return {
    kind,
    variant: "completed",
    title: `Converted to project — ${quotation.quotationNumber}`,
    description: `${QUOTATION_ONE_SHOT_CONVERSION_HELP} ${PROJECT_SCOPE_CHANGE_GUIDANCE}`,
    listCue: projectId
      ? `Linked to project ${projectId} — read-only quotation.`
      : "Converted to project — read-only quotation.",
    primaryActionLabel: projectId ? "View project" : undefined,
    secondaryActionLabel: "Clone for new quote",
  };
}
