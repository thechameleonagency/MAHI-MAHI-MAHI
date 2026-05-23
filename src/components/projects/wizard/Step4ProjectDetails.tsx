import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, User, Phone, MapPin, Zap, Sun, Cpu } from "lucide-react";

export function Step4ProjectDetails() {
  const { endCustomer, systemDetails, itemDetails, projectName, vendorshipOwner, setField } =
    useWizardStore();

  const handleCustomerChange = (field: keyof typeof endCustomer, value: string) => {
    setField("endCustomer", { ...endCustomer, [field]: value });
  };

  const handleSystemChange = (field: keyof typeof systemDetails, value: string) => {
    setField("systemDetails", { ...systemDetails, [field]: value });
  };

  const handleItemChange = (field: keyof typeof itemDetails, value: string | number) => {
    setField("itemDetails", { ...itemDetails, [field]: value });
  };

  const showFullTechnical = vendorshipOwner === "MSS" || !vendorshipOwner;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Customer & System Details</h3>
        <p className="text-sm text-muted-foreground">
          {showFullTechnical
            ? "Capture end-customer, site, and BOM details for MSS vendorship projects."
            : "End-customer site details. Technical BOM is optional when using an external code giver."}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Project / site name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={projectName || ""}
                onChange={(e) => setField("projectName", e.target.value)}
                placeholder="e.g. Sharma Residence"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input
              value={endCustomer.name}
              onChange={(e) => handleCustomerChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={endCustomer.phone}
                onChange={(e) => handleCustomerChange("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Site address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={endCustomer.address}
                onChange={(e) => handleCustomerChange("address", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>K-Number (DISCOM)</Label>
            <div className="relative">
              <Zap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={endCustomer.kNumber}
                onChange={(e) => handleCustomerChange("kNumber", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {showFullTechnical && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="h-4 w-4" />
                System details
              </CardTitle>
              <CardDescription>Electrical and site context for document creation.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Roof type</Label>
                <Select value={systemDetails.roofType} onValueChange={(v) => handleSystemChange("roofType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select roof type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RCC">RCC flat</SelectItem>
                    <SelectItem value="Metal">Metal sheet</SelectItem>
                    <SelectItem value="Tiled">Tiled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select value={systemDetails.phase} onValueChange={(v) => handleSystemChange("phase", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single phase</SelectItem>
                    <SelectItem value="Three">Three phase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Connection type</Label>
                <Select
                  value={systemDetails.connectionType}
                  onValueChange={(v) => handleSystemChange("connectionType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LT">LT</SelectItem>
                    <SelectItem value="HT">HT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>DISCOM</Label>
                <Input
                  value={systemDetails.discom}
                  onChange={(e) => handleSystemChange("discom", e.target.value)}
                  placeholder="e.g. MSEDCL"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Item details (BOM)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Panel make</Label>
                <Input
                  value={itemDetails.panelMake}
                  onChange={(e) => handleItemChange("panelMake", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Panel capacity (Wp)</Label>
                <Input
                  type="number"
                  value={itemDetails.panelCapacityWp || ""}
                  onChange={(e) => handleItemChange("panelCapacityWp", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Panel quantity</Label>
                <Input
                  type="number"
                  value={itemDetails.panelQty || ""}
                  onChange={(e) => handleItemChange("panelQty", parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Inverter make</Label>
                <Input
                  value={itemDetails.inverterMake}
                  onChange={(e) => handleItemChange("inverterMake", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Inverter capacity (kW)</Label>
                <Input
                  type="number"
                  value={itemDetails.inverterCapacityKw || ""}
                  onChange={(e) => handleItemChange("inverterCapacityKw", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Structure type</Label>
                <Input
                  value={itemDetails.structureType}
                  onChange={(e) => handleItemChange("structureType", e.target.value)}
                  placeholder="e.g. Hot-dip GI elevated"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
