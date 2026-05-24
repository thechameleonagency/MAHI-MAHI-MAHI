import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, AlertTriangle } from "lucide-react";
import type { ProjectPaymentType } from "@/domain/project/projectPaymentType";

export function Step6Commercials() {
  const {
    dealOrigin,
    partnerModifier,
    vendorshipOwner,
    paymentType,
    capacityKw,
    projectType,
    grossContractValue,
    partnerProfitSharePct,
    mssBackendFixedRate,
    incRateBasis,
    incRateValue,
    partnerProvidesGst,
    setField,
  } = useWizardStore();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Commercials</h3>
        <p className="text-sm text-muted-foreground">Contract value and counterparty economics.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Base contract
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Capacity (kW)</Label>
            <Input
              type="number"
              value={capacityKw || ""}
              onChange={(e) => setField("capacityKw", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Project type</Label>
            <Select value={projectType} onValueChange={(val) => setField("projectType", val as typeof projectType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{dealOrigin === "VENDORSHIP_ONLY" ? "Vendorship fee receivable" : "Gross contract value"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
              <Input
                type="number"
                className="pl-8"
                value={grossContractValue || ""}
                onChange={(e) => setField("grossContractValue", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {dealOrigin === "VENDORSHIP_ONLY" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Funding type</CardTitle>
            <CardDescription className="text-xs">
              MSS vendorship code is used — select bank loan or cash file for payment tracking.
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
      )}

      {dealOrigin === "PARTNER" && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Partner economics
              <Badge variant="outline">
                {partnerModifier === "PROFIT_SHARE" ? "Profit share" : "Fixed rate"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {partnerModifier === "PROFIT_SHARE" && (
              <div className="space-y-2 max-w-xs">
                <Label>Partner profit share (%)</Label>
                <Input
                  type="number"
                  value={partnerProfitSharePct || ""}
                  onChange={(e) => setField("partnerProfitSharePct", parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
            {partnerModifier === "FIXED_RATE" && (
              <div className="space-y-2 max-w-xs">
                <Label>MSS backend rate (₹/kW)</Label>
                <Input
                  type="number"
                  value={mssBackendFixedRate || ""}
                  onChange={(e) => setField("mssBackendFixedRate", parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
            <div className="flex items-center justify-between border rounded-lg p-3 bg-background">
              <div>
                <Label>Partner provides GST invoice</Label>
                <p className="text-xs text-muted-foreground">Affects B2B offset calculations.</p>
              </div>
              <Switch
                checked={partnerProvidesGst}
                onCheckedChange={(checked) => setField("partnerProvidesGst", checked)}
              />
            </div>
            {partnerProvidesGst === false && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>9% offset deduction</AlertTitle>
                <AlertDescription>Non-GST partner invoices trigger automatic offset on payouts.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {dealOrigin === "INC_TAKEN" && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">INC giver rates</CardTitle>
            <CardDescription className="text-xs">
              Material supply can be enabled later on the project detail page if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate basis</Label>
              <Select value={incRateBasis} onValueChange={(val) => setField("incRateBasis", val as typeof incRateBasis)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select basis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_KW">Per kW</SelectItem>
                  <SelectItem value="PER_SQFT">Per sq ft</SelectItem>
                  <SelectItem value="FIXED">Fixed lump sum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate value (₹)</Label>
              <Input
                type="number"
                value={incRateValue || ""}
                onChange={(e) => setField("incRateValue", parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {vendorshipOwner === "MSS" && dealOrigin !== "VENDORSHIP_ONLY" && capacityKw > 0 && (
        <p className="text-xs text-muted-foreground">
          Vendorship fee was set on the vendorship step. Update capacity here to recalculate on review if needed.
        </p>
      )}
    </div>
  );
}
