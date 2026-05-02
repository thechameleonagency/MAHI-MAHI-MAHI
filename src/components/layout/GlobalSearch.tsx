import { useState, useEffect, useRef } from "react";
import { Search, Building2, Users, FileText, Package, Handshake, Receipt, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  type: "project" | "customer" | "employee" | "invoice" | "quotation" | "partner" | "vendor";
  subtitle?: string;
  path: string;
};

const typeConfig = {
  project: { icon: Building2, label: "Project", color: "bg-blue-500/20 text-blue-400" },
  customer: { icon: Users, label: "Customer", color: "bg-blue-500/20 text-blue-400" },
  employee: { icon: Users, label: "Employee", color: "bg-purple-500/20 text-purple-400" },
  invoice: { icon: Receipt, label: "Invoice", color: "bg-orange-500/20 text-orange-400" },
  quotation: { icon: FileText, label: "Quotation", color: "bg-cyan-500/20 text-cyan-400" },
  partner: { icon: Handshake, label: "Partner", color: "bg-yellow-500/20 text-yellow-400" },
  vendor: { icon: Package, label: "Vendor", color: "bg-pink-500/20 text-pink-400" },
};

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { projects, customers, employees, invoices, saleBills, quotations, partners, vendors } = useAppData();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    // Search projects
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(searchQuery) || p.client?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          id: p.id,
          name: p.name,
          type: "project",
          subtitle: p.client,
          path: `/projects/${p.id}`,
        });
      }
    });

    // Search customers
    customers.forEach((c) => {
      if (c.name.toLowerCase().includes(searchQuery) || c.phone?.includes(searchQuery)) {
        searchResults.push({
          id: c.id,
          name: c.name,
          type: "customer",
          subtitle: c.phone,
          path: `/customers/${c.id}`,
        });
      }
    });

    // Search employees
    employees.forEach((e) => {
      if (e.name.toLowerCase().includes(searchQuery) || e.phone?.includes(searchQuery)) {
        searchResults.push({
          id: String(e.id),
          name: e.name,
          type: "employee",
          subtitle: e.role,
          path: `/employees/${e.id}`,
        });
      }
    });

    // Search invoices + sale bills (unified list route)
    [...invoices, ...saleBills].forEach((i) => {
      if (i.invoiceNumber?.toLowerCase().includes(searchQuery) || i.customerName?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          id: i.id,
          name: i.invoiceNumber || `DOC-${i.id}`,
          type: "invoice",
          subtitle: i.customerName,
          path: `/invoices?invoice=${i.id}`,
        });
      }
    });

    // Search quotations
    quotations.forEach((q) => {
      const qNum = q.quotationNumber || `QUO-${q.id}`;
      if (qNum.toLowerCase().includes(searchQuery) || q.clientName?.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          id: q.id,
          name: qNum,
          type: "quotation",
          subtitle: q.clientName,
          path: `/quotations?quotation=${q.id}`,
        });
      }
    });

    // Search partners
    partners.forEach((p) => {
      if (p.name.toLowerCase().includes(searchQuery) || p.phone?.includes(searchQuery)) {
        searchResults.push({
          id: p.id,
          name: p.name,
          type: "partner",
          subtitle: p.phone,
          path: `/finance?tab=partners&partner=${p.id}`,
        });
      }
    });

    // Search vendors from context
    vendors.forEach((v) => {
      if (v.name.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          id: String(v.id),
          name: v.name,
          type: "vendor",
          subtitle: v.category?.join(", ") || "",
          path: `/vendors/${v.id}`,
        });
      }
    });

    setResults(searchResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, projects, customers, employees, invoices, saleBills, quotations, partners, vendors]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-8 bg-sidebar-accent/50 border-sidebar-border text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {results.map((result, index) => {
                const config = typeConfig[result.type];
                const Icon = config.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className={cn("p-1.5 rounded", config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.name}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {config.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
