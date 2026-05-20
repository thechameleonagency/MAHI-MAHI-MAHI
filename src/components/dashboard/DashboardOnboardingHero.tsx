import { ArrowRight, Building2, ClipboardList, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardOnboardingVariant } from "@/lib/dashboardOnboarding";

type DashboardOnboardingHeroProps = {
  variant: DashboardOnboardingVariant;
  canCreateEnquiry: boolean;
  canAccessEnquiries: boolean;
  canAccessActiveSites: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  className?: string;
};

export function DashboardOnboardingHero({
  variant,
  canCreateEnquiry,
  canAccessEnquiries,
  canAccessActiveSites,
  onPrimaryAction,
  onSecondaryAction,
  className,
}: DashboardOnboardingHeroProps) {
  const isSales = variant === "sales_pipeline";

  const title = isSales ? "Start your sales pipeline" : "No field work queued yet";
  const description = isSales
    ? "Your dashboard is empty because there are no open enquiries, quotations, or active projects. Log a lead first — everything else follows enquiry → quotation → project."
    : "Sites, tasks, blockages, and procurement gaps are all clear. When projects go live, active sites and need-to-get shortfalls will show up here.";

  const steps = isSales
    ? [
        { label: "Enquiry", detail: "Capture the lead and follow-up date" },
        { label: "Quotation", detail: "Send and approve commercial terms" },
        { label: "Project", detail: "Convert and start execution" },
      ]
    : [
        { label: "Projects", detail: "Execution starts after quotation approval" },
        { label: "Active sites", detail: "Track installs and blockages" },
        { label: "Materials", detail: "Procurement when stock falls short" },
      ];

  const primaryLabel = isSales
    ? canCreateEnquiry
      ? "Create your first enquiry"
      : "Open enquiries"
    : canAccessActiveSites
      ? "Open active sites"
      : "Open materials";

  const showPrimary =
    (isSales && canAccessEnquiries) || (!isSales && (canAccessActiveSites || onSecondaryAction));

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
              aria-hidden
            >
              {isSales ? <Sparkles className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
            </span>
            <div className="min-w-0 space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
          {showPrimary && (
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Button type="button" className="rounded-lg" onClick={onPrimaryAction}>
                {primaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
              {isSales && canAccessEnquiries && onSecondaryAction && (
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onSecondaryAction}>
                  Browse enquiries workspace
                </Button>
              )}
            </div>
          )}
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex gap-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-3 text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {index === 0 && isSales ? (
                    <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : index === 2 && isSales ? (
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : null}
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
