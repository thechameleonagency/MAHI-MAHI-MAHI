import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Edit, Users, Building2, Mail, MapPin, ExternalLink, UserPlus, Trash2 } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { toast } from "@/hooks/use-toast";
import type { Customer } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { formatINR } from "@/lib/formatCurrency";
import { validateContactPhone } from "@/lib/phoneValidators";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useMasters } from "@/contexts/MastersContext";
import { formatUiDate } from "@/lib/dateDisplay";
import { getCustomerKind, isCustomerArchived } from "@/lib/selectors";
import { useCan } from "@/hooks/useCan";
import { AgingChip } from "@/components/ui/AgingChip";
import { getCustomerReceivableAging } from "@/lib/agingHelpers";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { createNextCustomerId } from "@/lib/idFactory";

const Customers = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateCustomer = useCan("customer", "create");
  const canDeleteCustomer = useCan("customer", "delete");
  const { getStateCodes } = useMasters();
  const { 
    customers,
    invoices,
    saleBills,
    projects,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useAppData();
  
  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setListReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [kindFilter, setKindFilter] = useState<"all" | "project" | "inventory" | "both" | "archived">(() => {
    const k = searchParams.get("kind");
    if (k === "project" || k === "inventory" || k === "both" || k === "archived") return k;
    return "all";
  });
  type CustomerSortKey = "name" | "purchases_desc" | "received_desc" | "type";
  const [sortKey, setSortKey] = useState<CustomerSortKey>(() => {
    const s = searchParams.get("sort");
    if (s === "purchases_desc" || s === "received_desc" || s === "type") return s;
    return "name";
  });

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const q = searchQuery.trim();
        if (q) next.set("q", q);
        else next.delete("q");
        if (typeFilter !== "all") next.set("type", typeFilter);
        else next.delete("type");
        if (kindFilter !== "all") next.set("kind", kindFilter);
        else next.delete("kind");
        if (sortKey !== "name") next.set("sort", sortKey);
        else next.delete("sort");
        return next;
      },
      { replace: true },
    );
  }, [searchQuery, typeFilter, kindFilter, sortKey, setSearchParams]);
  
  // Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerType, setCustomerType] = useState<"company" | "individual">("individual");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerItems, setCustomerItems] = useState<string[]>([]);

  const resetCustomerForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setCustomerType("individual");
    setCustomerGstin("");
    setCustomerItems([]);
  };

  const validateGstin = (gstin: string): string | null => {
    if (!gstin) return null;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return "GSTIN must be a valid 15-character format.";
    }
    const stateCode = gstin.slice(0, 2);
    const validCodes = new Set(getStateCodes().map((s) => s.value));
    if (validCodes.size > 0 && !validCodes.has(stateCode)) {
      return "GSTIN state code (first two digits) must match a known Indian state / UT code.";
    }
    return null;
  };

  const handleAddCustomer = () => {
    if (!customerName || !customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    const phCheck = validateContactPhone(customerPhone);
    if (!phCheck.ok) {
      toast({ title: "Invalid phone", description: (phCheck as { message: string }).message, variant: "destructive" });
      return;
    }

    if (customerType === "company") {
      const gstError = validateGstin(customerGstin);
      if (gstError) {
        toast({ title: "Invalid GSTIN", description: gstError, variant: "destructive" });
        return;
      }
    }

    const newCustomer: Customer = {
      id: createNextCustomerId(customers.map((c) => c.id)),
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      type: customerType,
      gstin: customerType === "company" ? customerGstin : undefined,
      state: customerGstin ? customerGstin.slice(0, 2) : "08",
      itemsBought: customerItems,
      totalPurchases: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (!addCustomer(newCustomer)) return;
    setIsAddCustomerOpen(false);
    resetCustomerForm();
    setLastConfirm({ variant: "success", title: "Customer added", description: `${customerName} has been added successfully.` });
  };

  const handleEditCustomer = () => {
    if (!selectedCustomer || !customerName || !customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    const phEdit = validateContactPhone(customerPhone);
    if (!phEdit.ok) {
      toast({ title: "Invalid phone", description: (phEdit as { message: string }).message, variant: "destructive" });
      return;
    }

    if (customerType === "company") {
      const gstError = validateGstin(customerGstin);
      if (gstError) {
        toast({ title: "Invalid GSTIN", description: gstError, variant: "destructive" });
        return;
      }
    }

    updateCustomer(selectedCustomer.id, {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      type: customerType,
      gstin: customerType === "company" ? customerGstin : undefined,
      state: customerGstin ? customerGstin.slice(0, 2) : selectedCustomer.state,
      itemsBought: customerItems,
    });

    setIsEditCustomerOpen(false);
    resetCustomerForm();
    setLastConfirm({ variant: "success", title: "Customer updated", description: `${customerName} has been updated.` });
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;

    const linkedProjects = projects.filter(p => p.customerId === customerToDelete.id);
    const linkedInvoices = [...invoices, ...(saleBills ?? [])].filter(i => i.customerId === customerToDelete.id);
    if (linkedProjects.length > 0 || linkedInvoices.length > 0) {
      setLastConfirm({
        variant: "error",
        title: "Cannot delete customer",
        description: `This customer has ${linkedProjects.length} project(s) and ${linkedInvoices.length} invoice(s). Reassign or delete those first.`,
      });
      setCustomerToDelete(null);
      return;
    }

    const name = customerToDelete.name;
    deleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
    setLastConfirm({ variant: "warning", title: "Customer deleted", description: `${name} has been removed.` });
  };

  const openEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email);
    setCustomerAddress(customer.address);
    setCustomerType(customer.type);
    setCustomerGstin(customer.gstin || "");
    setCustomerItems(customer.itemsBought);
    setIsEditCustomerOpen(true);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const kind = getCustomerKind(c);
    const matchesKind =
      kindFilter === "all" ||
      (kindFilter === "archived" && isCustomerArchived(c)) ||
      (kindFilter !== "archived" && !isCustomerArchived(c) && (kind === kindFilter || kind === "both"));
    return matchesSearch && matchesType && matchesKind;
  });

  const sortedCustomers = useMemo(() => {
    const received = (customerId: string, customerName: string) => {
      const invs = invoices.filter(i => i.customerId === customerId || i.customerName === customerName);
      const sbs = saleBills.filter(sb => sb.customerId === customerId || sb.customerName === customerName);
      return [...invs, ...sbs].reduce((s, i) => s + (i.amountReceived ?? 0), 0);
    };
    const arr = [...filteredCustomers];
    if (sortKey === "purchases_desc") {
      arr.sort((a, b) => (b.totalPurchases ?? 0) - (a.totalPurchases ?? 0) || a.name.localeCompare(b.name));
    } else if (sortKey === "received_desc") {
      arr.sort(
        (a, b) =>
          received(b.id, b.name) - received(a.id, a.name) ||
          a.name.localeCompare(b.name),
      );
    } else if (sortKey === "type") {
      arr.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    } else {
      arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return arr;
  }, [filteredCustomers, sortKey, invoices, saleBills]);

  const formatCurrency = (amount: number) => formatINR(Math.round(amount || 0));

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Customers" }]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="relative max-w-full flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name, phone, or email"
                  className="h-9 border-border bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-full bg-muted/50 sm:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
                <SelectTrigger className="h-9 w-full bg-muted/50 sm:w-[180px]">
                  <SelectValue placeholder="Kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All kinds</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as CustomerSortKey)}>
                <SelectTrigger className="h-9 w-full bg-muted/50 sm:w-[200px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="purchases_desc">Total purchases (high → low)</SelectItem>
                  <SelectItem value="received_desc">Amount received (high → low)</SelectItem>
                  <SelectItem value="type">Type, then name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Total", value: customers.length },
                { label: "Companies", value: customers.filter((c) => c.type === "company").length },
                { label: "Individuals", value: customers.filter((c) => c.type === "individual").length },
                { label: "Volume", value: formatCurrency(customers.reduce((s, c) => s + c.totalPurchases, 0)) },
                { label: "Showing", value: sortedCustomers.length },
              ]}
            />
          </>
        }
      >
        <Button
          size="sm"
          disabled={!canCreateCustomer}
          onClick={() => { resetCustomerForm(); setIsAddCustomerOpen(true); }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
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

      {/* Customer Cards */}
      {!listReady ? (
        <ListSkeleton variant="cards" count={6} />
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCustomers.map((customer) => {
          const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
          const customerSaleBills = saleBills.filter((sb) => sb.customerId === customer.id);
          const allBills = [...customerInvoices, ...customerSaleBills];
          const pendingAmount = allBills.reduce((sum, inv) => sum + (inv.total - (inv.amountReceived || 0)), 0);
          const totalReceived = allBills.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
          const activeProjectsCount = projects.filter(
            (p) => p.customerId === customer.id && p.status === "Ongoing",
          ).length;
          const isLead = (customer.itemsBought?.length ?? 0) === 0 && (customer.totalPurchases ?? 0) === 0;
          
          return (
            <Card key={customer.id} className="bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {customer.type === "company" ? "Company" : "Individual"}
                  </span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {isLead && (
                      <Badge variant="outline" className="text-2xs border-dashed">
                        Lead
                      </Badge>
                    )}
                    {activeProjectsCount > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-2xs h-5 px-1.5 uppercase font-bold">
                        {activeProjectsCount} Active Job{activeProjectsCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {pendingAmount > 0 ? (
                      <Badge className="bg-warning/10 text-warning border-0 text-xs">
                        ₹{pendingAmount.toLocaleString()} Due
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">
                        All Clear
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {customer.type === "company" ? <Building2 className="h-5 w-5" /> : customer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 min-w-0">
                      <EntityLink
                        entityType="customer"
                        entityId={customer.id}
                        name={customer.name}
                        className="font-semibold text-foreground truncate text-left"
                      />
                      {pendingAmount > 0 && (
                        <AgingChip signal={getCustomerReceivableAging(allBills)} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-2 text-sm mb-4">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                  {customer.lastPurchase && (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Last purchase</span>
                      <span className="font-medium text-foreground">{formatUiDate(customer.lastPurchase)}</span>
                    </div>
                  )}
                  {customer.itemsBought && customer.itemsBought.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Items / services</p>
                      <div className="flex flex-wrap gap-1">
                        {customer.itemsBought.slice(0, 6).map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-2xs font-normal">
                            {item}
                          </Badge>
                        ))}
                        {customer.itemsBought.length > 6 && (
                          <Badge variant="outline" className="text-2xs">
                            +{customer.itemsBought.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 border-t pt-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className={`font-medium ${pendingAmount > 0 ? 'text-warning' : 'text-primary'}`}>
                        ₹{pendingAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received:</span>
                      <span className="font-medium text-primary">₹{totalReceived.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditCustomer(customer)}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/customers/${customer.id}`)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> View
                      </Button>
                      {canDeleteCustomer && (
                        <Button variant="ghost" size="icon" aria-label={`Delete customer ${customer.name}`} className="text-destructive hover:bg-destructive/10" onClick={() => setCustomerToDelete(customer)}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                    {isLead && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs"
                        type="button"
                        onClick={() => navigate(`/enquiries?fromCustomer=${encodeURIComponent(customer.id)}`)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Start enquiry from lead
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        customers.length === 0 ? (
          <ListEmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to start tracking deals and invoices."
            actionLabel={canCreateCustomer ? "Add your first customer" : undefined}
            onAction={canCreateCustomer ? () => { resetCustomerForm(); setIsAddCustomerOpen(true); } : undefined}
          />
        ) : (
          <ListEmptyState
            icon={Users}
            title="No customers match"
            description="Try clearing search or type filter."
            actionLabel="Clear filters"
            onAction={() => { setSearchQuery(""); setTypeFilter("all"); setKindFilter("all"); setSortKey("name"); }}
          />
        )
      )}
      </>
      )}

      {/* Add Customer Sheet */}
      <Sheet open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add New Customer</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as "company" | "individual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full address" />
            </div>
            {customerType === "company" && (
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="08AABCS1234A1Z5" />
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddCustomer}>Add Customer</Button>
            </div>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Edit Customer Sheet */}
      <Sheet open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit Customer</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as "company" | "individual")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
            {customerType === "company" && (
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditCustomerOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditCustomer}>Save Changes</Button>
            </div>
          </div>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!customerToDelete}
        onOpenChange={(o) => { if (!o) setCustomerToDelete(null); }}
        title={customerToDelete ? `Delete ${customerToDelete.name}?` : "Delete customer?"}
        description={
          customerToDelete ? (() => {
            const invN = invoices.filter((i) => i.customerId === customerToDelete.id).length;
            const sbN = saleBills.filter((s) => s.customerId === customerToDelete.id).length;
            const linkedProjects = projects.filter((p) => p.customerId === customerToDelete.id).length;
            const hasLinks = invN + sbN + linkedProjects > 0;
            return (
              <div className="space-y-2">
                <p>{hasLinks
                  ? `This customer is linked to ${invN} invoice(s), ${sbN} sale bill(s), and ${linkedProjects} project(s).`
                  : "This customer has no linked records."
                }</p>
                <p className="text-xs text-muted-foreground">
                  Deleting them removes the contact record permanently. Linked invoices and projects must be reassigned or deleted first; otherwise this action is blocked.
                </p>
              </div>
            );
          })() : ""
        }
        confirmLabel="Delete customer"
        onConfirm={handleDeleteCustomer}
      />
    </PageShell>
  );
};

export default Customers;
