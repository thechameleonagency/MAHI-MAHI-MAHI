import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Store,
  Phone,
  Mail,
  MapPin,
  Eye,
  IndianRupee,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import type { Vendor } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

/** Same normalization as Finance (legacy); finance tab filter keywords are lowercase snippets. */
type VendorVm = {
  id: number;
  name: string;
  category: string[];
  contact: string;
  email: string;
  address: string;
  outstandingAmount: number;
  purchaseHistory: { date: string; item: string; amount: number }[];
};

const Vendors = () => {
  const navigate = useNavigate();
  const { vendors: rawVendors, addVendor, updateVendor } = useAppData();

  const vendors: VendorVm[] = useMemo(
    () =>
      rawVendors.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category?.length ? v.category : ["Vendor"],
        contact: v.contact,
        email: v.email || "",
        address: v.address || "",
        outstandingAmount: v.outstandingAmount || 0,
        purchaseHistory: v.purchaseHistory || [],
      })),
    [rawVendors],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("all");

  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [vendorName, setVendorName] = useState("");
  const [vendorCategory, setVendorCategory] = useState<string[]>([]);
  const [vendorContact, setVendorContact] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const categories = ["Panels", "Inverters", "Batteries", "Structure", "Cables", "Tools", "Civil", "Transport", "Other"];

  const resetForm = () => {
    setVendorName("");
    setVendorCategory([]);
    setVendorContact("");
    setVendorEmail("");
    setVendorAddress("");
  };

  const handleAddVendor = () => {
    if (!vendorName || !vendorContact) {
      toast({ title: "Error", description: "Name and contact are required", variant: "destructive" });
      return;
    }

    const newVendor: Vendor = {
      id: Date.now(),
      name: vendorName,
      category: vendorCategory.length ? vendorCategory : ["Other"],
      contact: vendorContact,
      email: vendorEmail,
      address: vendorAddress,
      outstandingAmount: 0,
      purchaseHistory: [],
    };

    addVendor(newVendor);
    setIsAddVendorOpen(false);
    resetForm();
    toast({ title: "Vendor Added", description: `${vendorName} has been registered.` });
  };

  const handleEditVendor = () => {
    if (!selectedVendor || !vendorName || !vendorContact) {
      toast({ title: "Error", description: "Name and contact are required", variant: "destructive" });
      return;
    }

    updateVendor(selectedVendor.id, {
      name: vendorName,
      category: vendorCategory.length ? vendorCategory : ["Other"],
      contact: vendorContact,
      email: vendorEmail,
      address: vendorAddress,
    });

    setIsEditVendorOpen(false);
    resetForm();
    toast({ title: "Vendor Updated", description: `${vendorName}` });
  };

  const openEditVendor = (v: VendorVm) => {
    const full = rawVendors.find((x) => x.id === v.id);
    if (!full) return;
    setSelectedVendor(full);
    setVendorName(full.name);
    setVendorCategory(full.category?.length ? full.category : ["Other"]);
    setVendorContact(full.contact);
    setVendorEmail(full.email || "");
    setVendorAddress(full.address || "");
    setIsEditVendorOpen(true);
  };

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.contact.includes(searchQuery.trim()) ||
        v.email?.toLowerCase().includes(q);
      const matchesCategory =
        vendorCategoryFilter === "all" ||
        v.category.some((c) => c.toLowerCase().includes(vendorCategoryFilter.toLowerCase()));
      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchQuery, vendorCategoryFilter]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstandingAmount, 0);
  const totalPurchases = vendors.reduce(
    (sum, v) => sum + v.purchaseHistory.reduce((s, p) => s + p.amount, 0),
    0,
  );
  const withDues = vendors.filter((v) => v.outstandingAmount > 0).length;

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Vendors" }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Vendors", value: vendors.length },
              { label: "Outstanding", value: formatCurrency(totalOutstanding) },
              { label: "Purchases", value: formatCurrency(totalPurchases) },
              { label: "With dues", value: withDues },
            ]}
          />
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddVendorOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add vendor
        </Button>
      </StickyPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email…"
            className="border-border bg-muted/40 pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={vendorCategoryFilter} onValueChange={setVendorCategoryFilter}>
            <SelectTrigger className="w-full border-border bg-muted/50 sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="solar panels">Solar Panels</SelectItem>
              <SelectItem value="inverter">Inverter</SelectItem>
              <SelectItem value="battery">Battery</SelectItem>
              <SelectItem value="cable">Cable</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setIsAddVendorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVendors.map((vendor) => {
          const purchaseTotal = vendor.purchaseHistory.reduce((sum, p) => sum + p.amount, 0);
          const lastPurchase =
            vendor.purchaseHistory.length > 0
              ? [...vendor.purchaseHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
              : null;
          const purchaseCount = vendor.purchaseHistory.length;

          return (
            <Card key={vendor.id} className="bg-card transition-shadow hover:shadow-md">
              <CardContent className="p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between md:mb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {vendor.category.length > 0 ? vendor.category[0] : "Vendor"}
                  </span>
                  {vendor.outstandingAmount > 0 ? (
                    <Badge className="border-0 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
                      {formatCurrency(vendor.outstandingAmount)} Due
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-blue-500/10 text-xs text-blue-600">All Clear</Badge>
                  )}
                </div>

                <div className="mb-3 flex items-center gap-3 md:mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 md:h-12 md:w-12">
                    <Store className="h-5 w-5 text-primary md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground md:text-sm">{vendor.contact}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Purchase Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span className={`font-medium ${vendor.outstandingAmount > 0 ? "text-amber-600" : "text-blue-600"}`}>
                        {formatCurrency(vendor.outstandingAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Purchases</span>
                      <span className="font-medium text-primary">{formatCurrency(purchaseTotal)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">({purchaseCount} purchase records)</div>
                  <div className="space-y-1 border-t pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-medium text-blue-600">{formatCurrency(purchaseTotal - vendor.outstandingAmount)}</span>
                    </div>
                    {lastPurchase && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Last Purchase</span>
                        <span className="font-medium text-primary">
                          {new Date(lastPurchase.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 text-sm font-semibold">
                      <span>Outstanding</span>
                      <span className={vendor.outstandingAmount > 0 ? "text-amber-600" : "text-blue-600"}>
                        {formatCurrency(vendor.outstandingAmount)}
                      </span>
                    </div>
                  </div>
                  {vendor.category.length > 1 && (
                    <div className="flex items-center justify-between border-t pt-2 text-xs">
                      <span className="text-muted-foreground">Categories</span>
                      <div className="flex gap-1">
                        {vendor.category.slice(0, 2).map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {cat}
                          </Badge>
                        ))}
                        {vendor.category.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{vendor.category.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {(vendor.email || vendor.address) && (
                    <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                      {vendor.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="leading-snug">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 border-t pt-3 md:mt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      type="button"
                      onClick={() => navigate(`/vendors/${vendor.id}?action=add-purchase`)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Purchase
                    </Button>
                    {vendor.outstandingAmount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        type="button"
                        onClick={() => navigate(`/vendors/${vendor.id}?action=record-payment`)}
                      >
                        <IndianRupee className="mr-1 h-3 w-3" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 text-xs" type="button" onClick={() => openEditVendor(vendor)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" type="button" asChild>
                      <Link to={`/vendors/${vendor.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        Detail
                      </Link>
                    </Button>
                  </div>
                  <Link to={`/vendors/${vendor.id}`} className="block w-full">
                    <Button variant="default" size="sm" className="w-full text-xs">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View Full Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredVendors.length === 0 && (
        <div className="py-12 text-center">
          <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No vendors match.</p>
          <Button className="mt-4" type="button" onClick={() => { resetForm(); setIsAddVendorOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Register vendor
          </Button>
        </div>
      )}

      <Sheet open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add vendor</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <Select
                value={vendorCategory[0] || ""}
                onValueChange={(v) => setVendorCategory(v ? [v] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact *</Label>
              <Input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} placeholder="+91 …" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" type="button" onClick={() => setIsAddVendorOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" type="button" onClick={handleAddVendor}>
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isEditVendorOpen} onOpenChange={setIsEditVendorOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Edit vendor</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <Select
                value={vendorCategory[0] || ""}
                onValueChange={(v) => setVendorCategory(v ? [v] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact *</Label>
              <Input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" type="button" onClick={() => setIsEditVendorOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" type="button" onClick={handleEditVendor}>
                Save changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Vendors;
