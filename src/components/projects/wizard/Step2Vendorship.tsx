import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Handshake } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { skipVendorshipStep, suggestVendorshipFee, requiresVendorshipFeeInput } from "@/lib/unifiedProjectWizardFlow";
import type { ProjectPaymentType } from "@/domain/project/projectPaymentType";

export function Step2Vendorship() {
  const {
    dealOrigin,
    vendorshipOwner,
    vendorshipCompanyId,
    vendorshipFeeAmount,
    paymentType,
    capacityKw,
    setField,
  } = useWizardStore();
  const { vendorshipCompanies } = useAppData();
  const state = useWizardStore();

  useEffect(() => {
    const needsFee = requiresVendorshipFeeInput({ dealOrigin, vendorshipOwner });
    if (needsFee && capacityKw > 0 && vendorshipFeeAmount === undefined) {
      setField("vendorshipFeeAmount", suggestVendorshipFee(capacityKw));
    }
    if (!needsFee && vendorshipFeeAmount !== undefined) {
      setField("vendorshipFeeAmount", undefined);
    }
  }, [dealOrigin, vendorshipOwner, capacityKw, vendorshipFeeAmount, setField]);

  if (skipVendorshipStep(state)) {
    return null;
  }

  const suggestedFee = suggestVendorshipFee(capacityKw);
  const showVendorshipFee = requiresVendorshipFeeInput({ dealOrigin, vendorshipOwner });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vendorship Code</h3>
        <p className="text-sm text-muted-foreground">
          Choose MSS&apos;s own DISCOM vendorship code or select a registered code-giver company.
        </p>
      </div>

      <RadioGroup
        value={vendorshipOwner}
        onValueChange={(val) => {
          const owner = val as typeof vendorshipOwner;
          setField("vendorshipOwner", owner);
          if (owner === "MSS") {
            setField("vendorshipCompanyId", undefined);
            if (dealOrigin !== "DIRECT" && capacityKw > 0) {
              setField("vendorshipFeeAmount", suggestVendorshipFee(capacityKw));
            } else {
              setField("vendorshipFeeAmount", undefined);
            }
          } else {
            setField("paymentType", undefined);
            if (owner !== "CODE_GIVER") {
              setField("vendorshipCompanyId", undefined);
            }
            if (owner === "PARTNER_OWNED") {
              setField("vendorshipFeeAmount", undefined);
            }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Label
          htmlFor="MSS"
          className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${
            vendorshipOwner === "MSS" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <RadioGroupItem value="MSS" id="MSS" />
            <Building2 className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-base">Our vendorship (MSS code)</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            MSS bills the customer and owns document creation.
          </p>
        </Label>

        <Label
          htmlFor="CODE_GIVER"
          className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${
            vendorshipOwner === "CODE_GIVER" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <RadioGroupItem value="CODE_GIVER" id="CODE_GIVER" />
            <FileText className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-base">Code giver company</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Select a vendorship code giver from masters — billing follows their code.
          </p>
        </Label>

        {dealOrigin === "PARTNER" && (
          <Label
            htmlFor="PARTNER_OWNED"
            className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all md:col-span-2 ${
              vendorshipOwner === "PARTNER_OWNED" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <RadioGroupItem value="PARTNER_OWNED" id="PARTNER_OWNED" />
              <Handshake className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-base">Partner&apos;s own code</span>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              Partner handles DISCOM filing — MSS supplies materials and tracks site progress only.
            </p>
          </Label>
        )}
      </RadioGroup>

      {vendorshipOwner === "CODE_GIVER" && (
        <Card className="bg-emerald-50/30 border-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-emerald-800">Vendorship code giver</CardTitle>
            <CardDescription className="text-xs">
              Companies registered under Vendorship Companies in masters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={vendorshipCompanyId}
              onValueChange={(val) => setField("vendorshipCompanyId", val)}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select code giver company" />
              </SelectTrigger>
              <SelectContent>
                {vendorshipCompanies.map((co) => (
                  <SelectItem key={co.id} value={co.id}>
                    {co.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {vendorshipOwner === "MSS" && (
        <>
          {showVendorshipFee && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Vendorship fee</CardTitle>
                <CardDescription className="text-xs">
                  {capacityKw > 0
                    ? `Suggested: ₹${suggestedFee.toLocaleString()} (${capacityKw} kW × default rate). You may override.`
                    : "Enter capacity on the commercials step to get a suggested fee, or enter manually."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee amount (₹)</Label>
                  <Input
                    type="number"
                    value={vendorshipFeeAmount ?? ""}
                    onChange={(e) => setField("vendorshipFeeAmount", parseFloat(e.target.value) || 0)}
                  />
                </div>
                {suggestedFee > 0 && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-2 hover:underline"
                      onClick={() => setField("vendorshipFeeAmount", suggestedFee)}
                    >
                      Use suggested ₹{suggestedFee.toLocaleString()}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Funding type</CardTitle>
              <CardDescription className="text-xs">
                Bank loan files receive installments in MSS account. Cash files may be received by partner or subcontractor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={paymentType ?? ""}
                onValueChange={(val) => setField("paymentType", val as ProjectPaymentType)}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Bank file or cash file" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash file</SelectItem>
                  <SelectItem value="loan">Bank loan file</SelectItem>
                  <SelectItem value="cash-and-loan">Cash and loan</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
