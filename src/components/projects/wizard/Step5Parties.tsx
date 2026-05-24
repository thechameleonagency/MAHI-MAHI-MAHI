import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

export function Step5Parties() {
  const { dealOrigin, counterpartyId, setField } = useWizardStore();
  const { partners, incGiverCompanies, subcontractors } = useAppData();

  let counterpartyLabel = "";
  let counterpartyOptions: { id: string; name: string }[] = [];

  if (dealOrigin === "PARTNER") {
    counterpartyLabel = "Partner";
    counterpartyOptions = partners
      .filter((p) => p.type !== "Subcontractor")
      .map((p) => ({ id: p.id, name: p.name }));
  } else if (dealOrigin === "INC_TAKEN") {
    counterpartyLabel = "INC giver company";
    counterpartyOptions = incGiverCompanies.map((c) => ({ id: c.id, name: c.name }));
  } else if (dealOrigin === "OUTSOURCED_INC") {
    counterpartyLabel = "Installation subcontractor";
    counterpartyOptions = (subcontractors ?? []).map((s) => ({ id: s.id, name: s.name }));
  } else {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Counterparty</h3>
        <p className="text-sm text-muted-foreground">
          Select the {counterpartyLabel.toLowerCase()} associated with this deal.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            {counterpartyLabel}
          </CardTitle>
          <CardDescription>Required for {dealOrigin.replace(/_/g, " ")} deals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="wizard-unified-subcontractor-select">{counterpartyLabel}</Label>
          <Select value={counterpartyId} onValueChange={(val) => setField("counterpartyId", val)}>
            <SelectTrigger id="wizard-unified-subcontractor-select" className="w-full md:w-[400px]">
              <SelectValue placeholder={`Select ${counterpartyLabel.toLowerCase()}…`} />
            </SelectTrigger>
            <SelectContent>
              {counterpartyOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dealOrigin === "OUTSOURCED_INC" && counterpartyOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No subcontractors configured yet. Add one under Subcontractors before creating this project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
