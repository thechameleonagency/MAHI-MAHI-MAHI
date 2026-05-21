import { useState, useEffect, useRef } from "react";
import {
  Search,
  Building2,
  Users,
  FileText,
  Package,
  Handshake,
  Receipt,
  X,
  Warehouse,
  Wrench,
  UserPlus,
  ClipboardList,
  UsersRound,
  Landmark,
  ListTodo,
  ShieldCheck,
  HardHat,
  MapPin,
  LayoutTemplate,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import {
  buildProjectActorScopeContext,
  filterProjectsForActor,
} from "@/lib/projectActorScope";
import { normalizeLoanPersonKey } from "@/lib/loanPerson";
import { ICON_CLASS_NAV } from "@/lib/iconSizes";
import {
  computeMatchTier,
  isEmployeeSearchTerminal,
  isEnquirySearchTerminal,
  isInvoiceSearchTerminal,
  isProjectSearchTerminal,
  isQuotationSearchTerminal,
  isSiteSearchTerminal,
  isTaskSearchTerminal,
  isTeamSearchTerminal,
  isToolSearchTerminal,
  sortGlobalSearchResults,
  type GlobalSearchMatchTier,
} from "@/lib/globalSearchRank";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  type:
    | "project"
    | "customer"
    | "employee"
    | "invoice"
    | "quotation"
    | "partner"
    | "vendor"
    | "inventory"
    | "tool"
    | "agent"
    | "enquiry"
    | "team"
    | "loan"
    | "task"
    | "vendorship_company"
    | "inc_source"
    | "site"
    | "template";
  subtitle?: string;
  path: string;
  matchTier: GlobalSearchMatchTier;
  isTerminal: boolean;
};

const pushSearchMatch = (
  list: SearchResult[],
  query: string,
  fields: (string | undefined | null)[],
  row: Omit<SearchResult, "matchTier" | "isTerminal">,
  isTerminal: boolean,
): void => {
  const tier = computeMatchTier(query, fields);
  if (tier === null) return;
  list.push({ ...row, matchTier: tier, isTerminal });
};

const typeConfig = {
  project: { icon: Building2, label: "Project", color: "bg-primary/20 text-primary" },
  customer: { icon: Users, label: "Customer", color: "bg-primary/20 text-primary" },
  employee: { icon: Users, label: "Employee", color: "bg-accent/20 text-accent-foreground" },
  invoice: { icon: Receipt, label: "Invoice", color: "bg-warning/20 text-warning" },
  quotation: { icon: FileText, label: "Quotation", color: "bg-secondary text-secondary-foreground" },
  partner: { icon: Handshake, label: "Partner", color: "bg-warning/20 text-warning" },
  vendor: { icon: Package, label: "Vendor", color: "bg-destructive/20 text-destructive" },
  inventory: { icon: Warehouse, label: "Inventory", color: "bg-success/20 text-success" },
  tool: { icon: Wrench, label: "Tool", color: "bg-slate-500/20 text-slate-400" },
  agent: { icon: UserPlus, label: "Agent", color: "bg-primary/20 text-primary" },
  enquiry: { icon: ClipboardList, label: "Enquiry", color: "bg-primary/20 text-primary" },
  team: { icon: UsersRound, label: "Team", color: "bg-accent/20 text-accent-foreground" },
  loan: { icon: Landmark, label: "Loan", color: "bg-accent/20 text-accent-foreground" },
  task: { icon: ListTodo, label: "Task", color: "bg-warning/20 text-warning" },
  vendorship_company: { icon: ShieldCheck, label: "Vendorship", color: "bg-primary/20 text-primary" },
  inc_source: { icon: HardHat, label: "INC source", color: "bg-warning/20 text-warning" },
  site: { icon: MapPin, label: "Site", color: "bg-lime-500/20 text-lime-400" },
  template: { icon: LayoutTemplate, label: "Template", color: "bg-accent/20 text-accent-foreground" },
};

type GlobalSearchProps = {
  onNavigate?: () => void;
  /**
   * Mobile top sheet: in-flow panel + sticky input (MR6 — avoids absolute popover scroll-trap with keyboard).
   */
  embedded?: boolean;
};

