import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppDataContext";
import { formatINR } from "@/lib/formatCurrency";
import type { Project } from "@/types/project";
import type { ProjectTimelineStatus } from "@/types/blockage";
import { IndianRupee } from "lucide-react";

interface ProjectInstallmentTrackerProps {
  project: Project;
  timeline?: ProjectTimelineStatus;
}

export function ProjectInstallmentTracker({ project, timeline }: ProjectInstallmentTrackerProps) {
  const { subcontractorTransactions } = useAppData();
  const vendorshipFee = project.scope?.vendorshipFeeAmount ?? project.vendorshipFeeReceivable ?? 0;
  const subcontractorPaid = subcontractorTransactions
    .filter((t) => t.projectId === project.id && t.type === "payment")
    .reduce((s, t) => s + t.amount, 0);

  const firstReceived = timeline?.firstInstallmentPaid ? project.contractAmount * 0.8 : 0;
  const secondReceived = timeline?.secondInstallmentPaid ? project.contractAmount * 0.2 : 0;
  const bankReceived = firstReceived + secondReceived;
  const mssRetained = Math.min(vendorshipFee, bankReceived);
  const transferable = Math.max(0, bankReceived - mssRetained - subcontractorPaid);

  if (project.vendorshipOwner !== "MSS" && project.scope?.vendorshipOwner !== "MSS") {
    return null;
  }

  if (project.paymentType !== "loan" && project.paymentType !== "cash-and-loan") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Cash file tracking
          </CardTitle>
          <CardDescription className="text-xs">
            Cash files may be received by partner or subcontractor. Track collections via partner/subcontractor ledgers.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Vendorship fee target: {formatINR(vendorshipFee)} · Subcontractor paid: {formatINR(subcontractorPaid)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IndianRupee className="h-4 w-4" />
          Bank installment tracker
        </CardTitle>
        <CardDescription className="text-xs">
          Loan installments received in MSS account — retain vendorship fee, transfer balance to subcontractor.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <Label className="text-muted-foreground">Bank received (timeline)</Label>
          <p className="font-semibold">{formatINR(bankReceived)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">MSS vendorship fee retained</Label>
          <p className="font-semibold">{formatINR(mssRetained)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Paid to subcontractor</Label>
          <p className="font-semibold">{formatINR(subcontractorPaid)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Pending transfer to subcontractor</Label>
          <p className="font-semibold text-amber-700">{formatINR(transferable)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
