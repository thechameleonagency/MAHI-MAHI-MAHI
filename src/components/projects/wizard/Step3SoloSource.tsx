import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, FileText, Sparkles } from "lucide-react";
import {
  prefillUnifiedWizardFromEnquiry,
  prefillUnifiedWizardFromQuotation,
} from "@/lib/buildProjectFromUnifiedWizardState";

export function Step3SoloSource() {
  const { soloPipeline, selectedEnquiryId, selectedQuotationId, setField, hydrateFromPrefill } =
    useWizardStore();
  const { enquiries, quotations, getProjectEligibleQuotations } = useAppData();

  const eligibleQuotations = getProjectEligibleQuotations();
  const openEnquiries = enquiries.filter((e) => e.status !== "converted" && e.status !== "lost");

  const applyPrefill = (patch: ReturnType<typeof prefillUnifiedWizardFromEnquiry>) => {
    hydrateFromPrefill(patch);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Pipeline Source</h3>
        <p className="text-sm text-muted-foreground">
          For solo EPC projects, start fresh or attach an existing enquiry or approved quotation.
        </p>
      </div>

      <RadioGroup
        value={soloPipeline}
        onValueChange={(val) => {
          setField("soloPipeline", val as typeof soloPipeline);
          setField("selectedEnquiryId", undefined);
          setField("selectedQuotationId", undefined);
        }}
        className="grid grid-cols-1 gap-3"
      >
        <Label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/30">
          <RadioGroupItem value="new" className="mt-1" />
          <div>
            <span className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> New project
            </span>
            <p className="text-sm text-muted-foreground">Enter customer and system details manually.</p>
          </div>
        </Label>
        <Label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/30">
          <RadioGroupItem value="enquiry" className="mt-1" />
          <div>
            <span className="font-medium flex items-center gap-2">
              <FileSearch className="h-4 w-4" /> Attach enquiry
            </span>
            <p className="text-sm text-muted-foreground">Prefill from an open CRM enquiry.</p>
          </div>
        </Label>
        <Label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/30">
          <RadioGroupItem value="quotation" className="mt-1" />
          <div>
            <span className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Attach quotation
            </span>
            <p className="text-sm text-muted-foreground">Convert an approved, unlinked quotation.</p>
          </div>
        </Label>
      </RadioGroup>

      {soloPipeline === "enquiry" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select enquiry</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEnquiryId}
              onValueChange={(id) => {
                setField("selectedEnquiryId", id);
                const enquiry = openEnquiries.find((e) => e.id === id);
                if (enquiry) applyPrefill(prefillUnifiedWizardFromEnquiry(enquiry));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose enquiry" />
              </SelectTrigger>
              <SelectContent>
                {openEnquiries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.customerName} — {e.systemCapacity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {soloPipeline === "quotation" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select quotation</CardTitle>
            <CardDescription>Approved quotations not yet linked to a project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedQuotationId}
              onValueChange={(id) => {
                setField("selectedQuotationId", id);
                const quotation = eligibleQuotations.find((q) => q.id === id);
                if (quotation) {
                  const linkedEnquiry = quotation.enquiryId
                    ? enquiries.find((e) => e.id === quotation.enquiryId)
                    : undefined;
                  applyPrefill(prefillUnifiedWizardFromQuotation(quotation, linkedEnquiry));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose quotation" />
              </SelectTrigger>
              <SelectContent>
                {eligibleQuotations.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quotationNumber ?? q.id} — {q.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
