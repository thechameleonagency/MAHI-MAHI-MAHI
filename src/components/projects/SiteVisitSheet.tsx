import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { parseValidatedPhotoUrlLines } from "@/lib/photoUrlLines";
import type { Project } from "@/types/project";
import type { SiteVisitItem } from "@/types/operations";

type LineDraft = {
  key: string;
  inventoryItemId?: number;
  name: string;
  requiredQty: string;
  unit: string;
  notes: string;
};

const emptyLine = (): LineDraft => ({
  key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  requiredQty: "1",
  unit: "pcs",
  notes: "",
});

/**
 * Phase 2.4 — SiteVisitSheet
 *
 * Records a pre-start site visit with installer, date, checklist-style lines,
 * blockers, and optional photo URLs. Submit creates a SiteVisit row; reconcile
 * is available from the Execution tab list after save.
 */
export function SiteVisitSheet({
  open,
  onOpenChange,
  project,
  onVisitCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
  onVisitCreated?: (visitId: string) => void;
}) {
  const { addSiteVisit, employees, inventoryItems } = useAppData();
  const today = new Date().toISOString().slice(0, 10);

  const [visitDate, setVisitDate] = useState(today);
  const [visitedBy, setVisitedBy] = useState<string>("");
  const [blockers, setBlockers] = useState("");
  const [photoUrls, setPhotoUrls] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const activeEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.status !== "inactive"),
    [employees],
  );

  const resetForm = () => {
    setVisitDate(today);
    setVisitedBy("");
    setBlockers("");
    setPhotoUrls("");
    setLines([emptyLine()]);
  };

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleInventoryPick = (key: string, itemIdStr: string) => {
    const item = (inventoryItems ?? []).find((i) => String(i.id) === String(itemIdStr));
    updateLine(key, {
      inventoryItemId: item?.id != null ? String(item.id) : undefined,
      name: item?.name ?? "",
      unit: item?.unit ?? "pcs",
    });
  };

  const handleSubmit = () => {
    if (!visitedBy?.trim()) {
      toast({ title: "Select installer", variant: "destructive" });
      return;
    }

    const items: SiteVisitItem[] = lines
      .map((l) => {
        const qty = Number.parseFloat(l.requiredQty);
        if (!l.name.trim() || !Number.isFinite(qty) || qty <= 0) return null;
        return {
          inventoryItemId: l.inventoryItemId,
          name: l.name.trim(),
          requiredQty: qty,
          unit: l.unit.trim() || "pcs",
          notes: l.notes.trim() || undefined,
        };
      })
      .filter((x): x is SiteVisitItem => x !== null);

    if (items.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }

    const { valid: photos, invalid: invalidPhotoUrls } = parseValidatedPhotoUrlLines(photoUrls);
    if (invalidPhotoUrls.length > 0) {
      const preview =
        invalidPhotoUrls.length === 1
          ? invalidPhotoUrls[0]
          : `${invalidPhotoUrls.length} entries (e.g. ${invalidPhotoUrls[0]})`;
      toast({
        title: "Invalid photo URL(s) skipped",
        description: `Use full http(s) links. Skipped: ${preview}`,
        variant: "destructive",
      });
    }

    const visitId = addSiteVisit({
      projectId: project.id,
      visitedBy: visitedBy.trim(),
      visitDate,
      items,
      blockers: blockers.trim() || undefined,
      photos: photos.length ? photos : undefined,
    });

    toast({
      title: "Site visit recorded",
      description: `${items.length} line(s) saved. Reconcile to checklist from the Execution tab when ready.`,
    });
    onVisitCreated?.(visitId);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Record site visit
          </SheetTitle>
          <SheetDescription>
            Capture what was observed on site for {project.name}. Lines can be merged into the site checklist later.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit-date">Visit date</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-installer">Installer</Label>
              <Select value={visitedBy} onValueChange={setVisitedBy}>
                <SelectTrigger id="visit-installer">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items observed</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines((p) => [...p, emptyLine()])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add line
              </Button>
            </div>
            {lines.map((line) => (
              <div key={line.key} className="rounded-lg border p-3 space-y-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">From inventory (optional)</Label>
                  <Select
                    value={line.inventoryItemId ? String(line.inventoryItemId) : ""}
                    onValueChange={(v) => handleInventoryPick(line.key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick item or type name below" />
                    </SelectTrigger>
                    <SelectContent>
                      {(inventoryItems ?? []).map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Item name"
                    value={line.name}
                    onChange={(e) => updateLine(line.key, { name: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Qty"
                    value={line.requiredQty}
                    onChange={(e) => updateLine(line.key, { requiredQty: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Unit"
                    value={line.unit}
                    onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                  />
                  <Input
                    placeholder="Line notes"
                    value={line.notes}
                    onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                  />
                </div>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-blockers">Blockers (optional)</Label>
            <Textarea
              id="visit-blockers"
              rows={2}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="e.g. Roof access pending / DISCOM meter not released"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-photos">Photo URLs (optional, comma or newline separated)</Label>
            <Textarea
              id="visit-photos"
              rows={2}
              value={photoUrls}
              onChange={(e) => setPhotoUrls(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save visit</Button>
        </SheetFooter>
      </AppSheetContent>
    </Sheet>
  );
}

