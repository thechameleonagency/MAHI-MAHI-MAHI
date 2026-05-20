import { useMasters } from "@/contexts/MastersContext";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle } from "lucide-react";
import type { MasterItem } from "@/data/masters";

type MappingKind = "expense" | "income";

interface MappingPostingChipProps {
  /** "expense" or "income" — selects which mapping master to look up. */
  kind: MappingKind;
  /** Composite key `main:sub` matching the mapping master's `value` field. e.g. "site:transport". */
  mappingKey: string;
  className?: string;
}

const PL_LINE_LABEL: Record<NonNullable<MasterItem["plLine"]>, string> = {
  revenue: "Revenue",
  direct: "Direct (COGS)",
  indirect: "Indirect (Operating)",
  "finance-cost": "Finance Cost",
  tax: "Tax",
  "non-pl-capital": "Not in P&L — Capital",
  "non-pl-drawings": "Not in P&L — Drawings",
  "non-pl-liability": "Not in P&L — Liability",
  "non-pl-asset": "Not in P&L — Asset",
};

const GST_LABEL: Record<NonNullable<MasterItem["gstTreatment"]>, string> = {
  "itc-eligible": "ITC eligible",
  "itc-blocked": "ITC blocked",
  rcm: "Reverse Charge",
  "no-gst": "No GST",
};

/**
 * Read-only chip that shows where a chosen expense/income category will post:
 * the target Chart-of-Accounts leaf, the P&L line, and the GST treatment.
 *
 * Drives transparency in the expense/income forms — the user sees their accounting impact
 * before they save. Skill `expense-income-category-routing-audit` (#40) confirms every
 * (main, sub) combination resolves through this chip.
 */
export function MappingPostingChip({ kind, mappingKey, className }: MappingPostingChipProps) {
  const masters = useMasters();
  const mappings =
    kind === "expense"
      ? masters.getExpenseToAccountMapping()
      : masters.getIncomeToAccountMapping();
  const leaves = masters.getChartOfAccountLeaves();

  if (!mappingKey) return null;

  const mapping = mappings.find((m) => m.value === mappingKey);
  if (!mapping) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs ${className ?? ""}`}>
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
        <span className="text-warning">
          No accounting mapping defined for <span className="font-mono">{mappingKey}</span>. Will save without a Chart-of-Accounts post.
        </span>
      </div>
    );
  }

  const coaLeaf = mapping.coaLeaf ? leaves.find((l) => l.value === mapping.coaLeaf) : undefined;
  const coaLeafLabel = coaLeaf?.label ?? mapping.coaLeaf ?? "—";
  const plLabel = mapping.plLine ? PL_LINE_LABEL[mapping.plLine] : "—";
  const gstLabel = mapping.gstTreatment ? GST_LABEL[mapping.gstTreatment] : "—";

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs ${className ?? ""}`}>
      <span className="text-muted-foreground">Will post to</span>
      <Badge variant="outline" className="font-medium">{coaLeafLabel}</Badge>
      <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
      <Badge variant="outline">{plLabel}</Badge>
      <span className="text-muted-foreground">·</span>
      <Badge variant="outline">{gstLabel}</Badge>
      {mapping.requiresInterestPrincipalSplit && (
        <Badge variant="outline" className="border-warning/30 text-warning">Splits Interest / Principal</Badge>
      )}
    </div>
  );
}
