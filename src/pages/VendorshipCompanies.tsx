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
import { Building2, Plus, Phone, Mail, MapPin, Code, Pencil, Trash2, IndianRupee } from "lucide-react";
import type { VendorshipCompany } from "@/types/finance";
import { toast } from "@/hooks/use-toast";

const emptyForm = (): Omit<VendorshipCompany, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  registrationCode: "",
  notes: "",
});

export default function VendorshipCompanies() {
  const { vendorshipCompanies, addVendorshipCompany, updateVendorshipCompany, deleteVendorshipCompany, generateId, expenses, projects } = useAppData();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const filtered = (vendorshipCompanies ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const { pagedItems: pagedCompanies, safePage: safeGridPage } = usePagedSlice(filtered, gridPage, gridPageSize);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const openEdit = (c: VendorshipCompany) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", address: c.address ?? "", registrationCode: c.registrationCode ?? "", notes: c.notes ?? "" });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.phone) {
      toast({ title: "Name and phone are required.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateVendorshipCompany(editingId, form);
      toast({ title: "Updated", description: `${form.name} has been updated.` });
    } else {
      addVendorshipCompany({ id: generateId("VC"), createdAt: new Date().toISOString(), ...form });
      toast({ title: "Added", description: `${form.name} added to Vendorship Code Companies.` });
    }
    setSheetOpen(false);
  };

  const handleDelete = (c: VendorshipCompany) => {
    deleteVendorshipCompany(c.id);
    toast({ title: "Removed", description: `${c.name} has been removed.` });
  };

  // Calculate fees paid per company from expenses
  const feesByCompany = (companyId: string) => {
    return (expenses ?? [])
      .filter(e => e.category === "Vendorship Code Fee" && e.vendorshipCompanyId === companyId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Count projects per company
  const projectsByCompany = (companyId: string) => {
    return (projects ?? []).filter(p => p.scope?.vendorshipCompanyId === companyId).length;
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Vendorship companies" }]}
        subRow={<p className="text-sm text-muted-foreground">DISCOM registration partners — fee per linked project.</p>}
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
          <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">No vendorship code companies yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add companies whose DISCOM code you use on projects.</p>
          <Button className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Company
          </Button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedCompanies.map(c => {
            const totalFees = feesByCompany(c.id);
            const linkedProjects = projectsByCompany(c.id);
            return (
              <div key={c.id} className="border rounded-xl p-5 bg-card space-y-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.registrationCode && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Code className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">{c.registrationCode}</span>
                        </div>
                      )}
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Linked Projects</p>
                    <p className="text-lg font-bold mt-0.5">{linkedProjects}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Total Fees Paid</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-lg font-bold">{totalFees.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

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
            <SheetTitle>{editingId ? "Edit Company" : "Add Vendorship Code Company"}</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. SafePower Systems" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
              <Label>DISCOM Registration Code</Label>
              <Input placeholder="e.g. SP/DISCOM/KA/2024/001" value={form.registrationCode} onChange={e => setForm(f => ({ ...f, registrationCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="City, State" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Default fee, any special terms..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
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
