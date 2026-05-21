import { Smartphone, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MOBILE_DEMO_WALKTHROUGH,
  MOBILE_POSTURE_MODULES,
  MOBILE_POSTURE_PROTOTYPE_DISCLAIMER,
  MOBILE_POSTURE_SUMMARY,
  modulesForTier,
} from "@/lib/mobileDataEntryPosture";

type Props = {
  /** Compact: walkthrough only (Login). Full: includes module matrix (Settings). */
  variant?: "compact" | "full";
  className?: string;
};

/** MO2 — in-app demo script for mobile vs desktop-first flows. */
export function MobileDemoPostureCard({ variant = "compact", className }: Props) {
  const mobileMods = modulesForTier("mobile_ok");
  const desktopMods = modulesForTier("desktop_first");

  return (
    <Card className={className ?? "border-border/80 bg-muted/20"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Demo: mobile vs desktop data entry (MO2)
        </CardTitle>
        <CardDescription className="text-xs">{MOBILE_POSTURE_SUMMARY}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p className="text-2xs italic">{MOBILE_POSTURE_PROTOTYPE_DISCLAIMER}</p>

        <div className="space-y-3">
          {MOBILE_DEMO_WALKTHROUGH.map((step) => (
            <div
              key={`${step.phase}-${step.order}`}
              className="rounded-md border border-border/80 bg-card/50 p-2.5 space-y-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {step.phase === "mobile" ? (
                  <Badge variant="outline" className="text-2xs gap-1">
                    <Smartphone className="h-3 w-3" />
                    Mobile
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-2xs gap-1">
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </Badge>
                )}
                <span className="font-medium text-foreground text-xs">{step.title}</span>
                <span className="text-2xs">({step.personaRole})</span>
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-foreground/90">
                {step.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
              <p className="text-2xs font-mono text-muted-foreground">{step.routes.join(" · ")}</p>
            </div>
          ))}
        </div>

        {variant === "full" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-medium text-foreground text-xs mb-1.5">Mobile-friendly modules</p>
              <ul className="space-y-1">
                {mobileMods.map((m) => (
                  <li key={m.id}>
                    <span className="text-foreground">{m.label}</span> — {m.mobileNotes}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground text-xs mb-1.5">Desktop-first modules</p>
              <ul className="space-y-1">
                {desktopMods.map((m) => (
                  <li key={m.id}>
                    <span className="text-foreground">{m.label}</span> — {m.desktopNotes ?? m.mobileNotes}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {variant === "full" ? (
          <p className="text-2xs">
            Source: <code className="bg-muted px-1 rounded">src/lib/mobileDataEntryPosture.ts</code> (
            {MOBILE_POSTURE_MODULES.length} modules)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
