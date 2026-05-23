import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/contexts/AppDataContext";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Step5Review() {
  const state = useWizardStore();
  const { partners, incGiverCompanies, vendorshipCompanies } = useAppData();

  // Helper to resolve counterparty name
  let counterpartyName = "Unknown Counterparty";
  if (state.dealOrigin === "PARTNER") {
    counterpartyName = partners.find(p => p.id === state.counterpartyId)?.name || "Selected Partner";
  } else if (state.dealOrigin === "INC_TAKEN") {
    counterpartyName = incGiverCompanies.find(c => c.id === state.counterpartyId)?.name || "Selected INC Giver";
  } else if (state.dealOrigin === "OUTSOURCED_INC") {
    counterpartyName = vendorshipCompanies.find(c => c.id === state.counterpartyId)?.name || "Selected Subcontractor";
  }

  // Legal Reality Generator
  const generateRealityStatement = () => {
    switch (state.dealOrigin) {
      case "DIRECT":
        return `This is a Direct Client deal. MSS owns the Vendorship code and will bill the customer directly. Execution is fully handled by MSS.`;
      
      case "PARTNER":
        const pMod = state.partnerModifier === "PROFIT_SHARE" ? "Profit Share" : "Fixed Rate";
        if (state.vendorshipOwner === "MSS") {
          return `This is a Partner Network (${pMod}) deal. MSS owns the Vendorship code and will bill the customer. MSS will bill the Partner for a vendorship fee of ₹${state.vendorshipFeeAmount}. Execution by MSS.`;
        } else if (state.vendorshipOwner === "PARTNER") {
          return `This is a Partner Network (${pMod}) deal. ${counterpartyName} owns the Vendorship code and will bill the customer. MSS will bill ${counterpartyName}. Execution by MSS.`;
        } else {
          return `This is a Partner Network (${pMod}) deal. ${state.thirdPartyCompanyName} owns the code and bills the customer. MSS will bill ${counterpartyName}. Execution by MSS.`;
        }

      case "INC_TAKEN":
        if (state.incModifier === "LABOR_ONLY") {
          return `This is an INC Taken (Labor Only) deal. ${counterpartyName} handles all billing and documentation. MSS is strictly executing labor at the site.`;
        } else {
          return `This is an INC Taken (Labor + Materials) deal for ${counterpartyName}. MSS is providing execution and procurement.`;
        }

      case "OUTSOURCED_INC":
        return `This is an Outsourced INC deal. MSS holds the customer contract and handles billing, but execution is fully outsourced to ${counterpartyName}.`;

      case "VENDORSHIP_ONLY":
        return `This is a Vendorship Only agreement. MSS has zero execution scope. We are purely providing the Vendorship code for billing purposes.`;

      default:
        return "Incomplete configuration.";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-semibold">Review Configuration</h3>
        <p className="text-muted-foreground mt-2">
          Please review the structural reality of this project before creation.
        </p>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <AlertTitle className="text-lg font-semibold text-primary">The Legal Reality</AlertTitle>
        <AlertDescription className="text-base mt-2 leading-relaxed text-foreground">
          {generateRealityStatement()}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">End Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{state.endCustomer.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">{state.endCustomer.phone || "N/A"}</p>
            <p className="text-sm text-muted-foreground">{state.endCustomer.address || "N/A"}</p>
            <p className="text-sm text-muted-foreground mt-2">K-No: {state.endCustomer.kNumber || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Financial Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Capacity</span>
                <span className="font-medium">{state.capacityKw} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="font-medium">{state.projectType}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-medium">Gross Contract</span>
                <span className="font-bold text-primary">₹ {state.grossContractValue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
