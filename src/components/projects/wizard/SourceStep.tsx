import { useMemo, useState } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/formatCurrency";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";
import { PROJECT_KINDS, type ProjectKind } from "@/domain/projectTypes/types";
import { PROJECT_KIND_UI_LABELS } from "@/lib/projectTaxonomyDisplay";
import {
  buildQuotationPrefillPatch,
  buildSourceSelectionResetPatch,
  filterEligibleWizardQuotations,
  filterOpenWizardProjects,
} from "@/lib/createProjectWizardPrefill";
import type { Customer } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";
import type {
  CreateProjectWizardSource,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

export interface SourceStepCatalog {
  quotations?: Quotation[];
  projects?: Project[];
  customers?: Customer[];
  canDirectException?: boolean;
}

export interface SourceStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: SourceStepCatalog;
}

const SOURCE_OPTIONS: Array<{
  value: CreateProjectWizardSource;
  title: string;
  description: string;
  requiresDirectExceptionPermission?: boolean;
}> = [
  {
    value: "new",
    title: "New project",
    description: "Standard intake — choose deal structure in the next step.",
  },
  {
    value: "quotation",
    title: "From approved quotation",
    description: "Convert an approved quote that is not yet linked to a project.",
  },
  {
    value: "direct_exception",
    title: "Direct exception",
    description: "Create without a quotation when policy allows (audited).",
    requiresDirectExceptionPermission: true,
  },
  {
    value: "attach_outsourced",
    title: "Attach outsourced INC",
    description: "Record subcontract scope on an existing open project.",
  },
];

function SearchableEntityList<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  searchPlaceholder,
  emptyMessage,
  filterItem,
  renderPrimary,
  renderSecondary,
  testId,
}: {
  items: T[];
  selectedId?: string;
  onSelect: (id: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  filterItem: (item: T, query: string) => boolean;
  renderPrimary: (item: T) => string;
  renderSecondary: (item: T) => string;
  testId: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => filterItem(item, q));
  }, [items, query, filterItem]);

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          data-testid={`${testId}-search`}
        />
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border bg-muted/30 p-3 custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((item) => {
            const selected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                data-testid={`${testId}-item-${item.id}`}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{renderPrimary(item)}</p>
                  <p className="truncate text-xs text-muted-foreground">{renderSecondary(item)}</p>
                </div>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SourceStep({ state, onChange, catalog }: SourceStepProps) {
  const eligibleQuotations = useMemo(
    () => filterEligibleWizardQuotations(catalog?.quotations ?? []),
    [catalog?.quotations],
  );
  const openProjects = useMemo(
    () => filterOpenWizardProjects(catalog?.projects ?? []),
    [catalog?.projects],
  );

  const visibleSourceOptions = SOURCE_OPTIONS.filter(
    (option) => !option.requiresDirectExceptionPermission || catalog?.canDirectException !== false,
  );

  const handleSourceChange = (source: CreateProjectWizardSource) => {
    onChange(buildSourceSelectionResetPatch(source));
  };

  const handleQuotationSelect = (quotationId: string) => {
    const quotation = eligibleQuotations.find((q) => q.id === quotationId);
    if (!quotation) return;
    const customer = catalog?.customers?.find((c) => c.id === quotation.customerId);
    onChange(buildQuotationPrefillPatch(quotation, customer));
  };

  const attachTarget = openProjects.find((p) => p.id === state.attachToProjectId);

  return (
    <div className="space-y-6" data-testid="wizard-source-step">
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How is this project entering the system?
        </Label>
        <RadioGroup
          value={state.source}
          onValueChange={(value) => handleSourceChange(value as CreateProjectWizardSource)}
          className="grid gap-3 sm:grid-cols-2"
          data-testid="wizard-source-radio"
        >
          {visibleSourceOptions.map((option) => (
            <label
              key={option.value}
              htmlFor={`wizard-source-${option.value}`}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                state.source === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={`wizard-source-${option.value}`}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{option.title}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {state.source === "quotation" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Approved quotation
          </Label>
          <SearchableEntityList
            items={eligibleQuotations}
            selectedId={state.selectedQuotationId}
            onSelect={handleQuotationSelect}
            searchPlaceholder="Search by client, number, or capacity…"
            emptyMessage="No approved quotations available for conversion."
            testId="wizard-quotation-picker"
            filterItem={(q, query) =>
              [q.clientName, q.quotationNumber, q.systemCapacity, q.id]
                .filter(Boolean)
                .some((part) => String(part).toLowerCase().includes(query))
            }
            renderPrimary={(q) => q.clientName}
            renderSecondary={(q) =>
              `${q.quotationNumber} · ${q.systemCapacity}kW · ${formatINR(resolveContractAmount(q))}`
            }
          />
          {state.selectedQuotationId && (
            <p className="text-xs font-medium text-success">
              Quotation selected — commercial and customer fields pre-filled. You can edit them in later steps.
            </p>
          )}
        </div>
      )}

      {state.source === "direct_exception" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="space-y-2">
            <Label htmlFor="wizard-direct-exception-reason">Reason (audit trail)</Label>
            <Textarea
              id="wizard-direct-exception-reason"
              value={state.directExceptionReason ?? ""}
              onChange={(e) => onChange({ directExceptionReason: e.target.value })}
              rows={3}
              placeholder="Why is this project being created without a quotation?"
              data-testid="wizard-direct-exception-reason"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-direct-exception-kind">Deal kind</Label>
            <Select
              value={state.directExceptionProjectKind ?? ""}
              onValueChange={(value) =>
                onChange({ directExceptionProjectKind: value as ProjectKind })
              }
            >
              <SelectTrigger id="wizard-direct-exception-kind" data-testid="wizard-direct-exception-kind">
                <SelectValue placeholder="Select project kind…" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {PROJECT_KIND_UI_LABELS[kind]} ({kind.replace(/_/g, " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {state.source === "attach_outsourced" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Open project to attach
          </Label>
          <SearchableEntityList
            items={openProjects}
            selectedId={state.attachToProjectId}
            onSelect={(projectId) => onChange({ attachToProjectId: projectId })}
            searchPlaceholder="Search by project id, name, or client…"
            emptyMessage="No open projects available."
            testId="wizard-project-picker"
            filterItem={(p, query) =>
              [p.id, p.name, p.client, p.capacity]
                .filter(Boolean)
                .some((part) => String(part).toLowerCase().includes(query))
            }
            renderPrimary={(p) => `${p.id} — ${p.name}`}
            renderSecondary={(p) =>
              `${p.client} · ${p.capacity || "no capacity"} · ${formatINR(p.contractAmount || 0)}`
            }
          />
          {attachTarget && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
              <div>
                <span className="block text-muted-foreground">Client</span>
                <span className="font-medium">{attachTarget.client}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Capacity</span>
                <span className="font-medium">{attachTarget.capacity || "—"}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Location</span>
                <span className="font-medium">{attachTarget.location || "—"}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Contract</span>
                <span className="font-medium">{formatINR(attachTarget.contractAmount || 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SourceStep;
