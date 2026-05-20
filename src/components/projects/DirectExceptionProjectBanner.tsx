import { useNavigate } from "react-router-dom";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import {
  isDirectExceptionProject,
  projectDirectExceptionReason,
} from "@/lib/projectDirectException";

export type DirectExceptionProjectFields = {
  id: string;
  quotationId?: string | null;
  directCreationReason?: string | null;
};

/**
 * Prominent audit notice for projects created without an approved quotation (Md20 / T3).
 */
export function DirectExceptionProjectBanner({
  project,
  reasonOverride,
  className,
}: {
  project: DirectExceptionProjectFields;
  /** Same-session fallback when navigating immediately after create. */
  reasonOverride?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const persistedReason = projectDirectExceptionReason(project);
  const flashReason = reasonOverride?.trim() || null;
  const auditReason = persistedReason ?? flashReason;

  if (!auditReason && !isDirectExceptionProject(project)) {
    return null;
  }

  const hasQuotation = Boolean(project.quotationId?.trim());

  return (
    <LifecycleTerminalBanner
      variant="exception"
      title="Direct exception project"
      className={className}
      description={
        <span>
          Created without an approved quotation — management exception only.{" "}
          {!hasQuotation ? (
            <span className="text-foreground/90">No quotation is linked to this project.</span>
          ) : (
            <span className="text-foreground/90">
              A quotation id is on file, but this record was opened via the exception path.
            </span>
          )}{" "}
          <span className="font-medium text-foreground">Audit reason:</span> {auditReason}
        </span>
      }
      primaryActionLabel={hasQuotation ? "View quotation" : "Open projects list"}
      onPrimaryAction={() =>
        hasQuotation && project.quotationId
          ? navigate("/quotations", { state: { focusQuotationId: project.quotationId } })
          : navigate("/projects")
      }
      secondaryActionLabel="Audit logs"
      onSecondaryAction={() => navigate("/audit/audit-logs")}
    />
  );
}
