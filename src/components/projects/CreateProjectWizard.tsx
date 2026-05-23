import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/formatCurrency";
import {
  buildWizardReviewSummary,
  getVisibleWizardSteps,
  isQuotationPrefillComplete,
  isStepVisible,
  validateVisibleWizardSteps,
  validateWizardStep,
  type ValidateWizardContext,
} from "@/lib/createProjectWizardLogic";
import { getInitialWizardStep, getWizardFlowSubtitle, getWizardStepLabel } from "@/lib/wizardFlow";
import { PROJECT_KIND_UI_LABELS, PROJECT_KIND_UI_TONES } from "@/lib/projectTaxonomyDisplay";
import { WizardStepContent } from "@/components/projects/wizard/WizardStepContent";
import {
  createInitialCreateProjectWizardState,
  type CreateProjectWizardState,
  type WizardStep,
} from "@/types/createProjectWizard";
import type { Agent, Customer, INCGiverCompany, Loan, Partner, VendorshipCompany } from "@/types/finance";
import type { Employee, Project, Quotation } from "@/types/project";

export interface CreateProjectWizardCatalog {
  customers?: Array<{ id: string; name: string } | Customer>;
  incGiverCompanies?: INCGiverCompany[];
  quotations?: Quotation[];
  projects?: Project[];
  partners?: Partner[];
  loans?: Loan[];
  vendorshipCompanies?: VendorshipCompany[];
  agents?: Agent[];
  employees?: Employee[];
  canDirectException?: boolean;
}

export interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialState?: Partial<CreateProjectWizardState>;
  catalog?: CreateProjectWizardCatalog;
  onCreate?: (state: CreateProjectWizardState) => void | Promise<void>;
  isSubmitting?: boolean;
  renderStepContent?: (
    step: WizardStep,
    state: CreateProjectWizardState,
    updateState: (patch: Partial<CreateProjectWizardState>) => void,
  ) => ReactNode;
}

function resolveInitialStep(initial?: Partial<CreateProjectWizardState>): WizardStep {
  const state = createInitialCreateProjectWizardState(initial);
  if (isQuotationPrefillComplete(state)) {
    return "REVIEW";
  }
  return getInitialWizardStep(state.flow ?? "intake");
}

