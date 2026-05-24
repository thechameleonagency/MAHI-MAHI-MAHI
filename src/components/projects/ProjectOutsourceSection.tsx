import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/contexts/AppDataContext";
import { formatINR } from "@/lib/formatCurrency";
import { deriveSubcontractorProjectPaid } from "@/lib/deriveSubcontractorEconomics";
import type { Project } from "@/types/project";
import { Users, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProjectOutsourceSectionProps {
  project: Project;
}

export function ProjectOutsourceSection({ project }: ProjectOutsourceSectionProps) {
  const {
    subcontractors,
    subcontractorTransactions,
    updateProject,
    generateId,
    addSubcontractorTransaction,
  } = useAppData();

  const [subcontractorId, setSubcontractorId] = useState(project.outsource?.partyId ?? "");
  const [rateBasis, setRateBasis] = useState<"per_kw" | "fixed">(
    project.outsource?.rateBasis === "fixed" ? "fixed" : "per_kw",
  );
  const [rateValue, setRateValue] = useState(String(project.outsource?.rateValue ?? ""));
  const [isSaving, setIsSaving] = useState(false);

  const capacityKw = parseFloat(String(project.capacity).replace(/[^\d.]/g, "")) || 0;
  const computedTotal = useMemo(() => {
    const rate = parseFloat(rateValue) || 0;
    return rateBasis === "per_kw" ? rate * capacityKw : rate;
  }, [rateBasis, rateValue, capacityKw]);

  const paid = useMemo(
    () =>
      project.outsource?.partyId
        ? deriveSubcontractorProjectPaid(project.id, subcontractorTransactions)
        : 0,
    [project.id, project.outsource?.partyId, subcontractorTransactions],
  );

  const handleAttach = () => {
    const sub = subcontractors.find((s) => s.id === subcontractorId);
    if (!sub) {
      toast({ title: "Select a subcontractor", variant: "destructive" });
      return;
    }
    const rate = parseFloat(rateValue) || 0;
    if (rate <= 0) {
      toast({ title: "Enter a valid payout rate", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const total = rateBasis === "per_kw" ? rate * capacityKw : rate;
    updateProject(project.id, {
      outsource: {
        partyId: sub.id,
        partyName: sub.name,
        rateBasis,
        rateValue: rate,
        total,
        attachedAt: new Date().toISOString(),
      },
      executionScope: "service_only",
      scope: {
        ...project.scope,
        hasMaterial: false,
        installationBy: "Subcontractor",
      },
    });
    setIsSaving(false);
    toast({ title: "Subcontractor attached", description: `${sub.name} — ${formatINR(total)} contract` });
  };

  const handleDetach = () => {
    updateProject(project.id, {
      outsource: null,
      executionScope: "full",
      scope: {
        ...project.scope,
        hasMaterial: project.projectKind !== "INC_GIVEN",
        installationBy: "MSS",
      },
    });
    setSubcontractorId("");
    toast({ title: "Outsource removed" });
  };

  const handleRecordPayment = () => {
    if (!project.outsource?.partyId) return;
    const amount = parseFloat(prompt("Payment amount (₹)?") ?? "");
    if (!Number.isFinite(amount) || amount <= 0) return;
    addSubcontractorTransaction({
      id: generateId("STX"),
      subcontractorId: project.outsource.partyId,
      projectId: project.id,
      projectName: project.name,
      date: new Date().toISOString().split("T")[0]!,
      amount,
      type: "payment",
      notes: "Project payout",
    });
    toast({ title: "Payment recorded", description: formatINR(amount) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Outsource execution
        </CardTitle>
        <CardDescription>
          Assign labor to a subcontractor. Material dispatch is disabled while outsourced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.outsource?.partyId ? (
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{project.outsource.partyName}</p>
                <p className="text-sm text-muted-foreground">
                  Contract {formatINR(project.outsource.total)} · Paid {formatINR(paid)} · Pending{" "}
                  {formatINR(Math.max(0, project.outsource.total - paid))}
                </p>
              </div>
              <Link
                to={`/subcontractor/${project.outsource.partyId}`}
                className="text-sm text-primary inline-flex items-center gap-1"
              >
                Ledger <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleRecordPayment}>
                Record payment
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDetach}>
                Remove outsource
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subcontractor</Label>
              <Select value={subcontractorId} onValueChange={setSubcontractorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {subcontractors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate basis</Label>
              <Select value={rateBasis} onValueChange={(v) => setRateBasis(v as typeof rateBasis)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_kw">Per kW</SelectItem>
                  <SelectItem value="fixed">Fixed lump sum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate value (₹)</Label>
              <Input value={rateValue} onChange={(e) => setRateValue(e.target.value)} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Computed total</Label>
              <p className="text-lg font-semibold pt-2">{formatINR(computedTotal)}</p>
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleAttach} disabled={isSaving}>
                Attach subcontractor
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
