import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Search, Users } from "lucide-react";
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
  calculateProjectPartnerEarning,
  calculateProjectVendorshipFee,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,
} from "@/domain/partners/derivePartnerEconomics";
import type { Partner } from "@/types/finance";

const formatCurrency = (amount: number) => `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;

const Partners = () => {
  const { partners, projects, partnerTransactions, addPartner, generateId } = useAppData();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerAddress, setPartnerAddress] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");

  const summaries = useMemo(() => {
    return partners.map((partner) => {
      const linkedProjects = projects.filter((project) =>
        project.partners?.some((projectPartner) => projectPartner.partnerId === partner.id),
      );
      const earned = linkedProjects.reduce((sum, project) => {
        const projectPartner = project.partners?.find((row) => row.partnerId === partner.id);
        return projectPartner ? sum + calculateProjectPartnerEarning(project, projectPartner) : sum;
      }, 0);
      const txns = partnerTransactions.filter((txn) => txn.partnerId === partner.id);
      const paid = txns.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
      const received = txns.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);
      return {
        partner,
        linkedProjects,
        earned,
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
      paid: acc.paid + row.paid,
      pending: acc.pending + row.pending,
    }),
    { earned: 0, paid: 0, pending: 0 },
  );

  const resetForm = () => {
    setPartnerName("");
    setPartnerPhone("");
    setPartnerEmail("");
    setPartnerAddress("");
    setPartnerNotes("");
  };

  const handleAddPartner = () => {
    if (!partnerName.trim() || !partnerPhone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }

    addPartner({
      id: generateId("PT"),
      name: partnerName.trim(),
      phone: partnerPhone.trim(),
      email: partnerEmail.trim() || undefined,
      address: partnerAddress.trim() || undefined,
      notes: partnerNotes.trim() || undefined,
      createdAt: new Date().toISOString().split("T")[0],
    });
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Partner added", description: "This partner can now be selected on projects." });
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
              { label: "Total earned", value: formatCurrency(totals.earned) },
              { label: "Paid to partners", value: formatCurrency(totals.paid) },
              { label: "Pending amount", value: formatCurrency(totals.pending) },
            ]}
          />
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
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
            <TableHead>Linked projects</TableHead>
            <TableHead className="text-right">Earned</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedItems.map(({ partner, linkedProjects, earned, paid, pending }) => (
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
                <div className="flex flex-wrap gap-1.5">
                  {linkedProjects.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No project yet</span>
                  ) : (
                    linkedProjects.map((project) => (
                      <Badge key={project.id} variant="secondary" className="font-normal text-[10px]">
                        {project.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(earned)}</TableCell>
              <TableCell className="text-right text-sm">{formatCurrency(paid)}</TableCell>
              <TableCell className="text-right text-sm font-semibold">{formatCurrency(pending)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" className="text-primary" asChild>
                  <Link to={`/partners/${partner.id}`}>
                    Details
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <Sheet open={isAddOpen} onOpenChange={(v) => { if(!v) resetForm(); setIsAddOpen(v); }}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader className="p-6 bg-primary/5 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Add New Partner
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Partner Name *</Label>
              <Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="Full name" />
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
            <div className="space-y-2">
              <Label>Basic Details / Notes</Label>
              <Input value={partnerNotes} onChange={(event) => setPartnerNotes(event.target.value)} placeholder="Skills, region, or referral source" />
            </div>
          </div>
          <div className="p-6 bg-muted/20 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddPartner}>
              Save Partner
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Partners;
