import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Handshake, Users, Truck, Briefcase } from "lucide-react";

export function Step1DealStructure() {
  const { dealOrigin, partnerModifier, incModifier, setField } = useWizardStore();

  const options = [
    {
      id: "DIRECT",
      title: "Direct Client (Solo EPC)",
      description: "Full EPC executed by MSS. No counterparties involved.",
      icon: <Building2 className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "PARTNER",
      title: "Partner Network",
      description: "Deal originated by a Partner. Profit share or fixed rate.",
      icon: <Handshake className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "INC_TAKEN",
      title: "INC Taken (From INC Giver)",
      description: "We are executing work for an INC Giver.",
      icon: <Briefcase className="h-5 w-5 text-amber-500" />,
    },
    {
      id: "OUTSOURCED_INC",
      title: "Outsourced INC",
      description: "MSS holds the contract, but labor is outsourced to a subcontractor.",
      icon: <Truck className="h-5 w-5 text-emerald-500" />,
    },
    {
      id: "VENDORSHIP_ONLY",
      title: "Vendorship Only",
      description: "Zero execution scope. Billing and code-leasing only.",
      icon: <Users className="h-5 w-5 text-slate-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Deal Structure</h3>
        <p className="text-sm text-muted-foreground">
          What is the origin of this deal? This determines the entire project workflow.
        </p>
      </div>

      <RadioGroup
        value={dealOrigin}
        onValueChange={(val: any) => {
          setField("dealOrigin", val);
          // Reset modifiers when switching origin
          setField("partnerModifier", undefined);
          setField("incModifier", undefined);
          setField("vendorshipOwner", undefined);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {options.map((opt) => (
          <Label
            key={opt.id}
            htmlFor={opt.id}
            className={`flex flex-col cursor-pointer rounded-lg border-2 p-4 hover:bg-accent/50 transition-all ${
              dealOrigin === opt.id ? "border-primary bg-accent/20" : "border-border"
            }`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <RadioGroupItem value={opt.id} id={opt.id} />
              {opt.icon}
              <span className="font-semibold text-base">{opt.title}</span>
            </div>
            <p className="text-sm text-muted-foreground ml-7">{opt.description}</p>
          </Label>
        ))}
      </RadioGroup>

      {/* Dynamic Modifiers */}
      {dealOrigin === "PARTNER" && (
        <Card className="mt-6 border-purple-200 bg-purple-50/30 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Partner Deal Modifier
              <Badge variant="outline" className="text-purple-600 border-purple-200">Required</Badge>
            </CardTitle>
            <CardDescription>How is the partner compensated?</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={partnerModifier}
              onValueChange={(val: any) => setField("partnerModifier", val)}
              className="flex space-x-6"
            >
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="PROFIT_SHARE" />
                <span>Profit Share (%)</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="FIXED_RATE" />
                <span>Fixed Rate (₹/kW)</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {dealOrigin === "INC_TAKEN" && (
        <Card className="mt-6 border-amber-200 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              INC Execution Scope
              <Badge variant="outline" className="text-amber-600 border-amber-200">Required</Badge>
            </CardTitle>
            <CardDescription>What is MSS executing for the INC Giver?</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={incModifier}
              onValueChange={(val: any) => setField("incModifier", val)}
              className="flex space-x-6"
            >
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="LABOR_ONLY" />
                <span>Labor Only</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="LABOR_MATERIALS" />
                <span>Labor + Materials</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
