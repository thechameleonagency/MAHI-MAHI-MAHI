import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calculator, AlertTriangle } from "lucide-react";

export function Step4Commercials() {
  const { 
    dealOrigin,
    partnerModifier,
    incModifier,
    capacityKw,
    projectType,
    grossContractValue,
    partnerProfitSharePct,
    mssBackendFixedRate,
    incRateBasis,
    incRateValue,
    incMaterialCost,
    subcontractorPayoutRate,
    partnerProvidesGst,
    setField
  } = useWizardStore();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Commercials & Money Flow</h3>
        <p className="text-sm text-muted-foreground">
          Define the universal base and counterparty economics.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Universal Base
          </CardTitle>
          <CardDescription>Core metrics for the project.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Capacity (kW)</Label>
            <Input 
              type="number" 
              placeholder="e.g. 5.5" 
              value={capacityKw || ""}
              onChange={(e) => setField("capacityKw", parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={(val: any) => setField("projectType", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gross Contract Value</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
              <Input 
                type="number" 
                className="pl-8"
                placeholder="0" 
                value={grossContractValue || ""}
                onChange={(e) => setField("grossContractValue", parseFloat(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">What the Customer pays the Vendorship Owner</p>
          </div>
        </CardContent>
      </Card>

      {dealOrigin === "PARTNER" && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-900">
              Partner Economics
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                {partnerModifier === "PROFIT_SHARE" ? "Profit Share" : "Fixed Rate"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partnerModifier === "PROFIT_SHARE" && (
                <div className="space-y-2">
                  <Label>Partner Profit Share (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="e.g. 50" 
                      value={partnerProfitSharePct || ""}
                      onChange={(e) => setField("partnerProfitSharePct", parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {partnerModifier === "FIXED_RATE" && (
                <div className="space-y-2">
                  <Label>MSS Backend Fixed Rate (₹/kW)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                    <Input 
                      type="number" 
                      className="pl-8"
                      placeholder="e.g. 35000" 
                      value={mssBackendFixedRate || ""}
                      onChange={(e) => setField("mssBackendFixedRate", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between border rounded-lg p-3 bg-white">
                  <div className="space-y-0.5">
                    <Label className="text-base">GST B2B Invoice</Label>
                    <p className="text-xs text-muted-foreground">Will Partner provide a GST invoice to MSS?</p>
                  </div>
                  <Switch 
                    checked={partnerProvidesGst} 
                    onCheckedChange={(checked) => setField("partnerProvidesGst", checked)} 
                  />
                </div>
                
                {partnerProvidesGst === false && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>9% Offset Deduction</AlertTitle>
                    <AlertDescription>
                      Because the partner is not providing a GST invoice, the system will automatically deduct a 9% offset from their payouts.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dealOrigin === "INC_TAKEN" && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900">INC Economics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Rate Basis</Label>
                <Select value={incRateBasis} onValueChange={(val: any) => setField("incRateBasis", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select basis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PER_KW">Per kW</SelectItem>
                    <SelectItem value="PER_SQFT">Per Sq Ft</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rate Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input 
                    type="number" 
                    className="pl-8"
                    placeholder="0" 
                    value={incRateValue || ""}
                    onChange={(e) => setField("incRateValue", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {incModifier === "LABOR_MATERIALS" && (
                <div className="space-y-2">
                  <Label>Material Cost Deduction</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                    <Input 
                      type="number" 
                      className="pl-8"
                      placeholder="0" 
                      value={incMaterialCost || ""}
                      onChange={(e) => setField("incMaterialCost", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {dealOrigin === "OUTSOURCED_INC" && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-900">Subcontractor Economics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm">
              <Label>Subcontractor Payout Rate (₹/kW)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  className="pl-8"
                  placeholder="e.g. 5000" 
                  value={subcontractorPayoutRate || ""}
                  onChange={(e) => setField("subcontractorPayoutRate", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
