import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { useAppData } from "@/contexts/AppDataContext";
import { formatINR } from "@/lib/formatCurrency";
import {
  materialDamageReasonHint,
  materialDamageRequiresReason,
  parsePhotoUrlLines,
  validateMaterialDamageForm,
} from "@/lib/materialDamageValidation";
import { toast } from "@/hooks/use-toast";
import type { MaterialDamageStage } from "@/types/operations";

const defaultForm = (defaultUnitCost?: number) => ({
  qty: "1",
  stage: "installation" as MaterialDamageStage,
  transportRef: "",
  costImpact: defaultUnitCost ? String(defaultUnitCost) : "",
  notes: "",
  photoUrls: "",
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

  const parsedPreview = useMemo(() => {
    const q = Number.parseFloat(form.qty);
    const costTrim = form.costImpact.trim();
    const cost = costTrim ? Number.parseFloat(costTrim) : undefined;
    return {
      qty: Number.isFinite(q) ? q : 0,
      costImpact: costTrim && Number.isFinite(cost) ? cost : undefined,
      notes: form.notes,
    };
  }, [form.qty, form.costImpact, form.notes]);

  const reasonRequired = materialDamageRequiresReason({
    qty: parsedPreview.qty,
    costImpact: parsedPreview.costImpact,
    notes: form.notes,
  });

  const runValidate = () => {
    const result = validateMaterialDamageForm(form);
    if (!result.ok) {
      toast({ title: "Cannot report damage", description: result.message, variant: "destructive" });
      return null;
    }
    return result;
  };

  const handleRequestConfirm = () => {
    if (!runValidate()) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    const parsed = runValidate();
    if (!parsed) return;
    const photoUrls = parsePhotoUrlLines(form.photoUrls);
    const id = addMaterialDamage({
      itemId,
      qty: parsed.qty,
      stage: form.stage,
      projectId,
      transportRef: form.transportRef.trim() || undefined,
      reportedBy: form.reportedBy.trim() || undefined,
      notes: parsed.notes,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      costImpact: parsed.cost,
    });
    if (!id) return;
    toast({
      title: "Damage reported",
      description: `${parsed.qty} ${itemName} written off${parsed.cost ? ` — ${formatINR(parsed.cost)} impact` : ""}.`,
    });
    onReported?.(id);
    setConfirmOpen(false);
    handleOpenChange(false);
  };

  const costLabel = form.costImpact.trim()
    ? formatINR(Number.parseFloat(form.costImpact))
    : "none";

  const photoCount = parsePhotoUrlLines(form.photoUrls).length;

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
              <p className="text-xs text-muted-foreground">
                Financial write-off for P&amp;L when set. Large amounts require a reason below.
              </p>
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
              <Label>
                Reason / notes
                {reasonRequired ? <span className="text-destructive"> *</span> : null}
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="What happened, where, and who witnessed it"
                aria-required={reasonRequired}
              />
              {reasonRequired && (
                <p className="text-xs text-muted-foreground">{materialDamageReasonHint()}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage-photo-urls">Photo URL(s) (optional)</Label>
              <Textarea
                id="damage-photo-urls"
                rows={2}
                value={form.photoUrls}
                onChange={(e) => setForm((f) => ({ ...f, photoUrls: e.target.value }))}
                placeholder="https://… — comma or newline separated"
              />
              <p className="text-xs text-muted-foreground">
                Link site photos or delivery proofs. URLs are stored on the damage record for audit review.
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestConfirm}
              disabled={reasonRequired && !form.notes.trim()}
            >
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
            {form.stage}). Cost impact: {costLabel}.
            {form.notes.trim() ? (
              <>
                {" "}
                Reason: {form.notes.trim()}
              </>
            ) : null}
            {photoCount > 0 ? <> · {photoCount} photo URL(s) attached</> : null}. This reduces inventory and cannot
            be undone.
          </>
        }
        confirmLabel="Report damage"
        onConfirm={handleConfirmSubmit}
      />
    </>
  );
}
