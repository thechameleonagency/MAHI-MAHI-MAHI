import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/formatCurrency";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";
import {
  buildQuotationPrefillPatch,
  filterEligibleWizardQuotations,
} from "@/lib/createProjectWizardPrefill";
import type { Customer } from "@/types/finance";
import type { Quotation } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";
import { SearchableEntityList } from "@/components/projects/wizard/SourceStep";

export interface QuotationStepCatalog {
  quotations?: Quotation[];
  customers?: Customer[];
}

export interface QuotationStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: QuotationStepCatalog;
}

export function QuotationStep({ state, onChange, catalog }: QuotationStepProps) {
  const eligibleQuotations = useMemo(
    () => filterEligibleWizardQuotations(catalog?.quotations ?? []),
    [catalog?.quotations],
  );

  const handleQuotationSelect = (quotationId: string) => {
    const quotation = eligibleQuotations.find((q) => q.id === quotationId);
    if (!quotation) return;
    const customer = catalog?.customers?.find((c) => c.id === quotation.customerId);
    onChange(buildQuotationPrefillPatch(quotation, customer));
  };

  return (
    <div className="space-y-2" data-testid="wizard-quotation-step">
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
  );
}

export default QuotationStep;
