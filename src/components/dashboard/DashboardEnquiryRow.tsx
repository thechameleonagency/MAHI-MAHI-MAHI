import { Calendar, FileText, Send, Check, ExternalLink, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatEnquiryStatusLabel } from "@/lib/enquiryStatusUi";
import { getEnquiryDisplayStatus } from "@/lib/enquiryStatusReconcile";
import type { Enquiry, Quotation } from "@/types/project";
import { deepLink } from "@/lib/deepLinks";
import { getEnquiryViewActions } from "@/lib/enquiryViewActions";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { useCan } from "@/hooks/useCan";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { AgingChip } from "@/components/ui/AgingChip";
import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import { format } from "date-fns";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
  DropdownMenuSeparator,
  PermissionGatedMenuItem,
} from "@/components/dashboard/DashboardCompactRowMenu";

export function DashboardEnquiryRow({
  enquiry,
  quotations,
  onScheduleMeeting,
  onSendQuotation,
  onConvert,
  onCreateQuotation,
  onViewQuotation,
}: {
  enquiry: Enquiry;
  quotations: Quotation[];
  onScheduleMeeting: () => void;
  onSendQuotation: () => void;
  onConvert: () => void;
  onCreateQuotation: () => void;
  onViewQuotation: (quotationId: string) => void;
}) {
  const { currentRole } = useAppSession();
  const canUpdateEnquiry = useCan("enquiry", "create");
  const canCreateQuotation = useCan("quotation", "create");
  const aging = getEnquiryFollowUpAging(enquiry);
  const displayStatus = getEnquiryDisplayStatus(enquiry, quotations);
  const actions = getEnquiryViewActions(enquiry, quotations, currentRole);
  const hasWorkflowActions =
    actions.showScheduleMeeting ||
    actions.showSendQuotation ||
    actions.showCreateQuotation ||
    actions.showMarkAsConverted ||
    actions.showViewQuotation;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{enquiry.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {enquiry.customerPhone}
            {enquiry.followUpDate ? ` · Follow-up ${format(new Date(enquiry.followUpDate), "d MMM")}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={displayStatus}
              label={formatEnquiryStatusLabel(displayStatus)}
              className="text-2xs"
            />
            {aging && <AgingChip signal={aging} />}
            {enquiry.priority === "high" && (
              <Badge variant="outline" className="text-2xs border-warning/40 text-warning">
                High priority
              </Badge>
            )}
          </div>
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink
            to={deepLink.enquiry(enquiry.id)}
            icon={ExternalLink}
          >
            View enquiry
          </DashboardCompactRowMenuLink>
          {hasWorkflowActions && <DropdownMenuSeparator />}
          {actions.showScheduleMeeting && (
            <PermissionGatedMenuItem
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              icon={Calendar}
              onClick={onScheduleMeeting}
            >
              Schedule meeting
            </PermissionGatedMenuItem>
          )}
          {actions.showCreateQuotation && (
            <PermissionGatedMenuItem
              allowed={canCreateQuotation}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryCreateQuotation}
              icon={FileText}
              onClick={onCreateQuotation}
            >
              Create quotation
            </PermissionGatedMenuItem>
          )}
          {actions.showSendQuotation && (
            <PermissionGatedMenuItem
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              icon={Send}
              onClick={onSendQuotation}
            >
              Send quotation
            </PermissionGatedMenuItem>
          )}
          {actions.showMarkAsConverted && (
            <PermissionGatedMenuItem
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              icon={Check}
              onClick={onConvert}
            >
              Mark as converted
            </PermissionGatedMenuItem>
          )}
          {actions.showViewQuotation && actions.currentQuotationId && (
            <PermissionGatedMenuItem
              allowed
              icon={Eye}
              onClick={() => onViewQuotation(actions.currentQuotationId!)}
            >
              View quotation
            </PermissionGatedMenuItem>
          )}
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
