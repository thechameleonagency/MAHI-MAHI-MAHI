import { GitBranch, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  COMMAND_BUS_MODULES,
  contextOnlySlices,
  DIRECT_APP_STATE_MODULES,
  DUAL_PERSISTENCE_DIVERGENCE_RULE,
  DUAL_PERSISTENCE_SUMMARY,
  mirroredRepositoryKeys,
} from "@/lib/dualPersistenceModel";

/** AR1 — in-app architecture reference for presenters and implementers. */
export function DualPersistenceModelCard({ className }: { className?: string }) {
  return (
    <Card className={className ?? "border-border/80 bg-muted/20"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Dual persistence model (AR1)
        </CardTitle>
        <CardDescription className="text-xs">{DUAL_PERSISTENCE_SUMMARY}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p className="text-foreground/90">{DUAL_PERSISTENCE_DIVERGENCE_RULE}</p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-2xs gap-1">
            <Database className="h-3 w-3" />
            Mirrored: {mirroredRepositoryKeys().join(", ")}
          </Badge>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs mb-1.5">Command bus path</p>
          <ul className="space-y-1.5">
            {COMMAND_BUS_MODULES.map((m) => (
              <li key={m.id}>
                <span className="text-foreground">{m.label}</span>
                {m.commands?.length ? (
                  <span className="font-mono text-2xs block text-muted-foreground">
                    {m.commands.join(" · ")}
                  </span>
                ) : null}
                <span className="block">{m.notes}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs mb-1.5">Direct AppState path (finance / ops)</p>
          <ul className="space-y-1.5">
            {DIRECT_APP_STATE_MODULES.map((m) => (
              <li key={m.id}>
                <span className="text-foreground">{m.label}</span>
                <span className="block">{m.notes}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs">
          Context-only (no repo mirror): {contextOnlySlices().join(", ")}. Source:{" "}
          <code className="bg-muted px-1 rounded">src/lib/dualPersistenceModel.ts</code>, sync:{" "}
          <code className="bg-muted px-1 rounded">appStateRepositorySync.ts</code>
        </p>
      </CardContent>
    </Card>
  );
}
