import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { formatINR } from "@/lib/formatCurrency";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { toast } from "@/hooks/use-toast";
import type { VendorshipCompany } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { Plus, Pencil, Trash2, Building2, MapPin, Code } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";

const emptyForm = (): Omit<VendorshipCompany, "id" | "createdAt"> => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  registrationCode: "",
  notes: "",
});

export default function VendorshipCompanies() {
  const navigate = useNavigate();
  const { vendorshipCompanies, addVendorshipCompany, updateVendorshipCompany, deleteVendorshipCompany, generateId, expenses, projects } = useAppData();
  const canCreate = useCan("partner", "create");
  const canEdit = useCan("partner", "edit");
  const canDelete = useCan("partner", "delete");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [gridPage, setGridPage] = useState(1);
  const [gridPageSize, setGridPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [companyToDelete, setCompanyToDelete] = useState<VendorshipCompany | null>(null);

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

  const confirmDelete = () => {
    if (!companyToDelete) return;
    deleteVendorshipCompany(companyToDelete.id);
    toast({ title: "Removed", description: `${companyToDelete.name} has been removed.` });
    setCompanyToDelete(null);
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

      {filtered.length === 0 ? (
        <ListEmptyState
          icon={Building2}
          title={(vendorshipCompanies ?? []).length === 0 ? "No vendorship companies yet" : "No companies match"}
          description={
            (vendorshipCompanies ?? []).length === 0
              ? "Add companies whose DISCOM registration code you use on projects."
              : "Try a different search term."
          }
          actionLabel={(vendorshipCompanies ?? []).length === 0 && canCreate ? "Add first company" : search ? "Clear search" : undefined}
          onAction={
            (vendorshipCompanies ?? []).length === 0 && canCreate
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
              <TableHead className="hidden md:table-cell">Code</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead className="text-right">Fees paid</TableHead>
              <TableHead className="hidden xl:table-cell">Email</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedCompanies.map((c) => {
              const totalFees = feesByCompany(c.id);
              const linkedProjects = projectsByCompany(c.id);
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/vendorship/${c.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        {c.address && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {c.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                    {c.registrationCode ? (
                      <span className="inline-flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        {c.registrationCode}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.phone || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{linkedProjects}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatINR(totalFees)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground truncate max-w-[200px]">{c.email || "—"}</TableCell>
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
        <AppSheetContent layout="form" size="md">
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
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!companyToDelete}
        onOpenChange={(open) => { if (!open) setCompanyToDelete(null); }}
        title={companyToDelete ? `Delete ${companyToDelete.name}?` : "Delete company?"}
        description={
          companyToDelete ? (() => {
            const linked = projectsByCompany(companyToDelete.id);
            return linked > 0
              ? `This company is linked to ${linked} project(s). Removing it cannot be undone.`
              : "This company has no linked projects. This cannot be undone.";
          })()
            : ""
        }
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
