import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppData } from "@/contexts/AppDataContext";
import { skipVendorshipStep } from "@/lib/unifiedProjectWizardFlow";

export function Step2Vendorship() {
  const { dealOrigin, incModifier, vendorshipOwner, vendorshipCompanyId, setField } = useWizardStore();
  const { vendorshipCompanies } = useAppData();
  const state = useWizardStore();

  if (skipVendorshipStep(state)) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <FileText className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold">Vendorship handled by INC giver</AlertTitle>
        <AlertDescription className="text-amber-700">
          Labor-only INC Taken deals use the giver&apos;s billing code. Continue to the next step.
        </AlertDescription>
      </Alert>
    );
  }

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
          setField("vendorshipOwner", val as typeof vendorshipOwner);
          if (val === "MSS") setField("vendorshipCompanyId", undefined);
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

      {vendorshipOwner === "MSS" && dealOrigin === "PARTNER" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Optional vendorship fee to counterparty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              When MSS leases its code on a partner deal, record the fee receivable (if any).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
