import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AppSheetFormFooter } from "@/components/shared/AppSheetFormFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { resolveChangeRequestDeltaAmount } from "@/lib/changeRequestApproval";
import { parseMaterialDeltaFromLines } from "@/lib/changeRequestMaterialDelta";
import {
  parseChangeRequestFieldsFromForm,
  validateChangeRequestDraft,
} from "@/lib/changeRequestValidation";
import type { Project } from "@/types/project";
import type { ProjectChangeRequestType } from "@/types/operations";

type MaterialLine = { key: string; itemId: string; deltaQty: string };

const emptyMaterialLine = (): MaterialLine => ({
  key: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  itemId: "",
  deltaQty: "1",
});

export function ChangeRequestSheet({
  open,
  onOpenChange,
  project,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
  onCreated?: () => void;
}) {
  const { addProjectChangeRequest, inventoryItems } = useAppData();
  const [type, setType] = useState<ProjectChangeRequestType>("capacity");
  const [deltaKw, setDeltaKw] = useState("");
  const [deltaPanels, setDeltaPanels] = useState("");
  const [deltaAmount, setDeltaAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [materialLines, setMaterialLines] = useState<MaterialLine[]>([]);

  const previewDelta = useMemo(() => {
    const numericFields = parseChangeRequestFieldsFromForm(type, {
      deltaKw,
      deltaPanels,
      deltaAmount,
    });
    const draft = {
      id: "preview",
      projectId: project.id,
      type,
      ...numericFields,
      status: "draft" as const,
      requestedAt: "",
    };
    return resolveChangeRequestDeltaAmount(project, draft);
  }, [project, type, deltaKw, deltaPanels, deltaAmount]);

  const reset = () => {
    setType("capacity");
    setDeltaKw("");
    setDeltaPanels("");
    setDeltaAmount("");
    setNotes("");
    setMaterialLines([]);
  };

  const handleSubmit = () => {
    const materialDelta = parseMaterialDeltaFromLines(materialLines);
    const numericFields = parseChangeRequestFieldsFromForm(type, {
      deltaKw,
      deltaPanels,
      deltaAmount,
    });
    const validation = validateChangeRequestDraft({
      type,
      ...numericFields,
      materialDelta: materialDelta.length ? materialDelta : undefined,
    });
    if (!validation.ok) {
      toast({ title: "Cannot save change request", description: validation.message, variant: "destructive" });
      return;
    }

    const result = addProjectChangeRequest({
      projectId: project.id,
      type,
      ...numericFields,
      materialDelta: materialDelta.length ? materialDelta : undefined,
      notes: notes.trim() || undefined,
    });
    if (!result.ok) {
      toast({
        title: "Cannot save change request",
        description: friendlyCommandErrorMessage(result.error, "Could not save change request."),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Change request logged",
      description: `Draft saved — estimated delta ₹${previewDelta.toLocaleString("en-IN")}`,
    });
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="lg">
        <SheetHeader>
          <SheetTitle>Project change request</SheetTitle>
          <SheetDescription>
            Capacity, panel count, add-on work, or material deltas for {project.name}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ProjectChangeRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capacity">Capacity (kW)</SelectItem>
                <SelectItem value="panels">Panels</SelectItem>
                <SelectItem value="addon-work">Add-on work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "capacity" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Δ kW</Label>
                <Input type="number" step="0.1" value={deltaKw} onChange={(e) => setDeltaKw(e.target.value)} />
                <p className="text-xs text-muted-foreground">Negative reduces installed capacity.</p>
              </div>
              <div className="space-y-2">
                <Label>Δ amount (₹, optional)</Label>
                <Input type="number" value={deltaAmount} onChange={(e) => setDeltaAmount(e.target.value)} />
                <p className="text-xs text-muted-foreground">Overrides per-kW estimate; negative reduces contract.</p>
              </div>
            </div>
          )}

          {type === "panels" && (
            <div className="space-y-2">
              <Label>Additional panels</Label>
              <Input type="number" min={0} value={deltaPanels} onChange={(e) => setDeltaPanels(e.target.value)} />
            </div>
          )}

          {type === "addon-work" && (
            <div className="space-y-2">
              <Label>Commercial delta (₹) *</Label>
              <Input type="number" value={deltaAmount} onChange={(e) => setDeltaAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">Use a negative amount for scope reduction (no delta invoice).</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">
            Estimated commercial delta: <strong>₹{previewDelta.toLocaleString("en-IN")}</strong>
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Material delta (optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setMaterialLines((p) => [...p, emptyMaterialLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Line
              </Button>
            </div>
            {materialLines.map((line) => (
              <div key={line.key} className="flex gap-2 items-end">
                <Select value={line.itemId} onValueChange={(v) => setMaterialLines((p) => p.map((l) => (l.key === line.key ? { ...l, itemId: v } : l)))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {(inventoryItems ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-20"
                  type="number"
                  placeholder="±qty"
                  value={line.deltaQty}
                  onChange={(e) =>
                    setMaterialLines((p) => p.map((l) => (l.key === line.key ? { ...l, deltaQty: e.target.value } : l)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove material line"
                  onClick={() => setMaterialLines((p) => p.filter((l) => l.key !== line.key))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <AppSheetFormFooter onCancel={() => onOpenChange(false)}>
          <Button onClick={handleSubmit}>Save draft request</Button>
        </AppSheetFormFooter>
      </AppSheetContent>
    </Sheet>
  );
}