const GlobalSearch = ({ onNavigate, embedded = false }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { permissionService } = useFoundation();
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const {
    projects,
    customers,
    employees,
    invoices,
    saleBills,
    quotations,
    partners,
    vendors,
    inventoryItems,
    tools,
    agents,
    enquiries,
    teams,
    settingsTeamMembers,
    scheduledInstallations,
    loans,
    tasks,
    vendorshipCompanies,
    incGiverCompanies,
    sites,
    quotationTemplates,
  } = useAppData();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    const scopedProjects = filterProjectsForActor(
      projects,
      buildProjectActorScopeContext({
        role: currentRole,
        actorMemberId: sessionUserId,
        actorDisplayName: demoUserName,
        quotations,
        enquiries,
        teams,
        employees,
        settingsTeamMembers,
        scheduledInstallations,
      }),
    );
    const scopedProjectIds = new Set(scopedProjects.map((p) => p.id));

    scopedProjects.forEach((p) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [p.name, p.client],
        {
          id: p.id,
          name: p.name,
          type: "project",
          subtitle: p.client,
          path: `/projects/${p.id}`,
        },
        isProjectSearchTerminal(p),
      );
    });

    customers.forEach((c) => {
      if (c.archivedAt) return;
      pushSearchMatch(
        searchResults,
        searchQuery,
        [c.name, c.phone],
        {
          id: c.id,
          name: c.name,
          type: "customer",
          subtitle: c.phone,
          path: `/customers/${c.id}`,
        },
        false,
      );
    });

    employees.forEach((e) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [e.name, e.phone],
        {
          id: String(e.id),
          name: e.name,
          type: "employee",
          subtitle: e.role,
          path: `/employees/${e.id}`,
        },
        isEmployeeSearchTerminal(e.status),
      );
    });

    [...invoices, ...saleBills].forEach((i) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [i.invoiceNumber, i.customerName],
        {
          id: i.id,
          name: i.invoiceNumber || `DOC-${i.id}`,
          type: "invoice",
          subtitle: i.customerName,
          path: `/invoices?invoice=${i.id}`,
        },
        isInvoiceSearchTerminal(i.status),
      );
    });

    quotations.forEach((q) => {
      const qNum = q.quotationNumber || `QUO-${q.id}`;
      pushSearchMatch(
        searchResults,
        searchQuery,
        [qNum, q.clientName],
        {
          id: q.id,
          name: qNum,
          type: "quotation",
          subtitle: q.clientName,
          path: `/quotations?quotation=${q.id}`,
        },
        isQuotationSearchTerminal(q.status),
      );
    });

    partners.forEach((p) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [p.name, p.phone],
        {
          id: p.id,
          name: p.name,
          type: "partner",
          subtitle: p.phone,
          path: `/partners/${p.id}`,
        },
        false,
      );
    });

    vendors.forEach((v) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [v.name, v.category?.join(", ")],
        {
          id: String(v.id),
          name: v.name,
          type: "vendor",
          subtitle: v.category?.join(", ") || "",
          path: `/vendors/${v.id}`,
        },
        false,
      );
    });

    inventoryItems.forEach((it) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [it.name, it.category, it.hsn],
        {
          id: `inv-item-${it.id}`,
          name: it.name,
          type: "inventory",
          subtitle: it.category,
          path: `/inventory/materials`,
        },
        false,
      );
    });

    tools.forEach((t) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [t.name, t.category, t.status],
        {
          id: `tool-${t.id}`,
          name: t.name,
          type: "tool",
          subtitle: t.status,
          path: `/inventory/tools`,
        },
        isToolSearchTerminal(t.status),
      );
    });

    agents.forEach((a) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [a.name, a.phone],
        {
          id: a.id,
          name: a.name,
          type: "agent",
          subtitle: a.phone,
          path: `/agents/${a.id}`,
        },
        false,
      );
    });

    enquiries.forEach((e) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [e.customerName, e.customerPhone, e.status],
        {
          id: e.id,
          name: e.customerName,
          type: "enquiry",
          subtitle: e.status,
          path: `/enquiries?open=${e.id}`,
        },
        isEnquirySearchTerminal(e.status),
      );
    });

    teams.forEach((team) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [team.name, team.status],
        {
          id: team.id,
          name: team.name,
          type: "team",
          subtitle: team.status,
          path: `/teams/${team.id}`,
        },
        isTeamSearchTerminal(team.status),
      );
    });

    loans.forEach((loan) => {
      const personKey = normalizeLoanPersonKey(loan);
      pushSearchMatch(
        searchResults,
        searchQuery,
        [loan.personName, loan.source, personKey],
        {
          id: loan.id,
          name: loan.personName?.trim() || loan.source,
          type: "loan",
          subtitle: loan.sourceType ? `${loan.sourceType} · ${loan.source}` : loan.source,
          path: `/loans/person/${encodeURIComponent(personKey)}`,
        },
        false,
      );
    });

    tasks.forEach((task) => {
      if (task.projectId && !scopedProjectIds.has(task.projectId)) return;
      pushSearchMatch(
        searchResults,
        searchQuery,
        [task.workType, task.notes, task.siteName],
        {
          id: task.id,
          name: task.workType || "Task",
          type: "task",
          subtitle: task.siteName,
          path: `/projects/${task.projectId}`,
        },
        isTaskSearchTerminal(task.status),
      );
    });

    (vendorshipCompanies ?? []).forEach((c) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [c.name, c.registrationCode, c.email, c.phone],
        {
          id: c.id,
          name: c.name,
          type: "vendorship_company",
          subtitle: c.registrationCode,
          path: `/vendorship/${c.id}`,
        },
        false,
      );
    });

    (incGiverCompanies ?? []).forEach((c) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [c.name, c.email, c.phone],
        {
          id: c.id,
          name: c.name,
          type: "inc_source",
          subtitle: c.phone,
          path: `/inc-sources/${c.id}`,
        },
        false,
      );
    });

    sites.forEach((s) => {
      if (s.projectId && !scopedProjectIds.has(s.projectId)) return;
      pushSearchMatch(
        searchResults,
        searchQuery,
        [s.name, s.projectName, s.projectId],
        {
          id: `site-${s.id}-${s.projectId}`,
          name: s.name,
          type: "site",
          subtitle: s.projectName || s.projectId,
          path: `/projects/${s.projectId}`,
        },
        isSiteSearchTerminal(s),
      );
    });

    quotationTemplates.forEach((t) => {
      pushSearchMatch(
        searchResults,
        searchQuery,
        [t.name, t.segment],
        {
          id: t.id,
          name: t.name,
          type: "template",
          subtitle: t.segment,
          path: `/templates`,
        },
        false,
      );
    });

    const allowed = searchResults.filter((r) => {
      const base = r.path.split("?")[0].split("#")[0];
      return permissionService.canAccessPath(currentRole, base);
    });

    setResults(sortGlobalSearchResults(allowed).slice(0, 20));
    setSelectedIndex(0);
  }, [
    query,
    currentRole,
    sessionUserId,
    demoUserName,
    permissionService,
    projects,
    customers,
    employees,
    invoices,
    saleBills,
    quotations,
    partners,
    vendors,
    inventoryItems,
    tools,
    agents,
    enquiries,
    teams,
    settingsTeamMembers,
    scheduledInstallations,
    loans,
    tasks,
    vendorshipCompanies,
    incGiverCompanies,
    sites,
    quotationTemplates,
  ]);

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
    onNavigate?.();
  };

  const showResultsPanel = isOpen && results.length > 0;
  const showEmptyPanel = isOpen && query.length > 0 && results.length === 0;

  const dropdownShellClass = cn(
    "z-50 flex max-h-[50vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-popover shadow-lg",
    embedded ? "relative mt-2 w-full" : "absolute left-0 right-0 top-full mt-1",
  );

  const dropdownScrollClass =
    "min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]";

  return (
    <div
      ref={containerRef}
      className={cn("w-full", embedded ? "flex min-h-0 flex-col" : "relative")}
    >
      <div
        className={cn(
          "relative shrink-0",
          embedded && "sticky top-0 z-10 bg-background pb-2",
        )}
      >
        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", ICON_CLASS_NAV)} />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          aria-label="Global search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-8 border-sidebar-border bg-sidebar-accent/50 pl-9 pr-8 text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className={ICON_CLASS_NAV} />
          </button>
        )}
      </div>

      {showResultsPanel && (
        <div className={dropdownShellClass} role="listbox" aria-label="Search results">
          <div className={cn(dropdownScrollClass, "p-1")}>
            {results.map((result, index) => {
              const config = typeConfig[result.type];
              const Icon = config.icon;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                >
                  <div className={cn("rounded p-1.5", config.color)}>
                    <Icon className={ICON_CLASS_NAV} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.name}</p>
                    {result.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-2xs">
                    {config.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showEmptyPanel && (
        <div
          className={dropdownShellClass}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              dropdownScrollClass,
              "p-4 text-center text-sm text-muted-foreground",
            )}
          >
            No results found for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
