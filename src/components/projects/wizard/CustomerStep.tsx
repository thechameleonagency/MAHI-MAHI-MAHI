import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { effectiveLeadPath, isAttachOutsourcedSource, isLeadPathResolved } from "@/lib/createProjectWizardLogic";
import { filterActiveCustomers } from "@/lib/customerListFilters";
import type { Customer, INCGiverCompany, Partner } from "@/types/finance";
import type {
  CreateProjectWizardCustomerMode,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

export interface CustomerStepCatalog {
  customers?: Customer[];
  partners?: Partner[];
  incGiverCompanies?: INCGiverCompany[];
}

export interface CustomerStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: CustomerStepCatalog;
}

function buildSelectableCustomers(
  customers: Customer[],
  selectedCustomerId?: string,
): Customer[] {
  const active = filterActiveCustomers(customers);
  if (selectedCustomerId && !active.some((c) => c.id === selectedCustomerId)) {
    const selected = customers.find((c) => c.id === selectedCustomerId);
    if (selected) return [...active, selected];
  }
  return active;
}

function filterSubcontractorPartners(partners: Partner[]): Partner[] {
  return partners.filter((p) => p.type === "Subcontractor");
}

function CustomerModeToggle({
  mode,
  onChange,
}: {
  mode: CreateProjectWizardCustomerMode;
  onChange: (mode: CreateProjectWizardCustomerMode) => void;
}) {
  return (
    <div className="flex gap-2" data-testid="wizard-customer-mode-toggle">
      {(
        [
          { value: "select" as const, label: "Select existing" },
          { value: "add" as const, label: "Add new customer" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          data-testid={`wizard-customer-mode-${value}`}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            mode === value
              ? "border-primary bg-primary/5 font-medium text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MssDirectCustomerFields({
  state,
  onChange,
  customers,
}: {
  state: CreateProjectWizardState;
  onChange: CustomerStepProps["onChange"];
  customers: Customer[];
}) {
  const mode = state.customerMode ?? "select";

  const handleModeChange = (nextMode: CreateProjectWizardCustomerMode) => {
    if (nextMode === "select") {
      onChange({
        customerMode: "select",
        newCustomerName: undefined,
        newCustomerPhone: undefined,
        newCustomerEmail: undefined,
        newCustomerAddress: undefined,
      });
      return;
    }
    onChange({
      customerMode: "add",
      selectedCustomerId: undefined,
    });
  };

  return (
    <div className="space-y-4">
      <CustomerModeToggle mode={mode} onChange={handleModeChange} />

      {mode === "select" ? (
        <div className="space-y-2">
          <Label htmlFor="wizard-customer-select">Customer</Label>
          <Select
            value={state.selectedCustomerId ?? ""}
            onValueChange={(value) => onChange({ selectedCustomerId: value })}
          >
            <SelectTrigger id="wizard-customer-select" data-testid="wizard-customer-select">
              <SelectValue placeholder="Select customer…" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wizard-new-customer-name">
              Customer name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wizard-new-customer-name"
              placeholder="Full name as on documents"
              value={state.newCustomerName ?? ""}
              onChange={(e) => onChange({ newCustomerName: e.target.value })}
              data-testid="wizard-new-customer-name"
            />
            {state.source === "quotation" && state.selectedQuotationId && state.newCustomerName && (
              <div
                className="mt-1 flex items-center gap-1 text-xs text-warning"
                data-testid="wizard-quotation-name-verify-hint"
              >
                <AlertTriangle className="h-3 w-3" />
                Verify this name matches the approved quotation exactly.
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-new-customer-phone">Phone</Label>
            <Input
              id="wizard-new-customer-phone"
              placeholder="10-digit mobile"
              value={state.newCustomerPhone ?? ""}
              onChange={(e) => onChange({ newCustomerPhone: e.target.value })}
              data-testid="wizard-new-customer-phone"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-new-customer-email">Email</Label>
            <Input
              id="wizard-new-customer-email"
              placeholder="email@example.com"
              value={state.newCustomerEmail ?? ""}
              onChange={(e) => onChange({ newCustomerEmail: e.target.value })}
              data-testid="wizard-new-customer-email"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wizard-new-customer-address">Installation address</Label>
            <Textarea
              id="wizard-new-customer-address"
              placeholder="Full address"
              value={state.newCustomerAddress ?? ""}
              onChange={(e) => onChange({ newCustomerAddress: e.target.value })}
              rows={2}
              data-testid="wizard-new-customer-address"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="wizard-k-number">Electricity bill number (K number)</Label>
        <Input
          id="wizard-k-number"
          placeholder="e.g. KA05E12345"
          value={state.kNumber ?? ""}
          onChange={(e) => onChange({ kNumber: e.target.value })}
          data-testid="wizard-k-number"
        />
        <p className="text-xs text-muted-foreground">
          Customer&apos;s electricity connection number — required for DISCOM submission.
        </p>
      </div>
    </div>
  );
}

export function CustomerStep({ state, onChange, catalog }: CustomerStepProps) {
  const lead = effectiveLeadPath(state);
  const [customerSearch, setCustomerSearch] = useState("");

  const selectableCustomers = useMemo(
    () => buildSelectableCustomers(catalog?.customers ?? [], state.selectedCustomerId),
    [catalog?.customers, state.selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return selectableCustomers;
    return selectableCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email ?? "").toLowerCase().includes(query),
    );
  }, [selectableCustomers, customerSearch]);

  const subcontractors = useMemo(
    () => filterSubcontractorPartners(catalog?.partners ?? []),
    [catalog?.partners],
  );

  if (isAttachOutsourcedSource(state)) {
    if (!isLeadPathResolved(state)) {
      return (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
          data-testid="wizard-customer-step-locked"
        >
          Select an open project on the Source step first.
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in duration-200" data-testid="wizard-customer-step">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subcontractor
        </Label>
        <div className="space-y-2">
          <Label htmlFor="wizard-attach-subcontractor-select">
            Outsource to (subcontractor) <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.selectedSubcontractorId ?? ""}
            onValueChange={(value) => onChange({ selectedSubcontractorId: value })}
          >
            <SelectTrigger id="wizard-attach-subcontractor-select" data-testid="wizard-subcontractor-select">
              <SelectValue placeholder="Select subcontractor partner…" />
            </SelectTrigger>
            <SelectContent>
              {subcontractors.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subcontractors.length === 0 && (
            <p className="text-xs text-muted-foreground">No subcontractor partners are configured yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
        data-testid="wizard-customer-step-locked"
      >
        Complete the deal structure step first to enter customer details.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="wizard-customer-step">
      {lead === "MSS_DIRECT" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Customer
          </Label>
          {selectableCustomers.length > 8 && state.customerMode !== "add" && (
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customers by name, phone, or email…"
              data-testid="wizard-customer-search"
            />
          )}
          <MssDirectCustomerFields
            state={state}
            onChange={onChange}
            customers={filteredCustomers}
          />
        </div>
      )}

      {lead === "PARTNER" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label htmlFor="wizard-partner-customer-name">
            End-customer name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wizard-partner-customer-name"
            placeholder="End-customer name"
            value={state.partnerCustomerName ?? ""}
            onChange={(e) => onChange({ partnerCustomerName: e.target.value })}
            data-testid="wizard-partner-customer-name"
          />
          <p className="text-xs text-muted-foreground">
            The customer the partner is selling to — may differ from the CRM partner record.
          </p>
        </div>
      )}

      {lead === "INC_GIVEN" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            INC work source
          </Label>
          <Select
            value={state.incGiverCompanyId ?? ""}
            onValueChange={(value) => onChange({ incGiverCompanyId: value })}
          >
            <SelectTrigger data-testid="wizard-inc-giver-select">
              <SelectValue placeholder="Select company giving us this work…" />
            </SelectTrigger>
            <SelectContent>
              {(catalog?.incGiverCompanies ?? []).map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The company whose installation job we are doing. We collect from them after completion.
          </p>
        </div>
      )}

      {lead === "OUTSOURCED_INC" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-2">
            <Label htmlFor="wizard-outsourced-customer-select">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={state.selectedCustomerId ?? ""}
              onValueChange={(value) => onChange({ selectedCustomerId: value })}
            >
              <SelectTrigger
                id="wizard-outsourced-customer-select"
                data-testid="wizard-outsourced-customer-select"
              >
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {selectableCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-subcontractor-select">
              Installation subcontractor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={state.selectedSubcontractorId ?? ""}
              onValueChange={(value) => onChange({ selectedSubcontractorId: value })}
            >
              <SelectTrigger id="wizard-subcontractor-select" data-testid="wizard-subcontractor-select">
                <SelectValue placeholder="Select subcontractor partner…" />
              </SelectTrigger>
              <SelectContent>
                {subcontractors.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subcontractors.length === 0 && (
              <p className="text-xs text-muted-foreground">No subcontractor partners are configured yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerStep;
