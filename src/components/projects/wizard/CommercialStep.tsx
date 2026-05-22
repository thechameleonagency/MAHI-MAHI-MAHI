import { useMemo } from "react";
import { IndianRupee, Zap } from "lucide-react";
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
import { formatINR } from "@/lib/formatCurrency";
import {
  computeIncGivenTotal,
  computeOutsourceAttachTotal,
  effectiveLeadPath,
  effectivePartnerType,
  isAttachOutsourcedSource,
  isLeadPathResolved,
} from "@/lib/createProjectWizardLogic";
import type { Loan } from "@/types/finance";
import type { Project } from "@/types/project";
import type {
  CreateProjectWizardPaymentType,
  CreateProjectWizardProjectType,
  CreateProjectWizardRateBasis,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

export interface CommercialStepCatalog {
  loans?: Loan[];
  projects?: Project[];
}

export interface CommercialStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: CommercialStepCatalog;
}

const PROJECT_TYPE_OPTIONS: CreateProjectWizardProjectType[] = [
  "Residential",
  "Commercial",
  "Industrial",
];

const PAYMENT_TYPE_OPTIONS: Array<{ value: CreateProjectWizardPaymentType; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "loan", label: "Loan" },
  { value: "cash-and-loan", label: "Cash + Loan" },
];

const RATE_BASIS_OPTIONS: Array<{ value: CreateProjectWizardRateBasis; label: string }> = [
  { value: "per_kw", label: "Per kW" },
  { value: "per_sqft", label: "Per sq ft" },
  { value: "fixed", label: "Fixed total" },
];

