import { Building2, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { effectiveLeadPath, isVendorshipStepApplicable } from "@/lib/createProjectWizardLogic";
import type { VendorshipCompany } from "@/types/finance";
import type {
  CreateProjectWizardBillingParty,
  CreateProjectWizardState,
  CreateProjectWizardVendorshipChoice,
} from "@/types/createProjectWizard";

export interface VendorshipStepCatalog {
  vendorshipCompanies?: VendorshipCompany[];
}

export interface VendorshipStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: VendorshipStepCatalog;
}

function parseNumberInput(value: string): number | undefined {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberInputValue(value: number | undefined): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

function VendorshipChoiceCards({
  value,
  onChange,
  options,
  testIdPrefix,
}: {
  value: CreateProjectWizardVendorshipChoice;
  onChange: (choice: CreateProjectWizardVendorshipChoice) => void;
  options: Array<{
    key: CreateProjectWizardVendorshipChoice;
    icon: typeof ShieldCheck;
    title: string;
    sub: string;
  }>;
  testIdPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map(({ key, icon: Icon, title, sub }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          data-testid={`${testIdPrefix}-${key}`}
          className={cn(
            "rounded-xl border-2 p-3 text-left transition-all",
            value === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <Icon className={cn("h-4 w-4", value === key ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </button>
      ))}
    </div>
  );
}

function DirectVendorshipFields({
  state,
  onChange,
  companies,
}: {
  state: CreateProjectWizardState;
  onChange: VendorshipStepProps["onChange"];
  companies: VendorshipCompany[];
}) {
  const choice = state.vendorshipChoice ?? "OUR_CODE";

  const handleChoiceChange = (next: CreateProjectWizardVendorshipChoice) => {
    if (next === "OUR_CODE") {
      onChange({
        vendorshipChoice: next,
        vendorshipCompanyId: undefined,
        vendorshipFeeAmount: undefined,
      });
      return;
    }
    onChange({ vendorshipChoice: next });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        DISCOM vendorship code
      </Label>
      <VendorshipChoiceCards
        value={choice}
        onChange={handleChoiceChange}
        testIdPrefix="wizard-vendorship-choice"
        options={[
          {
            key: "OUR_CODE",
            icon: ShieldCheck,
            title: "Use our own code",
            sub: "MSS registration. Document Creator available.",
          },
          {
            key: "THIRD_PARTY",
            icon: Building2,
            title: "Use third-party code",
            sub: "A vendorship company's registration. We pay a fee.",
          },
        ]}
      />

      {choice === "THIRD_PARTY" && (
        <div className="animate-in fade-in space-y-3 rounded-xl border border-warning/20 bg-warning/5 p-4 duration-200">
          <div className="space-y-1.5">
            <Label htmlFor="wizard-vendorship-company">
              Vendorship code company <span className="text-destructive">*</span>
            </Label>
            <Select
              value={state.vendorshipCompanyId ?? ""}
              onValueChange={(value) => onChange({ vendorshipCompanyId: value })}
            >
              <SelectTrigger id="wizard-vendorship-company" data-testid="wizard-vendorship-company">
                <SelectValue placeholder="Choose company…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-vendorship-fee">
              Fee for this project (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wizard-vendorship-fee"
              type="number"
              min={0}
              placeholder="e.g. 25000"
              value={numberInputValue(state.vendorshipFeeAmount)}
              onChange={(e) => onChange({ vendorshipFeeAmount: parseNumberInput(e.target.value) })}
              data-testid="wizard-vendorship-fee"
            />
            <p className="text-xs text-muted-foreground">
              Auto-recorded as a project expense under &quot;Vendorship Code Fee&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PartnerVendorshipFields({
  state,
  onChange,
  companies,
}: {
  state: CreateProjectWizardState;
  onChange: VendorshipStepProps["onChange"];
  companies: VendorshipCompany[];
}) {
  const vendorshipChoice = state.partnerVendorshipChoice ?? "OUR_CODE";
  const billingParty = state.billingParty ?? "MSS";
  const partnerGstInvoice = state.partnerGstInvoice ?? "yes";

  const handleVendorshipChoiceChange = (next: CreateProjectWizardVendorshipChoice) => {
    if (next === "OUR_CODE") {
      onChange({
        partnerVendorshipChoice: next,
        partnerThirdPartyCompanyId: undefined,
      });
      return;
    }
    onChange({ partnerVendorshipChoice: next });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Billing & invoice
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { key: "MSS" as CreateProjectWizardBillingParty, title: "MSS bills customer", sub: "We raise the invoice to the customer" },
              { key: "PARTNER" as CreateProjectWizardBillingParty, title: "Partner bills customer", sub: "Partner raises invoice to customer" },
            ] as const
          ).map(({ key, title, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ billingParty: key })}
              data-testid={`wizard-billing-party-${key}`}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-all",
                billingParty === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Does the partner give us a GST invoice for their profit share?</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "yes" as const, label: "Yes — they invoice us" },
                { key: "no" as const, label: "No — deduct 9% offset" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ partnerGstInvoice: key })}
                data-testid={`wizard-partner-gst-${key}`}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm transition-colors",
                  partnerGstInvoice === key
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-border",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {partnerGstInvoice === "no" && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              9% will be deducted from the partner&apos;s share as GST offset before payment.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          DISCOM vendorship code
        </Label>
        <VendorshipChoiceCards
          value={vendorshipChoice}
          onChange={handleVendorshipChoiceChange}
          testIdPrefix="wizard-partner-vendorship-choice"
          options={[
            {
              key: "OUR_CODE",
              icon: ShieldCheck,
              title: "Use our own code",
              sub: "We charge the partner a usage fee.",
            },
            {
              key: "THIRD_PARTY",
              icon: Building2,
              title: "Use third-party code",
              sub: "Partner bears this cost from their share.",
            },
          ]}
        />

        {vendorshipChoice === "OUR_CODE" && (
          <div className="space-y-1.5">
            <Label htmlFor="wizard-partner-vendorship-fee">Vendorship usage fee charged to partner (₹)</Label>
            <Input
              id="wizard-partner-vendorship-fee"
              type="number"
              min={0}
              placeholder="e.g. 15000"
              value={numberInputValue(state.partnerVendorshipFeeAmount)}
              onChange={(e) =>
                onChange({ partnerVendorshipFeeAmount: parseNumberInput(e.target.value) })
              }
              data-testid="wizard-partner-vendorship-fee"
            />
            <p className="text-xs text-muted-foreground">Tracked as receivable from the partner.</p>
          </div>
        )}

        {vendorshipChoice === "THIRD_PARTY" && (
          <div className="animate-in fade-in space-y-3 rounded-xl border border-warning/20 bg-warning/5 p-4 duration-200">
            <div className="space-y-1.5">
              <Label htmlFor="wizard-partner-third-party-company">
                Vendorship code company <span className="text-destructive">*</span>
              </Label>
              <Select
                value={state.partnerThirdPartyCompanyId ?? ""}
                onValueChange={(value) => onChange({ partnerThirdPartyCompanyId: value })}
              >
                <SelectTrigger
                  id="wizard-partner-third-party-company"
                  data-testid="wizard-partner-third-party-company"
                >
                  <SelectValue placeholder="Choose company…" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wizard-partner-third-party-fee">
                Fee amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-partner-third-party-fee"
                type="number"
                min={0}
                placeholder="e.g. 25000"
                value={numberInputValue(state.partnerVendorshipFeeAmount)}
                onChange={(e) =>
                  onChange({ partnerVendorshipFeeAmount: parseNumberInput(e.target.value) })
                }
                data-testid="wizard-partner-third-party-fee"
              />
              <p className="text-xs text-muted-foreground">Deducted from the partner&apos;s share.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VendorshipStep({ state, onChange, catalog }: VendorshipStepProps) {
  const lead = effectiveLeadPath(state);
  const applicable = isVendorshipStepApplicable(state);
  const companies = catalog?.vendorshipCompanies ?? [];

  if (!applicable) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
        data-testid="wizard-vendorship-step-skipped"
      >
        Vendorship & GST does not apply to this project kind — continue to the next step.
      </div>
    );
  }

  const showDirectVendorship = lead === "MSS_DIRECT" || state.source === "quotation";

  return (
    <div className="space-y-6" data-testid="wizard-vendorship-step">
      {showDirectVendorship && (
        <DirectVendorshipFields state={state} onChange={onChange} companies={companies} />
      )}

      {lead === "PARTNER" && (
        <PartnerVendorshipFields state={state} onChange={onChange} companies={companies} />
      )}
    </div>
  );
}

export default VendorshipStep;
