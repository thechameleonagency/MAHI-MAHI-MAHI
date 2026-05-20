import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { formatINR } from "@/lib/formatCurrency";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import type { INCGiverCompany } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { Plus, Pencil, Trash2, HardHat } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";

const emptyForm = (): Omit<INCGiverCompany, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
});

export default function INCWorkSources() {
  const navigate = useNavigate();
  const { incGiverCompanies, addINCGiverCompany, updateINCGiverCompany, deleteINCGiverCompany, generateId, projects } = useAppData();
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
  const [companyToDelete, setCompanyToDelete] = useState<INCGiverCompany | null>(null);

  const filtered = (incGiverCompanies ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const { pagedItems: pagedCompanies, safePage: safeGridPage } = usePagedSlice(filtered, gridPage, gridPageSize);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (c: INCGiverCompany) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) {
      setLastConfirm({ variant: "error", title: "Name and phone are required." });
      return;
    }
    if (editingId) {
      updateINCGiverCompany(editingId, form);
      setLastConfirm({ variant: "success", title: "INC Work Source updated", description: form.name });
    } else {
      addINCGiverCompany({ id: generateId("IG"), createdAt: new Date().toISOString(), ...form });
      setLastConfirm({ variant: "success", title: "INC Work Source added", description: form.name });
    }
    setSheetOpen(false);
  };

  const confirmDelete = () => {
    if (!companyToDelete) return;
    deleteINCGiverCompany(companyToDelete.id);
    setLastConfirm({ variant: "success", title: "INC Work Source removed", description: companyToDelete.name });
    setCompanyToDelete(null);
  };

  // Projects given by this INC source
  const projectsForCompany = (companyId: string) =>
    (projects ?? []).filter(p => (p.scope as any)?.incGiverCompanyId === companyId);

  const totalToCollect = (companyId: string) =>
    projectsForCompany(companyId).reduce((sum, p) => sum + (p.contractAmount || 0), 0);

  const totalCollected = (companyId: string) =>
    projectsForCompany(companyId).reduce((sum, p) => sum + (p.amountReceived || 0), 0);

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "INC work sources" }]}
        subRow={
          <div className="flex w-full flex-wrap items-end gap-2">
            <Input
              placeholder="Search companies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setGridPage(1); }}
              className="h-9 w-full sm:w-72"
            />
            <Badge variant="secondary" className="ml-auto">{filtered.length} companies</Badge>
          </div>
        }
      >
        <Button size="sm" onClick={openAdd} disabled={!canCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
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
          icon={HardHat}
          title={(incGiverCompanies ?? []).length === 0 ? "No INC work sources yet" : "No companies match"}
          description={
            (incGiverCompanies ?? []).length === 0
              ? "Add companies that give you INC installation work."
              : "Try a different search term."
          }
          actionLabel={(incGiverCompanies ?? []).length === 0 && canCreate ? "Add first company" : search ? "Clear search" : undefined}
          onAction={
            (incGiverCompanies ?? []).length === 0 && canCreate
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
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Completed</TableHead>
              <TableHead className="text-right">To collect</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedCompanies.map((c) => {
              const linked = projectsForCompany(c.id);
              const toCollect = totalToCollect(c.id);
              const collected = totalCollected(c.id);
              const pending = toCollect - collected;
              const completedProjects = linked.filter((p) => p.status === "Completed" || p.status === "Closed").length;
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/inc-sources/${c.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-warning/10 flex items-center justify-center shrink-0">
                        <HardHat className="h-4 w-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{linked.length}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{completedProjects}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(toCollect)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success font-medium">{formatINR(collected)}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${pending > 0 ? "text-warning" : ""}`}>{formatINR(pending)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" type="button" aria-label={`Edit ${c.name}`} disabled={!canEdit} onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" type="button" aria-label={`Delete ${c.name}`} disabled={!canDelete} onClick={() => setCompanyToDelete(c)}>
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

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Company" : "Add INC Work Source"}</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Prakash Solar EPC" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input placeholder="Contact number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input placeholder="email@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="City, State" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Typical rate, type of work given, any terms..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Add Company"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!companyToDelete}
        onOpenChange={(open) => { if (!open) setCompanyToDelete(null); }}
        title={companyToDelete ? `Delete ${companyToDelete.name}?` : "Delete INC work source?"}
        description={
          companyToDelete ? (() => {
            const linked = projectsForCompany(companyToDelete.id).length;
            return linked > 0
              ? `This source is linked to ${linked} project(s). Removing it cannot be undone.`
              : "This source has no linked projects. This cannot be undone.";
          })()
            : ""
        }
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
