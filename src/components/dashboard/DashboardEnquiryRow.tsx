import { Link } from "react-router-dom";
import { Calendar, FileText, Send, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import type { Enquiry } from "@/types/project";
import { enquiryAllowsNewQuotation } from "@/lib/enquiryQuotationCreateGate";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { useCan } from "@/hooks/useCan";
import { AgingChip } from "@/components/ui/AgingChip";
import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import { format } from "date-fns";

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
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{enquiry.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {enquiry.customerPhone}
            {enquiry.followUpDate ? ` · Follow-up ${format(new Date(enquiry.followUpDate), "d MMM")}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="capitalize text-2xs">
              {enquiry.status.replace(/_/g, " ")}
            </Badge>
            {aging && <AgingChip signal={aging} />}
            {enquiry.priority === "high" && (
              <Badge variant="outline" className="text-2xs border-warning/40 text-warning">
                High priority
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/enquiries" state={{ focusEnquiryId: enquiry.id }}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(enquiry.status === "new" || enquiry.status === "meeting_scheduled") && (
          <>
            <PermissionGatedButton
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onScheduleMeeting}
            >
              <Calendar className="mr-1 h-3 w-3" />
              Schedule
            </PermissionGatedButton>
            <PermissionGatedButton
              allowed={canUpdateEnquiry}
              deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onSendQuotation}
            >
              <Send className="mr-1 h-3 w-3" />
              Mark quote sent
            </PermissionGatedButton>
          </>
        )}
        {enquiry.status === "quotation_sent" && (
          <PermissionGatedButton
            allowed={canUpdateEnquiry}
            deniedHint={PERMISSION_DENIED_HINTS.enquiryUpdate}
            size="sm"
            className="h-7 text-xs"
            onClick={onConvert}
          >
            <Check className="mr-1 h-3 w-3" />
            Mark converted
          </PermissionGatedButton>
        )}
        {enquiry.status === "quotation_rejected" && enquiryAllowsNewQuotation(enquiry) && (
          <PermissionGatedButton
            allowed={canCreateQuotation}
            deniedHint={PERMISSION_DENIED_HINTS.enquiryCreateQuotation}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onCreateQuotation}
          >
            <FileText className="mr-1 h-3 w-3" />
            Create new quotation
          </PermissionGatedButton>
        )}
      </div>
    </div>
  );
}