function parseNumberInput(value: string): number | undefined {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberInputValue(value: number | undefined): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

function DirectCommercialFields({
  state,
  onChange,
  loans,
  showIncScope,
}: {
  state: CreateProjectWizardState;
  onChange: CommercialStepProps["onChange"];
  loans: Loan[];
  showIncScope: boolean;
}) {
  const paymentType = state.paymentType ?? "cash";
  const needsLoan = paymentType === "loan" || paymentType === "cash-and-loan";
  const activeLoans = loans.filter((loan) => loan.status === "Active");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-project-name">
            Project name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wizard-project-name"
            placeholder="e.g. Sharma Residency 5kW"
            value={state.projectName ?? ""}
            onChange={(e) => onChange({ projectName: e.target.value })}
            data-testid="wizard-project-name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-project-type">Project type</Label>
          <Select
            value={state.projectType ?? "Residential"}
            onValueChange={(value) =>
              onChange({ projectType: value as CreateProjectWizardProjectType })
            }
          >
            <SelectTrigger id="wizard-project-type" data-testid="wizard-project-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-capacity">
            Capacity (kW) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="wizard-capacity"
              placeholder="e.g. 5"
              value={state.capacity ?? ""}
              onChange={(e) => onChange({ capacity: e.target.value })}
              className="pr-10"
              data-testid="wizard-capacity"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              kW
            </span>
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-contract-amount">
            Contract amount (₹) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wizard-contract-amount"
              type="number"
              min={0}
              placeholder="Total project value"
              value={numberInputValue(state.contractAmount)}
              onChange={(e) => onChange({ contractAmount: parseNumberInput(e.target.value) })}
              className="pl-9"
              data-testid="wizard-contract-amount"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-internal-cost">Internal cost estimate (₹)</Label>
          <Input
            id="wizard-internal-cost"
            type="number"
            min={0}
            placeholder="Optional"
            value={numberInputValue(state.internalCostEstimate)}
            onChange={(e) => onChange({ internalCostEstimate: parseNumberInput(e.target.value) })}
            data-testid="wizard-internal-cost"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-payment-type">Payment type</Label>
          <Select
            value={paymentType}
            onValueChange={(value) => {
              const next = value as CreateProjectWizardPaymentType;
              onChange({
                paymentType: next,
                fundingLoanId: next === "cash" ? undefined : state.fundingLoanId,
              });
            }}
          >
            <SelectTrigger id="wizard-payment-type" data-testid="wizard-payment-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TYPE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsLoan && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wizard-funding-loan">
              Funding loan <span className="text-destructive">*</span>
            </Label>
            <Select
              value={state.fundingLoanId ?? ""}
              onValueChange={(value) => onChange({ fundingLoanId: value })}
            >
              <SelectTrigger id="wizard-funding-loan" data-testid="wizard-funding-loan">
                <SelectValue placeholder="Select loan…" />
              </SelectTrigger>
              <SelectContent>
                {activeLoans.map((loan) => (
                  <SelectItem key={loan.id} value={loan.id}>
                    {loan.source} — {loan.personName || "—"} ({formatINR(loan.outstanding ?? 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showIncScope && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wizard-inc-scope">INC scope</Label>
            <Select
              value={state.incScope ?? "labour"}
              onValueChange={(value) =>
                onChange({ incScope: value as CreateProjectWizardState["incScope"] })
              }
            >
              <SelectTrigger id="wizard-inc-scope" data-testid="wizard-inc-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labour">Labour only</SelectItem>
                <SelectItem value="labour_and_materials">Labour + materials</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerCommercialFields({
  state,
  onChange,
  partnerType,
}: {
  state: CreateProjectWizardState;
  onChange: CommercialStepProps["onChange"];
  partnerType: ReturnType<typeof effectivePartnerType>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-partner-project-name">
            Project name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wizard-partner-project-name"
            placeholder="Auto-generated if blank"
            value={state.partnerProjectName ?? state.projectName ?? ""}
            onChange={(e) => onChange({ partnerProjectName: e.target.value })}
            data-testid="wizard-partner-project-name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-partner-project-type">Project type</Label>
          <Select
            value={state.partnerProjectType ?? "Residential"}
            onValueChange={(value) =>
              onChange({ partnerProjectType: value as CreateProjectWizardProjectType })
            }
          >
            <SelectTrigger id="wizard-partner-project-type" data-testid="wizard-partner-project-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-partner-capacity">
            Capacity (kW) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="wizard-partner-capacity"
              placeholder="e.g. 5"
              value={state.partnerCapacity ?? state.capacity ?? ""}
              onChange={(e) => onChange({ partnerCapacity: e.target.value })}
              className="pr-10"
              data-testid="wizard-partner-capacity"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
              kW
            </span>
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-partner-contract-amount">
            Total contract value (₹) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wizard-partner-contract-amount"
              type="number"
              min={0}
              placeholder="What the customer pays"
              value={numberInputValue(state.partnerContractAmount ?? state.contractAmount)}
              onChange={(e) =>
                onChange({ partnerContractAmount: parseNumberInput(e.target.value) })
              }
              className="pl-9"
              data-testid="wizard-partner-contract-amount"
            />
          </div>
        </div>
      </div>

      {(partnerType === "profit_share" || partnerType === "fixed_rate") && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Partner economics
          </Label>
          {partnerType === "profit_share" && (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-profit-share">
                Partner profit share (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-profit-share"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 30"
                value={numberInputValue(state.profitSharePercent)}
                onChange={(e) => onChange({ profitSharePercent: parseNumberInput(e.target.value) })}
                data-testid="wizard-profit-share"
              />
            </div>
          )}
          {partnerType === "fixed_rate" && (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-fixed-rate">
                MSS backend rate (₹/kW) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-fixed-rate"
                type="number"
                min={0}
                placeholder="e.g. 65000"
                value={numberInputValue(state.fixedRatePerKw)}
                onChange={(e) => onChange({ fixedRatePerKw: parseNumberInput(e.target.value) })}
                data-testid="wizard-fixed-rate"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IncGivenCommercialFields({
  state,
  onChange,
}: {
  state: CreateProjectWizardState;
  onChange: CommercialStepProps["onChange"];
}) {
  const rateBasis = state.rateBasis ?? "per_kw";
  const incTotal = useMemo(() => computeIncGivenTotal(state), [state]);

  const handleRateBasisChange = (nextBasis: CreateProjectWizardRateBasis) => {
    onChange({ rateBasis: nextBasis });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rate basis
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {RATE_BASIS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRateBasisChange(value)}
              data-testid={`wizard-rate-basis-${value}`}
              className={cn(
                "rounded-xl border-2 p-3 text-center text-sm transition-all",
                rateBasis === value
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rateBasis !== "fixed" && (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-rate-value">
                {rateBasis === "per_kw" ? "Rate (₹/kW)" : "Rate (₹/sq ft)"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-rate-value"
                type="number"
                min={0}
                placeholder="e.g. 8000"
                value={numberInputValue(state.rateValue)}
                onChange={(e) => onChange({ rateValue: parseNumberInput(e.target.value) })}
                data-testid="wizard-rate-value"
              />
            </div>
          )}

          {rateBasis === "per_kw" && (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-inc-capacity">
                Capacity (kW) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-inc-capacity"
                type="number"
                min={0}
                placeholder="e.g. 10"
                value={state.incCapacity ?? ""}
                onChange={(e) => onChange({ incCapacity: e.target.value })}
                data-testid="wizard-inc-capacity"
              />
            </div>
          )}

          {rateBasis === "per_sqft" && (
            <div className="space-y-1.5">
              <Label htmlFor="wizard-inc-area">
                Area (sq ft) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-inc-area"
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={state.incArea ?? ""}
                onChange={(e) => onChange({ incArea: e.target.value })}
                data-testid="wizard-inc-area"
              />
            </div>
          )}

          {rateBasis === "fixed" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="wizard-inc-fixed-amount">
                Fixed amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-inc-fixed-amount"
                type="number"
                min={0}
                placeholder="Total agreed amount"
                value={numberInputValue(state.incFixedAmount ?? state.rateValue)}
                onChange={(e) => {
                  const amount = parseNumberInput(e.target.value);
                  onChange({ incFixedAmount: amount, rateValue: amount });
                }}
                data-testid="wizard-inc-fixed-amount"
              />
            </div>
          )}
        </div>

        {incTotal > 0 && (
          <div
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm"
            data-testid="wizard-inc-total"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium">Total to collect: {formatINR(incTotal)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-inc-project-name">Project name / reference</Label>
          <Input
            id="wizard-inc-project-name"
            placeholder="Auto-generated if blank"
            value={state.incProjectName ?? ""}
            onChange={(e) => onChange({ incProjectName: e.target.value })}
            data-testid="wizard-inc-project-name"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wizard-inc-address">Site address</Label>
          <Input
            id="wizard-inc-address"
            placeholder="Installation site address"
            value={state.incAddress ?? ""}
            onChange={(e) => onChange({ incAddress: e.target.value })}
            data-testid="wizard-inc-address"
          />
        </div>
      </div>
    </div>
  );
}

function AttachOutsourceCommercialFields({
  state,
  onChange,
  targetCapacity,
}: {
  state: CreateProjectWizardState;
  onChange: CommercialStepProps["onChange"];
  targetCapacity?: string;
}) {
  const basis = state.outsourceRateBasis ?? "fixed";
  const total = computeOutsourceAttachTotal(state, targetCapacity);

  return (
    <div className="space-y-4" data-testid="wizard-attach-outsource-commercial">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Outsource terms
        </Label>
        <div className="flex flex-wrap gap-2">
          {RATE_BASIS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ outsourceRateBasis: value })}
              data-testid={`wizard-outsource-rate-basis-${value}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs transition-colors",
                basis === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-outsource-rate-value">
            {basis === "fixed" ? "Total amount (₹)" : basis === "per_kw" ? "Rate per kW (₹)" : "Rate per sq ft (₹)"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wizard-outsource-rate-value"
            type="number"
            min={0}
            value={numberInputValue(state.outsourceRateValue)}
            onChange={(e) => onChange({ outsourceRateValue: parseNumberInput(e.target.value) })}
            data-testid="wizard-outsource-rate-value"
          />
        </div>
        {basis !== "fixed" && (
          <div className="space-y-1.5">
            <Label htmlFor="wizard-outsource-quantity">
              Quantity ({basis === "per_kw" ? "kW" : "sq ft"}) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wizard-outsource-quantity"
              type="number"
              min={0}
              placeholder={basis === "per_kw" ? targetCapacity?.replace(/[^\d.]/g, "") || "0" : "0"}
              value={numberInputValue(state.outsourceQuantity)}
              onChange={(e) => onChange({ outsourceQuantity: parseNumberInput(e.target.value) })}
              data-testid="wizard-outsource-quantity"
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wizard-outsource-notes">Notes (optional)</Label>
        <Textarea
          id="wizard-outsource-notes"
          rows={2}
          placeholder="Scope, deadline, payment terms…"
          value={state.outsourceNotes ?? ""}
          onChange={(e) => onChange({ outsourceNotes: e.target.value })}
          data-testid="wizard-outsource-notes"
        />
      </div>

      {total > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm"
          data-testid="wizard-outsource-total"
        >
          <IndianRupee className="h-4 w-4 text-primary" />
          <span className="font-medium">Outsource total: {formatINR(total)}</span>
        </div>
      )}
    </div>
  );
}

export function CommercialStep({ state, onChange, catalog }: CommercialStepProps) {
  const lead = effectiveLeadPath(state);
  const partnerType = effectivePartnerType(state);

  if (isAttachOutsourcedSource(state)) {
    if (!isLeadPathResolved(state)) {
      return (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
          data-testid="wizard-commercial-step-locked"
        >
          Select a project and subcontractor before entering outsource terms.
        </div>
      );
    }

    return (
      <div className="space-y-4" data-testid="wizard-commercial-step">
        <AttachOutsourceCommercialFields
          state={state}
          onChange={onChange}
          targetCapacity={catalog?.projects?.find((p) => p.id === state.attachToProjectId)?.capacity}
        />
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
        data-testid="wizard-commercial-step-locked"
      >
        Complete earlier steps to enter commercial terms.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="wizard-commercial-step">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Commercial terms
      </Label>

      {(lead === "MSS_DIRECT" || lead === "OUTSOURCED_INC") && (
        <DirectCommercialFields
          state={state}
          onChange={onChange}
          loans={catalog?.loans ?? []}
          showIncScope={lead === "OUTSOURCED_INC"}
        />
      )}

      {lead === "PARTNER" && (
        <PartnerCommercialFields state={state} onChange={onChange} partnerType={partnerType} />
      )}

      {lead === "INC_GIVEN" && (
        <IncGivenCommercialFields state={state} onChange={onChange} />
      )}
    </div>
  );
}

export default CommercialStep;
