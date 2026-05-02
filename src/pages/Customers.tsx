import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Eye, Users, Building2, Phone, Mail, MapPin, IndianRupee, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Removed AlertDialog
import { toast } from "@/hooks/use-toast";
import type { Customer } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const Customers = () => {
  const navigate = useNavigate();
  const { 
    customers,
    invoices,
    saleBills,
    projects,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    generateId,
  } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

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

  const handleAddCustomer = () => {
    if (!customerName || !customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    const newCustomer: Customer = {
      id: generateId('C'),
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      type: customerType,
      gstin: customerType === "company" ? customerGstin : undefined,
      state: "08",
      itemsBought: customerItems,
      totalPurchases: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    addCustomer(newCustomer);
    setIsAddCustomerOpen(false);
    resetCustomerForm();
    toast({ title: "Customer Added", description: `${customerName} has been added successfully` });
  };

  const handleEditCustomer = () => {
    if (!selectedCustomer || !customerName || !customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }

    updateCustomer(selectedCustomer.id, {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      type: customerType,
      gstin: customerType === "company" ? customerGstin : undefined,
      itemsBought: customerItems,
    });

    setIsEditCustomerOpen(false);
    resetCustomerForm();
    toast({ title: "Customer Updated", description: `${customerName} has been updated` });
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    
    deleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
    toast({ title: "Customer Deleted", description: "Customer has been removed" });
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

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Finance" }, { label: "Customers" }]}
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
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Total", value: customers.length },
                { label: "Companies", value: customers.filter((c) => c.type === "company").length },
                { label: "Individuals", value: customers.filter((c) => c.type === "individual").length },
                { label: "Volume", value: formatCurrency(customers.reduce((s, c) => s + c.totalPurchases, 0)) },
                { label: "Showing", value: filteredCustomers.length },
              ]}
            />
          </>
        }
      >
        <Button size="sm" onClick={() => { resetCustomerForm(); setIsAddCustomerOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </StickyPageHeader>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const customerInvoices = invoices.filter(i => i.customerId === customer.id || i.customerName === customer.name);
          const customerSaleBills = saleBills.filter(sb => sb.customerId === customer.id || sb.customerName === customer.name);
          const allBills = [...customerInvoices, ...customerSaleBills];
          const pendingAmount = allBills.reduce((sum, inv) => sum + (inv.total - inv.amountReceived), 0);
          const totalReceived = allBills.reduce((sum, inv) => sum + inv.amountReceived, 0);
          const activeProjectsCount = projects.filter(p => p.client === customer.name && p.status === "Ongoing").length;
          
          return (
            <Card key={customer.id} className="bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {customer.type === "company" ? "Company" : "Individual"}
                  </span>
                  <div className="flex gap-2">
                    {activeProjectsCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-0 text-[10px] h-5 px-1.5 uppercase font-bold">
                        {activeProjectsCount} Active Job{activeProjectsCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {pendingAmount > 0 ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-0 text-xs">
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
                    <p className="font-semibold text-foreground">{customer.name}</p>
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
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 border-t pt-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className={`font-medium ${pendingAmount > 0 ? 'text-amber-500' : 'text-primary'}`}>
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
                  {customerToDelete?.id === customer.id ? (
                    <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-xs text-destructive-foreground font-medium text-center">Delete {customer.name}?</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setCustomerToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" size="sm" className="flex-1 h-8" onClick={handleDeleteCustomer}>Delete</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditCustomer(customer)}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/customers/${customer.id}`)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setCustomerToDelete(customer)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No customers found</p>
          <Button className="mt-4" onClick={() => { resetCustomerForm(); setIsAddCustomerOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Customer
          </Button>
        </div>
      )}

      {/* Add Customer Sheet */}
      <Sheet open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Edit Customer Sheet */}
      <Sheet open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Deleted AlertDialog */}
    </PageShell>
  );
};

export default Customers;
