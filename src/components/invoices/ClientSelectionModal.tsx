import { useState, useMemo } from "react";
import { Search, User, Building2, Phone, MapPin, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Customer } from "@/types/finance";

interface ClientSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  searchValue?: string;
  onSelect: (customer: Customer) => void;
  onAddNew: () => void;
}

export function ClientSelectionModal({
  open,
  onOpenChange,
  customers,
  searchValue = "",
  onSelect,
  onAddNew,
}: ClientSelectionModalProps) {
  const [search, setSearch] = useState(searchValue);

  // Filter and sort customers based on search
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) {
      return customers.slice(0, 10); // Show first 10 if no search
    }

    const searchLower = search.toLowerCase();
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(searchLower)
      )
      .slice(0, 20);
  }, [customers, search]);

  // Get suggested matches (exact or close matches)
  const suggestedMatches = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    
    const searchLower = search.toLowerCase();
    return customers
      .filter(c => 
        c.name.toLowerCase().startsWith(searchLower) ||
        c.phone.startsWith(search)
      )
      .slice(0, 3);
  }, [customers, search]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="md">
        <SheetHeader>
          <SheetTitle>Select Client</SheetTitle>
        </SheetHeader>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Suggested Matches */}
        {suggestedMatches.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase">Suggested Matches</p>
            <div className="space-y-2">
              {suggestedMatches.map(customer => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 border-2 border-primary/30 bg-primary/5 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {customer.type === "company" ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Customers */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {customer.type === "company" ? (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                        {customer.address && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="h-3 w-3" />
                            {customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {customer.type}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No customers found</p>
                <p className="text-xs mt-1">Try a different search or add a new customer</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Client
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </AppSheetContent>
    </Sheet>
  );
}
