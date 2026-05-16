import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { MaterialDamageStage } from "@/types/operations";

export function MaterialDamageSheet({
  open,
  onOpenChange,
  projectId,
  projectName,
  itemId,
  itemName,
  defaultUnitCost,
  onReported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName: string;
  itemId: number;
  itemName: string;
  defaultUnitCost?: number;
  onReported?: (damageId: string) => void;
}) {
  const { addMaterialDamage, employees } = useAppData();
  const [qty, setQty] = useState("1");
  const [stage, setStage] = useState<MaterialDamageStage>("installation");
  const [transportRef, setTransportRef] = useState("");
  const [costImpact, setCostImpact] = useState(
    defaultUnitCost ? String(defaultUnitCost) : "",
  );
  const [notes, setNotes] = useState("");
  const [reportedBy, setReportedBy] = useState<string>("");

  const handleSubmit = () => {
    const q = Number.parseFloat(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    const cost = costImpact ? Number.parseFloat(costImpact) : undefined;
    const id = addMaterialDamage({
      itemId,
      qty: q,
      stage,
      projectId,
      transportRef: transportRef.trim() || undefined,
      reportedBy: reportedBy ? Number.parseInt(reportedBy, 10) : undefined,
      notes: notes.trim() || undefined,
      costImpact: cost && cost > 0 ? cost : undefined,
    });
    toast({
      title: "Damage reported",
      description: `${q} ${itemName} written off${cost ? ` — ₹${cost.toLocaleString("en-IN")} impact` : ""}.`,
    });
    onReported?.(id);
    onOpenChange(false);
    setQty("1");
    setNotes("");
    setTransportRef("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto custom-scrollbar">
        <SheetHeader>
          <SheetTitle>Report material damage</SheetTitle>
          <SheetDescription>
            {itemName} on {projectName} — reduces stock and posts a write-off when cost impact is set.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantity damaged</Label>
            <Input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as MaterialDamageStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transport ref (optional)</Label>
            <Input value={transportRef} onChange={(e) => setTransportRef(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cost impact (₹, optional)</Label>
            <Input type="number" min={0} value={costImpact} onChange={(e) => setCostImpact(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reported by</Label>
            <Select value={reportedBy} onValueChange={setReportedBy}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            Report damage
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
