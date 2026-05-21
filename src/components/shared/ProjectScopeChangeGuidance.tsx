import { Link } from "react-router-dom";
import { FileText, Info } from "lucide-react";
import { PROJECT_SCOPE_CHANGE_GUIDANCE, QUOTATION_ONE_SHOT_CONVERSION_HELP } from "@/lib/quotationProjectConversionPolicy";
import { cn } from "@/lib/utils";

type ProjectScopeChangeGuidanceProps = {
  projectId: string;
  quotationId?: string;
  quotationNumber?: string;
  className?: string;
};

/** E2 — explains one-shot quotation conversion and where to change scope post go-live. */
export function ProjectScopeChangeGuidance({
  projectId,
  quotationId,
  quotationNumber,
  className,
}: ProjectScopeChangeGuidanceProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground",
        className,
      )}
      role="note"
    >
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">Commercial baseline is frozen</p>
          <p className="text-2xs leading-snug text-muted-foreground">{QUOTATION_ONE_SHOT_CONVERSION_HELP}</p>
          <p className="text-2xs leading-snug text-muted-foreground">{PROJECT_SCOPE_CHANGE_GUIDANCE}</p>
          <div className="flex flex-wrap gap-2 pt-1 text-2xs">
            <Link
              to={`/projects/${projectId}?tab=financials`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <FileText className="h-3 w-3" aria-hidden />
              Change requests
            </Link>
            {quotationId && (
              <Link
                to="/quotations"
                state={{ focusQuotationId: quotationId }}
                className="text-primary hover:underline"
              >
                Source quotation{quotationNumber ? `: ${quotationNumber}` : ""}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
