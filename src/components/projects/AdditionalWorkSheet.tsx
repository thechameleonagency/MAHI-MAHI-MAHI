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
import { computeAdditionalWorkTotal } from "@/lib/changeRequestApproval";
import type { Project } from "@/types/project";

export function AdditionalWorkSheet({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}) {
  const { updateProject } = useAppData();
  const [description, setDescription] = useState("");
  const [basis, setBasis] = useState<"fixed" | "per_kw" | "per_sqft">("fixed");
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("");

  const previewTotal = computeAdditionalWorkTotal(
    basis,
    Number.parseFloat(rate) || 0,
    qty ? Number.parseFloat(qty) : undefined,
    project,
  );

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    const rateNum = Number.parseFloat(rate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      toast({ title: "Enter a valid rate", variant: "destructive" });
      return;
    }

    const line = {
      id: `AW-${Date.now().toString(36)}`,
      description: description.trim(),
      basis,
      rate: rateNum,
      qty: qty ? Number.parseFloat(qty) : undefined,
      total: previewTotal,
      addedAt: new Date().toISOString(),
    };

    const lines = [...(project.additionalWorkLines ?? []), line];
    const nextContract = (project.contractAmount ?? 0) + previewTotal;
    const saved = updateProject(project.id, {
      additionalWorkLines: lines,
      contractAmount: nextContract,
    });
    if (!saved) {
      toast({
        title: "Could not save additional work",
        description: "You may not have permission to update this project, or the project could not be saved.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Additional work added",
      description: `Contract increased by ₹${previewTotal.toLocaleString("en-IN")}`,
    });
    setDescription("");
    setRate("");
    setQty("");
    setBasis("fixed");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto custom-scrollbar">
        <SheetHeader>
          <SheetTitle>Additional work (INC)</SheetTitle>
          <SheetDescription>
            Add fixed, per-kW, or per-sqft work lines — contract amount updates automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Basis</Label>
            <Select value={basis} onValueChange={(v) => setBasis(v as typeof basis)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed amount</SelectItem>
                <SelectItem value="per_kw">Per kW</SelectItem>
                <SelectItem value="per_sqft">Per sq ft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{basis === "fixed" ? "Amount (₹)" : "Rate (₹)"}</Label>
              <Input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            {basis !== "fixed" && (
              <div className="space-y-2">
                <Label>Qty ({basis === "per_kw" ? "kW — blank uses project capacity" : "sq ft"})</Label>
                <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
            )}
          </div>
          <p className="text-sm rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground">
            Line total: <strong className="text-foreground">₹{previewTotal.toLocaleString("en-IN")}</strong>
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add to contract</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
