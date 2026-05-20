import { useMemo, useState } from "react";
import { Link2, FileWarning } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LifecycleTermHint } from "@/components/ui/LifecycleTermHint";
import type { Enquiry } from "@/types/project";
import type { UserRole } from "@/domain/entities/identity";
import {
  enquiriesEligibleForQuotationCreate,
  MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH,
} from "@/lib/quotationCreateSource";

type Mode = "enquiry" | "exception";

export function QuotationCreateSourceGate({
  enquiries,
  actorRole,
  onConfirmEnquiry,
  onConfirmException,
  onCancel,
}: {
  enquiries: Enquiry[];
  actorRole: UserRole;
  onConfirmEnquiry: (enquiry: Enquiry) => void;
  onConfirmException: (reason: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("enquiry");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");

  const eligible = useMemo(
    () => enquiriesEligibleForQuotationCreate(enquiries, actorRole),
    [enquiries, actorRole],
  );

  const canContinueEnquiry = mode === "enquiry" && !!selectedEnquiryId;
  const canContinueException =
    mode === "exception" &&
    exceptionReason.trim().length >= MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH;

  const handleContinue = () => {
    if (mode === "enquiry") {
      const enquiry = eligible.find((e) => e.id === selectedEnquiryId);
      if (enquiry) onConfirmEnquiry(enquiry);
      return;
    }
    onConfirmException(exceptionReason.trim());
  };

  return (
    <Card className="max-w-2xl mx-auto border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">How is this quotation starting?</CardTitle>
        <CardDescription>
          MSS pipeline is enquiry → quotation → project. Link an enquiry when you can, or record why
          this quote is an exception.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "enquiry" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("enquiry")}
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            From an enquiry
          </Button>
          <Button
            type="button"
            variant={mode === "exception" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("exception")}
          >
            <FileWarning className="h-3.5 w-3.5 mr-1.5" />
            <span className="inline-flex items-center gap-1">
              No — exception
              <LifecycleTermHint term="quotationWithoutEnquiryException" side="bottom" />
            </span>
          </Button>
        </div>

        {mode === "enquiry" ? (
          <div className="space-y-2">
            <Label htmlFor="quotation-source-enquiry">Enquiry</Label>
            {eligible.length === 0 ? (
              <Alert>
                <AlertTitle>No open enquiries</AlertTitle>
                <AlertDescription>
                  There are no enquiries that can accept a new quotation right now. Use the
                  exception path and explain why this quote is standalone, or create an enquiry
                  first from{" "}
                  <a href="/enquiries" className="text-primary underline underline-offset-2">
                    Enquiries
                  </a>
                  .
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedEnquiryId} onValueChange={setSelectedEnquiryId}>
                <SelectTrigger id="quotation-source-enquiry">
                  <SelectValue placeholder="Select enquiry" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.id} — {e.customerName} ({e.status.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="quotation-source-exception" className="inline-flex items-center gap-1.5">
              Reason for quoting without enquiry
              <LifecycleTermHint term="quotationWithoutEnquiryException" side="right" align="start" />
            </Label>
            <Textarea
              id="quotation-source-exception"
              rows={3}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder={`e.g. Repeat customer called for add-on work; prior enquiry closed incorrectly (min ${MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH} characters)`}
            />
            <p className="text-xs text-muted-foreground">
              This reason is stored on the quotation for audit and appears on the form header.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={mode === "enquiry" ? !canContinueEnquiry : !canContinueException}
          >
            Continue to quotation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
