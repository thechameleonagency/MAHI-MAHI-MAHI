import { useState } from "react";
import { AlertTriangle, Trash2, Link, FileText, Briefcase, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface RelatedEntity {
  type: "invoice" | "quotation" | "project" | "sale-bill" | "expense";
  id: string;
  name: string;
}

interface DeletionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "invoice" | "quotation" | "project";
  entityId: string;
  entityName: string;
  relatedEntities?: RelatedEntity[];
  employees?: { id: number; name: string }[];
  hasNoRelations?: boolean; // If true, allow direct delete
  onSubmitRequest: (data: {
    reason: string;
    responsiblePerson?: string;
    notes?: string;
  }) => void;
  onDirectDelete?: () => void;
}

export function DeletionRequestModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  relatedEntities = [],
  employees = [],
  hasNoRelations = false,
  onSubmitRequest,
  onDirectDelete,
}: DeletionRequestModalProps) {
  const [reason, setReason] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({ title: "Error", description: "Please enter a reason for deletion", variant: "destructive" });
      return;
    }

    onSubmitRequest({
      reason,
      responsiblePerson: responsiblePerson || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setReason("");
    setResponsiblePerson("");
    setNotes("");
    onOpenChange(false);
  };

  const handleDirectDelete = () => {
    if (onDirectDelete) {
      onDirectDelete();
      onOpenChange(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "invoice":
      case "sale-bill":
        return <Receipt className="h-4 w-4" />;
      case "quotation":
        return <FileText className="h-4 w-4" />;
      case "project":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const entityTypeLabel = {
    invoice: "Invoice",
    quotation: "Quotation",
    project: "Project",
  };

  // Direct delete for empty entities
  if (hasNoRelations) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <AppSheetContent layout="form" size="sm">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {entityTypeLabel[entityType]}
            </SheetTitle>
            <SheetDescription>
              This {entityType} contains no data or related items.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="font-medium">{entityName}</p>
              <p className="text-sm text-muted-foreground">ID: {entityId}</p>
            </div>

            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Permanent Deletion</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This action is permanent and cannot be undone. The {entityType} will be deleted immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDirectDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    );
  }

  // Full deletion request flow
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Request Deletion - {entityTypeLabel[entityType]}
          </SheetTitle>
          <SheetDescription>
            This deletion request will be sent to Super Admin for approval.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Entity Info */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="font-medium">{entityName}</p>
            <p className="text-xs text-muted-foreground">ID: {entityId}</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Deletion *</Label>
            <Textarea
              placeholder="Enter the reason for deleting this item..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Responsible Person */}
          <div className="space-y-2">
            <Label>Person Responsible (if applicable)</Label>
            <Select value={responsiblePerson} onValueChange={setResponsiblePerson}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Any other notes to remember</Label>
            <Textarea
              placeholder="Additional notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Related Entities */}
          {relatedEntities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Related Connections
                </Label>
                <p className="text-xs text-muted-foreground">
                  Before deleting this {entityType}, please review these related items:
                </p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {relatedEntities.map((entity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border text-sm"
                    >
                      {getEntityIcon(entity.type)}
                      <div className="flex-1">
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Will lose link
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600">
                  Deleting this {entityType} will remove connections to the above items.
                </p>
              </div>
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            <Trash2 className="h-4 w-4 mr-2" />
            Submit Request
          </Button>
        </SheetFooter>
      </AppSheetContent>
    </Sheet>
  );
}
