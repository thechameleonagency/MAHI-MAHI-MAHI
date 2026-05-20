import { useEffect, useState } from "react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { MaterialDamageStage } from "@/types/operations";

const defaultForm = (defaultUnitCost?: number) => ({
  qty: "1",
  stage: "installation" as MaterialDamageStage,
  transportRef: "",
  costImpact: defaultUnitCost ? String(defaultUnitCost) : "",
  notes: "",
  reportedBy: "",
});

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
  itemId: string;
  itemName: string;
  defaultUnitCost?: number;
  onReported?: (damageId: string) => void;
}) {
  const { addMaterialDamage, employees } = useAppData();
  const [form, setForm] = useState(() => defaultForm(defaultUnitCost));
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(defaultForm(defaultUnitCost));
      setConfirmOpen(false);
    }
  }, [open, defaultUnitCost]);

  const handleOpenChange = (v: boolean) => {
    if (!v) setForm(defaultForm(defaultUnitCost));
    onOpenChange(v);
  };

  const validate = (): { ok: true; qty: number; cost?: number } | { ok: false } => {
    const q = Number.parseFloat(form.qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return { ok: false };
    }
    const costTrim = form.costImpact.trim();
    if (costTrim) {
      const cost = Number.parseFloat(costTrim);
      if (!Number.isFinite(cost) || cost <= 0) {
        toast({
          title: "Invalid cost impact",
          description: "Enter a positive amount or leave the field empty.",
          variant: "destructive",
        });
        return { ok: false };
      }
      return { ok: true, qty: q, cost };
    }
    return { ok: true, qty: q };
  };

  const handleRequestConfirm = () => {
    if (!validate().ok) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    const parsed = validate();
    if (!parsed.ok) return;
    const id = addMaterialDamage({
      itemId,
      qty: parsed.qty,
      stage: form.stage,
      projectId,
      transportRef: form.transportRef.trim() || undefined,
      reportedBy: form.reportedBy.trim() || undefined,
      notes: form.notes.trim() || undefined,
      costImpact: parsed.cost,
    });
    toast({
      title: "Damage reported",
      description: `${parsed.qty} ${itemName} written off${parsed.cost ? ` — ₹${parsed.cost.toLocaleString("en-IN")} impact` : ""}.`,
    });
    onReported?.(id);
    setConfirmOpen(false);
    handleOpenChange(false);
  };

  const costLabel = form.costImpact.trim()
    ? `₹${Number.parseFloat(form.costImpact).toLocaleString("en-IN")}`
    : "none";

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Report material damage</SheetTitle>
            <SheetDescription>
              {itemName} on {projectName} — reduces stock and posts a write-off when cost impact is set.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity damaged</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as MaterialDamageStage }))}>
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
              <Input
                value={form.transportRef}
                onChange={(e) => setForm((f) => ({ ...f, transportRef: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost impact (₹, optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.costImpact}
                onChange={(e) => setForm((f) => ({ ...f, costImpact: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reported by</Label>
              <Select value={form.reportedBy} onValueChange={(v) => setForm((f) => ({ ...f, reportedBy: v }))}>
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
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRequestConfirm}>
              Report damage
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm damage write-off?"
        description={
          <>
            Write off <strong>{form.qty}</strong> of <strong>{itemName}</strong> on <strong>{projectName}</strong> (
            {form.stage}). Cost impact: {costLabel}. This reduces inventory and cannot be undone.
          </>
        }
        confirmLabel="Report damage"
        onConfirm={handleConfirmSubmit}
      />
    </>
  );
}
