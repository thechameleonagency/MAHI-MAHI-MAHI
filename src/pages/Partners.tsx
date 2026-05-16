import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Search, Users, Pencil, Trash2 } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  calculateProjectPartnerEarning,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,
} from "@/domain/partners/derivePartnerEconomics";
import type { PartnerType } from "@/types/finance";
import { formatINR } from "@/lib/formatCurrency";
import { PARTNER_TYPES_ORDERED, PARTNER_TYPE_PURPOSE } from "@/domain/partners/partnerConfig";
import { getIndianFyBoundsForReferenceDate, isProjectDateInIndianFy } from "@/lib/indianFiscalYear";

const formatCurrency = (amount: number) => formatINR(Math.round(amount || 0));

const Partners = () => {
  const { partners, projects, partnerTransactions, addPartner, updatePartner, deletePartner, generateId, canDo } = useAppData();
  const fyLabel = useMemo(() => getIndianFyBoundsForReferenceDate(new Date()).label, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerAddress, setPartnerAddress] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");
  const [partnerType, setPartnerType] = useState<PartnerType>("Profit-Share");
  const [partnerRate, setPartnerRate] = useState("");
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string; name: string } | null>(null);

  const summaries = useMemo(() => {
    return partners.map((partner) => {
      const linkedProjects = projects.filter((project) =>
        project.partners?.some((projectPartner) => projectPartner.partnerId === partner.id) ||
        project.scope?.partnerId === partner.id,
      );
      const earned = linkedProjects.reduce((sum, project) => {
        const projectPartner = project.partners?.find((row) => row.partnerId === partner.id);
        return projectPartner ? sum + calculateProjectPartnerEarning(project, projectPartner) : sum;
      }, 0);
      const txns = partnerTransactions.filter((txn) => txn.partnerId === partner.id);
      const paid = txns.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
      const received = txns.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);
      const earnedFy = linkedProjects.reduce((sum, project) => {
        const projectPartner = project.partners?.find((row) => row.partnerId === partner.id);
        if (!projectPartner || !isProjectDateInIndianFy(project.startDate)) return sum;
        return sum + calculateProjectPartnerEarning(project, projectPartner);
      }, 0);
      return {
        partner,
        linkedProjects,
        earned,
        earnedFy,
        paid,
        pending: Math.max(0, earned - paid),
        received,
      };
    });
  }, [partners, projects, partnerTransactions]);

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summaries.filter(({ partner }) => {
      const matchesSearch =
        !q ||
        partner.name.toLowerCase().includes(q) ||
        partner.phone.includes(q) ||
        (partner.email ?? "").toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [summaries, searchQuery]);

  const { pagedItems, safePage } = usePagedSlice(filteredSummaries, page, pageSize);

  const totals = summaries.reduce(
    (acc, row) => ({
      earned: acc.earned + row.earned,
      earnedFy: acc.earnedFy + row.earnedFy,
      paid: acc.paid + row.paid,
      pending: acc.pending + row.pending,
    }),
    { earned: 0, earnedFy: 0, paid: 0, pending: 0 },
  );

  const resetForm = () => {
    setPartnerName("");
    setPartnerPhone("");
    setPartnerEmail("");
    setPartnerAddress("");
    setPartnerNotes("");
    setPartnerType("Profit-Share");
    setPartnerRate("");
  };

  const handleAddPartner = () => {
    if (!partnerName.trim() || !partnerPhone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }

    if (editingPartnerId) {
      updatePartner(editingPartnerId, {
        name: partnerName.trim(),
        phone: partnerPhone.trim(),
        type: partnerType,
        defaultRatePerKw: partnerRate ? parseFloat(partnerRate) : undefined,
        email: partnerEmail.trim() || undefined,
        address: partnerAddress.trim() || undefined,
        notes: partnerNotes.trim() || undefined,
      });
      toast({ title: "Partner updated" });
    } else {
      addPartner({
        id: generateId("PT"),
        name: partnerName.trim(),
        phone: partnerPhone.trim(),
        type: partnerType,
        defaultRatePerKw: partnerRate ? parseFloat(partnerRate) : undefined,
        email: partnerEmail.trim() || undefined,
        address: partnerAddress.trim() || undefined,
        notes: partnerNotes.trim() || undefined,
        createdAt: new Date().toISOString().split("T")[0],
      });
      toast({ title: "Partner added", description: "This partner can now be selected on projects." });
    }
    setIsAddOpen(false);
    setEditingPartnerId(null);
    resetForm();
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Partners" }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Partners", value: partners.length },
              { label: "Lifetime earned", value: formatCurrency(totals.earned) },
              { label: `Earned (FY ${fyLabel})`, value: formatCurrency(totals.earnedFy) },
              { label: "Paid to partners", value: formatCurrency(totals.paid) },
              { label: "Pending amount", value: formatCurrency(totals.pending) },
            ]}
          />
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }} disabled={!canDo("partner:update")}>
          <Plus className="mr-2 h-4 w-4" />
          Add partner
        </Button>
      </StickyPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search partner name, phone, or email"
            className="pl-9"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTableShell
        maxHeight={listTableViewportMaxHeight(pageSize)}
        scrollResetKey={`${safePage}-${pageSize}-${filteredSummaries.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={pageSize}
            total={filteredSummaries.length}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        <TableHeader>
          <TableRow className={dataTableClasses.headRow}>
            <TableHead>Partner</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Linked projects</TableHead>
            <TableHead className="text-right">Lifetime</TableHead>
            <TableHead className="text-right" title="Partner share from projects whose start date falls in the current Indian financial year (Apr–Mar).">
              FY {fyLabel}
            </TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right" title="Earned minus payments recorded (Given to Partner).">
              Settlement pending
            </TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSummaries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="p-0">
                {partners.length === 0 ? (
                  <ListEmptyState
                    icon={Users}
                    title="No partners yet"
                    description="Add partners (profit-share, fixed-rate, channel, or subcontractors)."
                    actionLabel="Add partner"
                    onAction={() => { resetForm(); setIsAddOpen(true); }}
                  />
                ) : (
                  <ListEmptyState
                    icon={Users}
                    title="No partners match this search"
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
          pagedItems.map(({ partner, linkedProjects, earned, earnedFy, paid, pending }) => (
            <TableRow key={partner.id} className="align-top">
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-primary">{partner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {partner.phone}
                    {partner.email ? ` - ${partner.email}` : ""}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-2xs font-medium">{partner.type ?? "—"}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {linkedProjects.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No project yet</span>
                  ) : (
                    linkedProjects.map((project) => (
                      <Badge key={project.id} variant="secondary" className="font-normal text-2xs">
                        {project.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(earned)}</TableCell>
              <TableCell className="text-right">{formatCurrency(earnedFy)}</TableCell>
              <TableCell className="text-right">{formatCurrency(paid)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(pending)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {pending > 0.5 && (
                    <Button size="sm" variant="secondary" className="h-8 text-2xs" asChild>
                      <Link to={`/partners/${partner.id}?action=record-payment`}>Pay</Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete partner" disabled={!canDo("partner:delete")} type="button" onClick={() => setPartnerToDelete({ id: partner.id, name: partner.name })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit partner" onClick={() => {
                    setPartnerName(partner.name);
                    setPartnerPhone(partner.phone);
                    setPartnerEmail(partner.email ?? "");
                    setPartnerAddress(partner.address ?? "");
                    setPartnerNotes(partner.notes ?? "");
                    setPartnerType(partner.type ?? "Profit-Share");
                    setPartnerRate(partner.defaultRatePerKw?.toString() ?? "");
                    setEditingPartnerId(partner.id);
                    setIsAddOpen(true);
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary" asChild>
                    <Link to={`/partners/${partner.id}`}>
                      Details
                      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )))}
        </TableBody>
      </DataTableShell>

      <Sheet open={isAddOpen} onOpenChange={(v) => { if(!v) { resetForm(); setEditingPartnerId(null); } setIsAddOpen(v); }}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader className="p-6 bg-primary/5 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editingPartnerId ? "Edit Partner" : "Add New Partner"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Partner Name *</Label>
              <Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Partner Type *</Label>
              <Select value={partnerType} onValueChange={(v: PartnerType) => setPartnerType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPES_ORDERED.map(t => (
                    <SelectItem key={t} value={t}>
                      <span className="font-medium">{t}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {partnerType && PARTNER_TYPE_PURPOSE[partnerType] && (
                <p className="text-2xs text-muted-foreground leading-tight">{PARTNER_TYPE_PURPOSE[partnerType]}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={partnerPhone} onChange={(event) => setPartnerPhone(event.target.value)} placeholder="Contact number" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={partnerEmail} onChange={(event) => setPartnerEmail(event.target.value)} placeholder="Email address" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={partnerAddress} onChange={(event) => setPartnerAddress(event.target.value)} placeholder="Office / Home address" />
            </div>
            {partnerType === "Fixed-Rate" && (
              <div className="space-y-2">
                <Label>Default Rate per kW (₹)</Label>
                <Input type="number" value={partnerRate} onChange={(event) => setPartnerRate(event.target.value)} placeholder="e.g. 70000" />
                <p className="text-2xs text-muted-foreground">This is the rate we receive. Can be overridden per project.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Basic Details / Notes</Label>
              <Input value={partnerNotes} onChange={(event) => setPartnerNotes(event.target.value)} placeholder="Region, history, or referral source" />
            </div>
          </div>
          <div className="p-6 bg-muted/20 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddPartner}>
              {editingPartnerId ? "Update Partner" : "Save Partner"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!partnerToDelete} onOpenChange={(open) => !open && setPartnerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete partner?</AlertDialogTitle>
            <AlertDialogDescription>
              {partnerToDelete
                ? `Remove ${partnerToDelete.name} from the directory. Project links and transactions may need cleanup. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (partnerToDelete) {
                  deletePartner(partnerToDelete.id);
                  toast({ title: "Partner removed", description: `${partnerToDelete.name} was deleted.` });
                }
                setPartnerToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default Partners;
