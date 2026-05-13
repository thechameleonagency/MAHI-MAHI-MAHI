import { useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { HardHat, Plus, Phone, Mail, MapPin, Pencil, Trash2, IndianRupee, ClipboardCheck } from "lucide-react";
import type { INCGiverCompany } from "@/types/finance";
import { toast } from "@/hooks/use-toast";

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedCompanies.map(c => {
            const linked = projectsForCompany(c.id);
            const toCollect = totalToCollect(c.id);
            const collected = totalCollected(c.id);
            const pending = toCollect - collected;
            const completedProjects = linked.filter(p => p.status === "Completed" || p.status === "Closed").length;

            return (
              <div key={c.id} className="border rounded-xl p-5 bg-card space-y-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <HardHat className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{linked.length} project{linked.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-xs text-muted-foreground">To Collect</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-bold">{(toCollect / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-2.5">
                    <p className="text-xs text-muted-foreground">Collected</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-bold text-green-700">{(collected / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${pending > 0 ? "bg-amber-500/10" : "bg-muted/40"}`}>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-3 w-3 text-muted-foreground" />
                      <p className={`text-sm font-bold ${pending > 0 ? "text-amber-700" : ""}`}>{(pending / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                </div>

                {completedProjects > 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-500/10 rounded-lg px-3 py-2">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>{completedProjects} project{completedProjects !== 1 ? "s" : ""} completed — ready to collect</span>
                  </div>
                )}

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>

                {c.notes && (
                  <p className="text-xs text-muted-foreground border-t pt-3">{c.notes}</p>
                )}
              </div>
            );
          })}
        </div>
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
