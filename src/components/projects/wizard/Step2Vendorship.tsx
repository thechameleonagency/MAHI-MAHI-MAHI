import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Building2, Users, Receipt } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Step2Vendorship() {
  const { 
    dealOrigin, 
    incModifier, 
    vendorshipOwner, 
    vendorshipFeeAmount,
    thirdPartyCompanyName,
    thirdPartyFeeAmount,
    setField 
  } = useWizardStore();

  const isLaborOnly = dealOrigin === "INC_TAKEN" && incModifier === "LABOR_ONLY";

  if (isLaborOnly) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <Receipt className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold">Vendorship Irrelevant</AlertTitle>
        <AlertDescription className="text-amber-700">
          Since this is a Labor-Only INC Taken deal, vendorship and billing codes are handled entirely by the INC Giver. You may skip this step.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vendorship & Documentation</h3>
        <p className="text-sm text-muted-foreground">
          Who owns the Vendorship Code? This is the Pivot Point that locks the billing architecture.
        </p>
      </div>

      <RadioGroup
        value={vendorshipOwner}
        onValueChange={(val: any) => {
          setField("vendorshipOwner", val);
          setField("vendorshipFeeAmount", undefined);
          setField("thirdPartyCompanyName", "");
          setField("thirdPartyFeeAmount", undefined);
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
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
            <span className="font-semibold text-base">MSS (Our Code)</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            MSS bills the customer directly and creates the client documents.
          </p>
        </Label>

        <Label
          htmlFor="PARTNER"
          className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${
            vendorshipOwner === "PARTNER" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <RadioGroupItem value="PARTNER" id="PARTNER" />
            <Users className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-base">Partner's Code</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Partner bills the customer. MSS Document Creator is disabled. MSS bills the Partner.
          </p>
        </Label>

        <Label
          htmlFor="THIRD_PARTY"
          className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${
            vendorshipOwner === "THIRD_PARTY" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <RadioGroupItem value="THIRD_PARTY" id="THIRD_PARTY" />
            <FileText className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-base">Third-Party Code</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Third-party bills the customer. MSS Document Creator is disabled.
          </p>
        </Label>
      </RadioGroup>

      {/* Conditional Inputs */}
      {vendorshipOwner === "MSS" && (dealOrigin === "PARTNER" || dealOrigin === "INC_TAKEN") && (
        <Card className="bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Vendorship Fee (MSS charging Counterparty)</CardTitle>
            <CardDescription className="text-xs">
              Because MSS is leasing its code to a {dealOrigin === "PARTNER" ? "Partner" : "INC Giver"}, what is the fee?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
              <Input
                type="number"
                placeholder="0"
                className="pl-8"
                value={vendorshipFeeAmount || ""}
                onChange={(e) => setField("vendorshipFeeAmount", parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {vendorshipOwner === "THIRD_PARTY" && (
        <Card className="bg-emerald-50/30 border-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-emerald-800">Third-Party Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  placeholder="Enter company name" 
                  value={thirdPartyCompanyName || ""}
                  onChange={(e) => setField("thirdPartyCompanyName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Third-Party Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="pl-8"
                    value={thirdPartyFeeAmount || ""}
                    onChange={(e) => setField("thirdPartyFeeAmount", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
