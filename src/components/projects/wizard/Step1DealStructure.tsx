import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Handshake, Users, Briefcase } from "lucide-react";

export function Step1DealStructure() {
  const { dealOrigin, partnerModifier, setField } = useWizardStore();

  const options = [
    {
      id: "DIRECT" as const,
      title: "Direct Client (Solo EPC)",
      description: "MSS sells and executes for the end customer.",
      icon: <Building2 className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "PARTNER" as const,
      title: "Partner Network",
      description: "Deal originated through a partner — profit share or fixed backend rate.",
      icon: <Handshake className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "INC_TAKEN" as const,
      title: "INC Taken (From INC Giver)",
      description: "Execute installation work on behalf of an INC giver company.",
      icon: <Briefcase className="h-5 w-5 text-amber-500" />,
    },
    {
      id: "VENDORSHIP_ONLY" as const,
      title: "Vendorship Only",
      description: "Code leasing / billing only — no field execution by MSS.",
      icon: <Users className="h-5 w-5 text-slate-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Deal Structure</h3>
        <p className="text-sm text-muted-foreground">
          Choose the commercial origin. Subcontractor execution can be configured later on the project detail page.
        </p>
      </div>

      <RadioGroup
        value={dealOrigin}
        onValueChange={(val) => {
          setField("dealOrigin", val as typeof dealOrigin);
          setField("partnerModifier", undefined);
          setField("counterpartyId", undefined);
          if (val === "VENDORSHIP_ONLY") {
            setField("vendorshipOwner", "MSS");
          }
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

      {dealOrigin === "PARTNER" && (
        <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Partner compensation
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                Required
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={partnerModifier}
              onValueChange={(val) => setField("partnerModifier", val as typeof partnerModifier)}
              className="flex flex-wrap gap-6"
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
    </div>
  );
}
