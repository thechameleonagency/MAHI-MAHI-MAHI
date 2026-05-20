import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AppSheetFormFooter } from "@/components/shared/AppSheetFormFooter";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { dataTableClasses } from "@/lib/tableConstants";
import { useMasters } from "@/contexts/MastersContext";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { Boxes } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MasterDataEditorProps {
  categoryId: string;
}

/**
 * Phase 4 — Single-category master data editor.
 *
 * Renders a table of `MasterItem` rows for the given category and exposes
 * add / edit / delete actions. Delete is gated by usage guard (handled by
 * the MastersContext mutator if the value is referenced elsewhere).
 */
export function MasterDataEditor({ categoryId }: MasterDataEditorProps) {
  const masters = useMasters();
  const category = masters.getCategoryById(categoryId);

  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formValue, setFormValue] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [confirmDeleteValue, setConfirmDeleteValue] = useState<string | null>(null);

  const sortedItems = useMemo(
    () =>
      [...category.items].sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.label.localeCompare(b.label);
      }),
    [category.items],
  );

  const openAdd = () => {
    setEditingValue(null);
    setFormValue("");
    setFormLabel("");
    setSheetOpen(true);
  };

  const openEdit = (value: string) => {
    const item = category.items.find((i) => i.value === value);
    if (!item) return;
    setEditingValue(value);
    setFormValue(item.value);
    setFormLabel(item.label);
    setSheetOpen(true);
  };

  const handleSave = () => {
    const v = formValue.trim();
    const l = formLabel.trim();
    if (!v || !l) {
      toast({
        variant: "destructive",
        title: "Both fields required",
        description: "Enter a unique value and a human-readable label.",
      });
      return;
    }
    if (editingValue) {
      masters.updateMasterItem(categoryId, editingValue, { label: l });
    } else {
      if (category.items.some((i) => i.value === v)) {
        toast({
          variant: "destructive",
          title: "Duplicate value",
          description: `An item with value "${v}" already exists.`,
        });
        return;
      }
      masters.addMasterItem(categoryId, { value: v, label: l });
    }
    setSheetOpen(false);
  };

  const handleDelete = () => {
    if (!confirmDeleteValue) return;
    masters.deleteMasterItem(categoryId, confirmDeleteValue);
    setConfirmDeleteValue(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{category.label}</h3>
          <p className="text-xs text-muted-foreground">{category.items.length} items</p>
        </div>
        {category.isEditable !== false && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add item
          </Button>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <ListEmptyState
          icon={Boxes}
          title="No items in this category"
          description="Add your first item to populate dropdowns across the app."
          actionLabel={category.isEditable !== false ? "Add item" : undefined}
          onAction={category.isEditable !== false ? openAdd : undefined}
        />
      ) : (
        <DataTableShell variant="inline">
          <TableHeader>
            <TableRow className={dataTableClasses.headRow}>
              <TableHead className="w-[200px]">Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.value}>
                <TableCell className="font-mono text-xs">{item.value}</TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {category.isEditable !== false && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Edit ${item.label}`}
                        onClick={() => openEdit(item.value)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                    {category.isEditable !== false && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => setConfirmDeleteValue(item.value)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>{editingValue ? "Edit master item" : "Add master item"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Value (internal identifier)</Label>
              <Input
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                disabled={editingValue != null}
                placeholder="e.g. on_hold"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase, no spaces. Used as the stored key.
              </p>
            </div>
            <div>
              <Label>Label (display name)</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. On Hold"
              />
            </div>
          </div>
          <AppSheetFormFooter onCancel={() => setSheetOpen(false)}>
            <Button onClick={handleSave}>{editingValue ? "Save changes" : "Add item"}</Button>
          </AppSheetFormFooter>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!confirmDeleteValue}
        onOpenChange={(open) => { if (!open) setConfirmDeleteValue(null); }}
        title="Delete master item?"
        description={
          confirmDeleteValue ? (
            <>
              This removes the value <strong>{confirmDeleteValue}</strong> from the {category.label} list.
              If the value is referenced anywhere in the app, that reference will become invalid.
              Consider deactivating instead.
            </>
          ) : (
            ""
          )
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
