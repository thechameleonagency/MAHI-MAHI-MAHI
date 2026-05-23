import { useWizardStore } from "./useWizardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/contexts/AppDataContext";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  dealOriginLabel,
  partnerModifierLabel,
} from "@/lib/buildProjectFromUnifiedWizardState";

export function Step7Review() {
  const state = useWizardStore();
  const { partners, incGiverCompanies, vendorshipCompanies } = useAppData();

  let counterpartyName = "—";
  if (state.dealOrigin === "PARTNER") {
    counterpartyName = partners.find((p) => p.id === state.counterpartyId)?.name ?? "Partner";
  } else if (state.dealOrigin === "INC_TAKEN") {
    counterpartyName = incGiverCompanies.find((c) => c.id === state.counterpartyId)?.name ?? "INC giver";
  }

  const codeGiverName =
    state.vendorshipOwner === "CODE_GIVER"
      ? vendorshipCompanies.find((c) => c.id === state.vendorshipCompanyId)?.name
      : undefined;

  const subcontractorName = state.outsourceEnabled
    ? partners.find((p) => p.id === state.subcontractorId)?.name
    : undefined;

  const reality = [
    `${dealOriginLabel(state.dealOrigin)}${state.partnerModifier ? ` (${partnerModifierLabel(state.partnerModifier)})` : ""}.`,
    state.vendorshipOwner === "MSS"
      ? "MSS owns the vendorship code and document set."
      : codeGiverName
        ? `Vendorship code supplied by ${codeGiverName}.`
        : "External vendorship code selected.",
    state.outsourceEnabled && subcontractorName
      ? `Execution outsourced to ${subcontractorName}.`
      : "Execution by MSS.",
    state.soloPipeline === "quotation"
      ? "Linked to an approved quotation."
      : state.soloPipeline === "enquiry"
        ? "Linked to a CRM enquiry."
        : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
        <h3 className="text-xl font-semibold">Review & create</h3>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold">Deal summary</AlertTitle>
        <AlertDescription className="mt-2 leading-relaxed">{reality}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{state.endCustomer.name || "—"}</p>
            <p>{state.endCustomer.phone}</p>
            <p>{state.endCustomer.address}</p>
            <p>K-No: {state.endCustomer.kNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Commercial</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{state.capacityKw} kW · {state.projectType}</p>
            <p className="font-semibold text-primary">₹ {state.grossContractValue.toLocaleString()}</p>
            {counterpartyName !== "—" && <p>Counterparty: {counterpartyName}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