function WizardStepIndicator({
  state,
  currentStep,
  onSelectStep,
}: {
  state: CreateProjectWizardState;
  currentStep: WizardStep;
  onSelectStep: (step: WizardStep) => void;
}) {
  const visibleSteps = getVisibleWizardSteps(state);
  const currentIndex = visibleSteps.indexOf(currentStep);

  return (
    <>
      <nav className="hidden md:flex flex-col gap-1" aria-label="Wizard steps">
        {visibleSteps.map((step, index) => {
          const stepIndex = visibleSteps.indexOf(step);
          const isCurrent = step === currentStep;
          const isComplete =
            stepIndex >= 0 &&
            stepIndex < currentIndex &&
            validateWizardStep(step, state).length === 0;
          const canJump = isComplete && !isCurrent;

          return (
            <button
              key={step}
              type="button"
              disabled={!isCurrent && !canJump}
              onClick={() => canJump && onSelectStep(step)}
              data-testid={`wizard-step-nav-${step}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                !isCurrent && !canJump && "opacity-60 cursor-default",
                isCurrent && "bg-primary/10 text-primary font-medium",
                canJump && "hover:bg-muted cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  isComplete && "border-success bg-success/10 text-success",
                  isCurrent && !isComplete && "border-primary bg-primary text-primary-foreground",
                  !isCurrent && !isComplete && "border-border bg-background text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span>{getWizardStepLabel(step, state)}</span>
            </button>
          );
        })}
      </nav>

      <div className="md:hidden -mx-1 flex gap-2 overflow-x-auto pb-1 custom-scrollbar" aria-label="Wizard steps">
        {visibleSteps.map((step) => {
          const isCurrent = step === currentStep;
          const stepIndex = visibleSteps.indexOf(step);
          const isComplete =
            stepIndex >= 0 &&
            stepIndex < currentIndex &&
            validateWizardStep(step, state).length === 0;

          return (
            <button
              key={step}
              type="button"
              onClick={() => {
                if (isComplete) onSelectStep(step);
              }}
              disabled={!isComplete && !isCurrent}
              data-testid={`wizard-step-chip-${step}`}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isCurrent && "border-primary bg-primary/10 text-primary",
                isComplete && !isCurrent && "border-success/40 bg-success/5 text-success",
                !isCurrent && !isComplete && "border-border text-muted-foreground",
              )}
            >
              {isComplete && !isCurrent ? "✓ " : ""}
              {getWizardStepLabel(step, state)}
            </button>
          );
        })}
      </div>
    </>
  );
}

function WizardReviewPanel({
  state,
  catalog,
}: {
  state: CreateProjectWizardState;
  catalog?: CreateProjectWizardCatalog;
}) {
  const summary = buildWizardReviewSummary(state, catalog);
  const kindLabel = PROJECT_KIND_UI_LABELS[summary.projectKind];

  return (
    <aside
      className="rounded-lg border bg-muted/20 p-4 text-sm space-y-3"
      data-testid="wizard-review-panel"
    >
      <h3 className="font-semibold text-foreground">Review</h3>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs text-muted-foreground">Project</dt>
          <dd className="font-medium" data-testid="wizard-review-project">
            {summary.projectName}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Kind</dt>
          <dd>
            <Badge
              variant="outline"
              className={cn("text-2xs", PROJECT_KIND_UI_TONES[summary.projectKind])}
              data-testid="wizard-review-kind"
            >
              {kindLabel}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Client</dt>
          <dd data-testid="wizard-review-client">{summary.clientLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Capacity</dt>
          <dd data-testid="wizard-review-capacity">{summary.capacity}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Contract</dt>
          <dd data-testid="wizard-review-contract">
            {summary.contractAmount != null ? formatINR(summary.contractAmount) : "—"}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

export function CreateProjectWizard({
  open,
  onOpenChange,
  initialState,
  catalog,
  onCreate,
  isSubmitting = false,
  renderStepContent,
}: CreateProjectWizardProps) {
  const [state, setState] = useState<CreateProjectWizardState>(() =>
    createInitialCreateProjectWizardState(initialState),
  );
  const [currentStep, setCurrentStep] = useState<WizardStep>(() => resolveInitialStep(initialState));
  const [stepErrors, setStepErrors] = useState<{ field: string; message: string }[]>([]);

  const validateContext = useMemo<ValidateWizardContext>(
    () => ({
      quotations: catalog?.quotations?.map((q) => ({
        id: q.id,
        status: q.status,
        linkedProjectId: q.linkedProjectId,
      })),
    }),
    [catalog?.quotations],
  );

  const visibleSteps = useMemo(() => getVisibleWizardSteps(state), [state]);
  const allErrors = useMemo(
    () => validateVisibleWizardSteps(state, validateContext),
    [state, validateContext],
  );
  const canCreate = allErrors.length === 0 && !isSubmitting;
  const flowSubtitle = getWizardFlowSubtitle(state);

  const updateState = useCallback((patch: Partial<CreateProjectWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setStepErrors([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const next = createInitialCreateProjectWizardState(initialState);
    setState(next);
    setCurrentStep(resolveInitialStep(initialState));
    setStepErrors([]);
  }, [open, initialState]);

  useEffect(() => {
    if (!visibleSteps.includes(currentStep)) {
      setCurrentStep(visibleSteps[0] ?? getInitialWizardStep(state.flow ?? "intake"));
    }
  }, [visibleSteps, currentStep, state.flow]);

  const currentIndex = visibleSteps.indexOf(currentStep);
  const isFirstStep = currentIndex <= 0;
  const isLastVisibleStep = currentIndex >= visibleSteps.length - 1;
  const showNext = !isLastVisibleStep;

  const goNext = () => {
    const errors = validateWizardStep(currentStep, state, validateContext);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);

    if (
      currentStep === "QUOTATION" &&
      isQuotationPrefillComplete(state) &&
      !state.quotationEditDetails
    ) {
      setCurrentStep("REVIEW");
      return;
    }

    if (!isLastVisibleStep) {
      setCurrentStep(visibleSteps[currentIndex + 1]!);
    }
  };

  const goBack = () => {
    setStepErrors([]);
    if (!isFirstStep) {
      setCurrentStep(visibleSteps[currentIndex - 1]!);
    }
  };

  const handleCreate = async () => {
    const errors = validateVisibleWizardSteps(state, validateContext);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    await onCreate?.(state);
  };

  const stepContent = renderStepContent ? (
    renderStepContent(currentStep, state, updateState)
  ) : (
    <WizardStepContent
      step={currentStep}
      state={state}
      updateState={updateState}
      catalog={{
        quotations: catalog?.quotations,
        projects: catalog?.projects,
        customers: catalog?.customers as Customer[] | undefined,
        partners: catalog?.partners,
        incGiverCompanies: catalog?.incGiverCompanies,
        loans: catalog?.loans,
        vendorshipCompanies: catalog?.vendorshipCompanies,
        agents: catalog?.agents,
        employees: catalog?.employees,
        canDirectException: catalog?.canDirectException,
      }}
    />
  );

  const showSideReview = currentStep !== "REVIEW";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent size="wide" mobileFullScreen layout="bare" className="flex h-full flex-col">
        <SheetHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <SheetTitle>Create Project</SheetTitle>
          {flowSubtitle && (
            <p className="text-sm text-muted-foreground" data-testid="wizard-flow-subtitle">
              {flowSubtitle}
            </p>
          )}
          <SheetDescription className="sr-only">
            Create a project using a tailored flow for quotations, intake, exceptions, or outsource attach.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]">
          <div className="shrink-0 border-b px-4 py-3 md:border-b-0 md:border-r md:row-span-2 md:px-4 md:py-6">
            <WizardStepIndicator
              state={state}
              currentStep={currentStep}
              onSelectStep={(step) => {
                setStepErrors([]);
                setCurrentStep(step);
              }}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:col-start-2">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 custom-scrollbar lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:gap-6 lg:items-start">
              <div className="min-w-0 space-y-4">
                <div>
                  <h2 className="text-base font-semibold" data-testid="wizard-step-heading">
                    {getWizardStepLabel(currentStep, state)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Step {currentIndex + 1} of {visibleSteps.length}
                  </p>
                </div>

                {stepErrors.length > 0 && (
                  <div
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    data-testid="wizard-step-errors"
                    role="alert"
                  >
                    <ul className="list-disc space-y-1 pl-4">
                      {stepErrors.map((error) => (
                        <li key={`${error.field}-${error.message}`}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div data-testid={`wizard-step-content-${currentStep}`}>{stepContent}</div>
              </div>

              {showSideReview && (
                <div className="lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1">
                  <WizardReviewPanel state={state} catalog={catalog} />
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isFirstStep || isSubmitting}
                data-testid="wizard-back"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              {showNext ? (
                <Button type="button" onClick={goNext} disabled={isSubmitting} data-testid="wizard-next">
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Last step — use Create below</span>
              )}
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />
        <div className="flex shrink-0 justify-end px-4 py-3 sm:px-6">
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canCreate}
            data-testid="wizard-create"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </div>
      </AppSheetContent>
    </Sheet>
  );
}

export default CreateProjectWizard;
