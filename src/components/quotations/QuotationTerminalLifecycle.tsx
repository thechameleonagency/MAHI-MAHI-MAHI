import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildQuotationTerminalBannerConfig,
  getQuotationTerminalKind,
  type QuotationTerminalBannerConfig,
} from "@/lib/quotationTerminalUi";
import type { Quotation } from "@/types/project";

type QuotationPick = Pick<
  Quotation,
  | "status"
  | "linkedProjectId"
  | "convertedToProjectId"
  | "quotationNumber"
  | "withdrawnReason"
  | "rejectionReason"
>;

export function QuotationTerminalLifecycleBanner({
  quotation,
  onClone,
  onViewProject,
  className,
}: {
  quotation: QuotationPick;
  onClone?: () => void;
  onViewProject?: () => void;
  className?: string;
}) {
  const config = buildQuotationTerminalBannerConfig(quotation);
  if (!config) return null;

  const primary =
    config.kind === "converted"
      ? config.primaryActionLabel && onViewProject
        ? { label: config.primaryActionLabel, action: onViewProject }
        : undefined
      : config.primaryActionLabel && onClone
        ? { label: config.primaryActionLabel, action: onClone }
        : undefined;

  const secondary =
    config.kind === "converted" && config.secondaryActionLabel && onClone
      ? { label: config.secondaryActionLabel, action: onClone }
      : undefined;

  return (
    <LifecycleTerminalBanner
      className={className}
      variant={config.variant}
      title={config.title}
      description={config.description}
      primaryActionLabel={primary?.label}
      onPrimaryAction={primary?.action}
      secondaryActionLabel={secondary?.label}
      onSecondaryAction={secondary?.action}
    />
  );
}

/** Compact list-row cue (matches enquiry terminal inline pattern). */
export function QuotationTerminalListCue({
  quotation,
  onClone,
  onViewProject,
  className,
}: {
  quotation: QuotationPick;
  onClone?: () => void;
  onViewProject?: () => void;
  className?: string;
}) {
  const config = buildQuotationTerminalBannerConfig(quotation);
  if (!config) return null;

  const tone =
    config.kind === "converted"
      ? "border-success/30 bg-success/10 text-foreground"
      : "border-warning/40 bg-warning/10 text-foreground";

  return (
    <div
      className={cn(
        "mt-1.5 flex flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-2xs leading-snug",
        tone,
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      role="status"
    >
      <span className="min-w-0">{config.listCue}</span>
      {config.kind === "converted" && onViewProject && config.primaryActionLabel ? (
        <Button type="button" variant="link" className="h-auto p-0 text-2xs font-semibold" onClick={onViewProject}>
          {config.primaryActionLabel}
        </Button>
      ) : null}
      {onClone ? (
        <Button type="button" variant="link" className="h-auto p-0 text-2xs font-semibold" onClick={onClone}>
          {config.kind === "converted" ? "Clone for new quote" : "Clone & re-quote"}
        </Button>
      ) : null}
    </div>
  );
}

export { getQuotationTerminalKind, buildQuotationTerminalBannerConfig };
export type { QuotationTerminalBannerConfig };
