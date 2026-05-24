import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { formatINR } from "@/lib/formatCurrency";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import type { Subcontractor } from "@/types/finance";
import { filterProjectsForSubcontractor } from "@/lib/subcontractorProjectLink";
import { deriveSubcontractorEconomics } from "@/lib/deriveSubcontractorEconomics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { Plus, Pencil, Trash2, Hammer } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";

const emptyForm = (): Omit<Subcontractor, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  defaultRatePerKw: undefined,
  notes: "",
});

export default function Subcontractors() {
  const navigate = useNavigate();
  const {
    subcontractors,
    subcontractorTransactions,
    addSubcontractor,
    updateSubcontractor,
    deleteSubcontractor,
    generateId,
    projects,
  } = useAppData();
  const canCreate = useCan("partner", "create");
  const canEdit = useCan("partner", "edit");
  const canDelete = useCan("partner", "delete");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);
  const [subcontractorToDelete, setSubcontractorToDelete] = useState<Subcontractor | null>(null);

  const filtered = (subcontractors ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const { pagedItems: pagedSubcontractors, safePage: safeGridPage } = usePagedSlice(filtered, gridPage, gridPageSize);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (s: Subcontractor) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone,
      email: s.email ?? "",
      address: s.address ?? "",
      defaultRatePerKw: s.defaultRatePerKw,
      notes: s.notes ?? "",
    });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) {
      setLastConfirm({ variant: "error", title: "Name and phone are required." });
      return;
    }
    const payload = {
      ...form,
      defaultRatePerKw: form.defaultRatePerKw ? Number(form.defaultRatePerKw) : undefined,
    };
    if (editingId) {
      updateSubcontractor(editingId, payload);
      setLastConfirm({ variant: "success", title: "Subcontractor updated", description: form.name });
    } else {
      addSubcontractor({ id: generateId("SUB"), createdAt: new Date().toISOString(), ...payload });
      setLastConfirm({ variant: "success", title: "Subcontractor added", description: form.name });
    }
    setSheetOpen(false);
  };

  const confirmDelete = () => {
    if (!subcontractorToDelete) return;
    deleteSubcontractor(subcontractorToDelete.id);
    setLastConfirm({ variant: "success", title: "Subcontractor removed", description: subcontractorToDelete.name });
    setSubcontractorToDelete(null);
  };

  const economicsForSubcontractor = (subcontractorId: string) =>
    deriveSubcontractorEconomics(subcontractorId, projects ?? [], subcontractorTransactions ?? []);

  const linkedProjectCount = (subcontractorId: string) =>
    filterProjectsForSubcontractor(projects ?? [], subcontractorId).length;

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Subcontractors" }]}
        subRow={
          <div className="flex w-full flex-wrap items-end gap-2">
            <Input
              placeholder="Search subcontractors..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setGridPage(1); }}
              className="h-9 w-full sm:w-72"
            />
            <Badge variant="secondary" className="ml-auto">{filtered.length} subcontractors</Badge>
          </div>
        }
      >
        <Button size="sm" onClick={openAdd} disabled={!canCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {formPrimaryLabel("create", "subcontractor")}
        </Button>
      </StickyPageHeader>

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      {filtered.length === 0 ? (
        <ListEmptyState
          icon={Hammer}
          title={(subcontractors ?? []).length === 0 ? "No subcontractors yet" : "No subcontractors match"}
          description={
            (subcontractors ?? []).length === 0
              ? "Add installation subcontractors who execute outsourced INC work."
              : "Try a different search term."
          }
          actionLabel={(subcontractors ?? []).length === 0 && canCreate ? "Add first subcontractor" : search ? "Clear search" : undefined}
          onAction={
            (subcontractors ?? []).length === 0 && canCreate
              ? openAdd
              : search
                ? () => { setSearch(""); setGridPage(1); }
                : undefined
          }
        />
      ) : (
        <>
        <DataTableShell variant="inline" maxHeight={listTableViewportMaxHeight(gridPageSize)} scrollResetKey={`${safeGridPage}-${gridPageSize}-${filtered.length}`}>
          <TableHeader>
            <TableRow className={dataTableClasses.headRow}>
              <TableHead>Subcontractor</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Completed</TableHead>
              <TableHead className="text-right">Contract</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSubcontractors.map((s) => {
              const econ = economicsForSubcontractor(s.id);
              const { linkedProjectCount: linked, contract, paid, pending, completedProjectCount: completedProjects } = econ;
              return (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/subcontractor/${s.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Hammer className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.name}</p>
                        {s.phone && <p className="text-xs text-muted-foreground truncate">{s.phone}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{linked}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{completedProjects}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(contract)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success font-medium">{formatINR(paid)}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${pending > 0 ? "text-warning" : ""}`}>{formatINR(pending)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" type="button" aria-label={`Edit ${s.name}`} disabled={!canEdit} onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" type="button" aria-label={`Delete ${s.name}`} disabled={!canDelete} onClick={() => setSubcontractorToDelete(s)}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTableShell>
        <TablePaginationBar
          className="pt-2"
          page={safeGridPage}
          pageSize={gridPageSize}
          total={filtered.length}
          onPageChange={setGridPage}
          onPageSizeChange={(n) => {
            setGridPageSize(n);
            setGridPage(1);
          }}
        />
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Subcontractor" : "Add Subcontractor"}</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Install Co" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input placeholder="Contact number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input placeholder="email@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="City, State" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Default rate (₹/kW)</Label>
              <Input
                type="number"
                placeholder="Optional default payout rate"
                value={form.defaultRatePerKw ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, defaultRatePerKw: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Typical scope, rate terms, coverage area..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{formPrimaryLabel(editingId ? "edit" : "create", "subcontractor")}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!subcontractorToDelete}
        onOpenChange={(open) => { if (!open) setSubcontractorToDelete(null); }}
        title={subcontractorToDelete ? `Delete ${subcontractorToDelete.name}?` : "Delete subcontractor?"}
        description={
          subcontractorToDelete ? (() => {
            const linked = linkedProjectCount(subcontractorToDelete.id);
            return linked > 0
              ? `This subcontractor is linked to ${linked} project(s). Removing them cannot be undone.`
              : "This subcontractor has no linked projects. This cannot be undone.";
          })()
            : ""
        }
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
