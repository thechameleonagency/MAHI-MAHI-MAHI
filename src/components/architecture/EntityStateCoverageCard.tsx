import { GitMerge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ENTITY_STATE_COVERAGE_SUMMARY,
  ENTITY_STATE_DIVERGENCE_RULE,
  MACHINE_BACKED_ENTITIES,
  SOFT_STATE_ENTITIES,
  specsForTier,
} from "@/lib/entityStateCoverage";

const TIER_LABELS = {
  machine_backed: "Machine-backed",
  command_guarded: "Command-guarded",
  invariant_gated: "Invariant-gated",
  soft_state: "Soft state",
} as const;

/** AR2 — machine-backed vs soft-state reference for implementers. */
export function EntityStateCoverageCard({ className }: { className?: string }) {
  const commandGuarded = specsForTier("command_guarded");
  const invariantGated = specsForTier("invariant_gated");

  return (
    <Card className={className ?? "border-border/80 bg-muted/20"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          Entity state coverage (AR2)
        </CardTitle>
        <CardDescription className="text-xs">{ENTITY_STATE_COVERAGE_SUMMARY}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p className="text-foreground/90">{ENTITY_STATE_DIVERGENCE_RULE}</p>

        <div>
          <p className="font-medium text-foreground text-xs mb-1.5 flex items-center gap-2">
            <Badge variant="default" className="text-2xs">
              {TIER_LABELS.machine_backed}
            </Badge>
          </p>
          <ul className="space-y-1.5">
            {MACHINE_BACKED_ENTITIES.map((s) => (
              <li key={s.id}>
                <span className="text-foreground font-medium">{s.entity}</span> —{" "}
                <span className="font-mono text-2xs">{s.allowedValues.join(" | ")}</span>
                <span className="block">Guard: {s.guard}</span>
                <span className="block">{s.notes}</span>
              </li>
            ))}
          </ul>
        </div>

        {commandGuarded.length > 0 ? (
          <div>
            <p className="font-medium text-foreground text-xs mb-1.5">
              {TIER_LABELS.command_guarded}
            </p>
            <ul className="space-y-1">
              {commandGuarded.map((s) => (
                <li key={s.id}>
                  <span className="text-foreground">{s.entity}</span> — {s.guard}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {invariantGated.length > 0 ? (
          <div>
            <p className="font-medium text-foreground text-xs mb-1.5">
              {TIER_LABELS.invariant_gated}
            </p>
            <ul className="space-y-1">
              {invariantGated.map((s) => (
                <li key={s.id}>
                  <span className="text-foreground">{s.entity}</span> — {s.guard}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="font-medium text-foreground text-xs mb-1.5 flex items-center gap-2">
            <Badge variant="outline" className="text-2xs">
              {TIER_LABELS.soft_state}
            </Badge>
            <span className="text-muted-foreground font-normal">
              ({SOFT_STATE_ENTITIES.length} entities)
            </span>
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {SOFT_STATE_ENTITIES.map((s) => (
              <li key={s.id}>
                <span className="text-foreground">{s.entity}</span> —{" "}
                <span className="font-mono text-2xs">{s.statusField}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs">
          Source: <code className="bg-muted px-1 rounded">src/lib/entityStateCoverage.ts</code> —
          seed verified via <code className="bg-muted px-1 rounded">findInvalidMachineBackedStatuses</code>
        </p>
      </CardContent>
    </Card>
  );
}
