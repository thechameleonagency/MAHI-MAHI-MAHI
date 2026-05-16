import { useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { formatINR } from "@/lib/formatCurrency";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { toast } from "@/hooks/use-toast";
import type { INCGiverCompany } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { Plus, Pencil, Trash2, HardHat } from "lucide-react";

const emptyForm = (): Omit<INCGiverCompany, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
});

export default function INCWorkSources() {
  const { incGiverCompanies, addINCGiverCompany, updateINCGiverCompany, deleteINCGiverCompany, generateId, projects } = useAppData();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

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
      toast({ title: "Name and phone are required.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateINCGiverCompany(editingId, form);
      toast({ title: "Updated", description: `${form.name} has been updated.` });
    } else {
      addINCGiverCompany({ id: generateId("IG"), createdAt: new Date().toISOString(), ...form });
      toast({ title: "Added", description: `${form.name} added to INC Work Sources.` });
    }
    setSheetOpen(false);
  };

  const handleDelete = (c: INCGiverCompany) => {
    deleteINCGiverCompany(c.id);
    toast({ title: "Removed", description: `${c.name} has been removed.` });
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
          <p className="text-sm text-muted-foreground">
            Companies that give us installation &amp; commissioning work. We execute; they pay after completion.
          </p>
        }
      >
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </StickyPageHeader>

      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setGridPage(1);
          }}
          className="max-w-xs"
        />
        <Badge variant="secondary">{filtered.length} companies</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
          <HardHat className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">No INC work sources yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add companies that give you INC installation work.</p>
          <Button className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Company
          </Button>
        </div>
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
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                        <HardHat className="h-4 w-4 text-orange-600" />
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
                  <TableCell className="text-right tabular-nums text-green-700 font-medium">{formatINR(collected)}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${pending > 0 ? "text-amber-700" : ""}`}>{formatINR(pending)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" type="button" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" type="button" onClick={() => handleDelete(c)}>
                        <Trash2 className="h-4 w-4" />
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
    </PageShell>
  );
}
