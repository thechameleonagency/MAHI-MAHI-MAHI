import { Calendar, FileText, Send, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatEnquiryStatusLabel } from "@/lib/enquiryStatusUi";
import type { Enquiry } from "@/types/project";
import { enquiryAllowsNewQuotation } from "@/lib/enquiryQuotationCreateGate";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { useCan } from "@/hooks/useCan";
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
  onScheduleMeeting,
  onSendQuotation,
  onConvert,
  onCreateQuotation,
}: {
  enquiry: Enquiry;
  onScheduleMeeting: () => void;
  onSendQuotation: () => void;
  onConvert: () => void;
  onCreateQuotation: () => void;
}) {
  const canUpdateEnquiry = useCan("enquiry", "create");
  const canCreateQuotation = useCan("quotation", "create");
  const aging = getEnquiryFollowUpAging(enquiry);
  const showPipelineActions =
    enquiry.status === "new" || enquiry.status === "meeting_scheduled";
  const showConvert = enquiry.status === "quotation_sent";
  const showNewQuotation =
    enquiry.status === "quotation_rejected" && enquiryAllowsNewQuotation(enquiry);
  const hasWorkflowActions = showPipelineActions || showConvert || showNewQuotation;

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
              status={enquiry.status}
              label={formatEnquiryStatusLabel(enquiry.status)}
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
            to="/enquiries"
            state={{ focusEnquiryId: enquiry.id }}
            icon={ExternalLink}
          >
            View in enquiries
          </DashboardCompactRowMenuLink>
          {hasWorkflowActions && <DropdownMenuSeparator />}
          {showPipelineActions && (
            <>
              <PermissionGatedMenuItem
                allowed={canUpdateEnquiry}
                deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
                icon={Calendar}
                onClick={onScheduleMeeting}
              >
                Schedule meeting
              </PermissionGatedMenuItem>
              <PermissionGatedMenuItem
                allowed={canUpdateEnquiry}
                deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
                icon={Send}
                onClick={onSendQuotation}
              >
                Mark quote sent
              </PermissionGatedMenuItem>
            </>
          )}
          {showConvert && (
            <PermissionGatedMenuItem
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              icon={Check}
              onClick={onConvert}
            >
              Mark converted
            </PermissionGatedMenuItem>
          )}
          {showNewQuotation && (
            <PermissionGatedMenuItem
              allowed={canCreateQuotation}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryCreateQuotation}
              icon={FileText}
              onClick={onCreateQuotation}
            >
              Create new quotation
            </PermissionGatedMenuItem>
          )}
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
