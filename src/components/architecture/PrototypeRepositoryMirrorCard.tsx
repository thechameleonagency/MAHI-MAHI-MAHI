import { Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PROTOTYPE_MIRROR_DIVERGENCE_RULE,
  PROTOTYPE_MIRROR_SCOPE_SUMMARY,
  SINGLE_WRITER_RULE,
  contextOnlySliceLabels,
  mirroredSliceLabels,
} from "@/lib/prototypeRepositoryMirrorScope";

/** AR3 — mirror scope and single-writer rules for presenters and implementers. */
export function PrototypeRepositoryMirrorCard({ className }: { className?: string }) {
  return (
    <Card className={className ?? "border-border/80 bg-muted/20"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Repository mirror scope (AR3)
        </CardTitle>
        <CardDescription className="text-xs">{PROTOTYPE_MIRROR_SCOPE_SUMMARY}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p className="text-foreground/90">{SINGLE_WRITER_RULE}</p>
        <p>{PROTOTYPE_MIRROR_DIVERGENCE_RULE}</p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-2xs">
            Mirrored ({mirroredSliceLabels().length}): {mirroredSliceLabels().join(", ")}
          </Badge>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs mb-1">Context-only (no mss.repo mirror)</p>
          <p className="font-mono text-2xs leading-relaxed">{contextOnlySliceLabels().join(", ")}</p>
        </div>

        <p className="text-2xs">
          Drift check: <code className="bg-muted px-1 rounded">findPrototypeMirrorDrift</code> in{" "}
          <code className="bg-muted px-1 rounded">src/lib/prototypeRepositoryMirrorScope.ts</code> — seed
          verified after <code className="bg-muted px-1 rounded">syncPrototypeRepositoriesFromAppState</code>
        </p>
      </CardContent>
    </Card>
  );
}
