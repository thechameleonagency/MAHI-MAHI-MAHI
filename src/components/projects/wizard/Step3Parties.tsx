import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { useAppData } from "@/contexts/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, User, Phone, MapPin, Zap } from "lucide-react";

export function Step3Parties() {
  const { 
    dealOrigin, 
    endCustomer, 
    counterpartyId, 
    projectName,
    setField 
  } = useWizardStore();
  
  const { partners, incGiverCompanies, subcontractors } = useAppData();

  const handleCustomerChange = (field: keyof typeof endCustomer, value: string) => {
    setField("endCustomer", { ...endCustomer, [field]: value });
  };

  const requiresCounterparty = ["PARTNER", "INC_TAKEN", "OUTSOURCED_INC"].includes(dealOrigin);

  let counterpartyLabel = "";
  let counterpartyOptions: { id: string; name: string }[] = [];

  if (dealOrigin === "PARTNER") {
    counterpartyLabel = "Select Partner";
    counterpartyOptions = partners.map(p => ({ id: p.id, name: p.name }));
  } else if (dealOrigin === "INC_TAKEN") {
    counterpartyLabel = "Select INC Giver";
    counterpartyOptions = incGiverCompanies.map(c => ({ id: c.id, name: c.name }));
  } else if (dealOrigin === "OUTSOURCED_INC") {
    counterpartyLabel = "Select Subcontractor";
    counterpartyOptions = (subcontractors ?? []).map((s) => ({ id: s.id, name: s.name }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Parties & Site Details</h3>
        <p className="text-sm text-muted-foreground">
          Define the end customer and any required counterparties.
        </p>
      </div>

      {requiresCounterparty && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              The Counterparty
            </CardTitle>
            <CardDescription>Required because of Deal Origin: {dealOrigin}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{counterpartyLabel}</Label>
              <Select value={counterpartyId} onValueChange={(val) => setField("counterpartyId", val)}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder={`Search and ${counterpartyLabel.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {counterpartyOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            End Customer / Site
          </CardTitle>
          <CardDescription>The final installation site and customer details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project / Site Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="e.g. Sharma Residence" 
                  value={projectName || ""}
                  onChange={(e) => setField("projectName", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Full Name" 
                  value={endCustomer.name}
                  onChange={(e) => handleCustomerChange("name", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="+91..." 
                  value={endCustomer.phone}
                  onChange={(e) => handleCustomerChange("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>K-Number (DISCOM)</Label>
              <div className="relative">
                <Zap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Mandatory globally" 
                  value={endCustomer.kNumber}
                  onChange={(e) => handleCustomerChange("kNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Site Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Full installation address" 
                  value={endCustomer.address}
                  onChange={(e) => handleCustomerChange("address", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
