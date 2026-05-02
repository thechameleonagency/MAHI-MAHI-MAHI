// Utility functions for project management

import type { ProjectTimelineStatus } from "@/types/blockage";
import type { Project } from "@/types/project";
import { WORK_STATUS_STAGES } from "@/types/blockage";

/**
 * Derives the project stage from timeline status
 * This provides automatic stage calculation based on timeline completion
 */
export function deriveProjectStageFromTimeline(
  timeline: ProjectTimelineStatus | null | undefined
): string {
  if (!timeline) return "enquiry";

  // 1. Check if payment complete (fully paid)
  const isPaymentComplete = 
    (timeline.paymentType === "cash-to-mahi" && timeline.cashToMahiConfirmed) ||
    (timeline.paymentType === "instalments" && timeline.firstInstallmentPaid && timeline.secondInstallmentPaid);
  
  if (isPaymentComplete) {
    return "completed";
  }

  // 2. Check if DISCOM complete
  const isDiscomComplete = 
    timeline.discomChecks.length === 3 && 
    timeline.discomSubsidyStatus === "approved";
  
  if (isDiscomComplete) {
    return "work-in-progress"; // Near completion, waiting for payment
  }

  // 3. Check if any work status is done
  if (timeline.workStatusChecks && timeline.workStatusChecks.length > 0) {
    return "work-in-progress";
  }

  // 4. Check if bank file selected
  if (timeline.bankFileType) {
    return "quotation-sent"; // Deal confirmed, ready for work
  }

  // 5. Check if file login in progress
  if (timeline.fileLogin && timeline.fileLogin !== "pending") {
    return "site-survey"; // Documentation phase
  }

  // Default
  return "enquiry";
}

/**
 * Calculates overall timeline completion percentage
 */
export function getTimelineCompletionPercent(
  timeline: ProjectTimelineStatus | null | undefined
): number {
  if (!timeline) return 0;

  let totalSteps = 0;
  let completedSteps = 0;

  // 1. File Login (1 step, completed when "complete")
  totalSteps += 1;
  if (timeline.fileLoginComplete || timeline.fileLogin === "complete") {
    completedSteps += 1;
  }

  // 2. Subsidy (1 step, completed when selected)
  totalSteps += 1;
  if (timeline.subsidyType) {
    completedSteps += 1;
  }

  // 3. Bank File (1 step)
  totalSteps += 1;
  if (timeline.bankFileType === "cash" || 
      (timeline.bankFileType === "loan" && timeline.loanStatus === "approved")) {
    completedSteps += 1;
  }

  // 4. Work Status (6 steps)
  totalSteps += WORK_STATUS_STAGES.length;
  completedSteps += (timeline.workStatusChecks?.length || 0);

  // 5. DISCOM (3 steps + 1 for approval)
  totalSteps += 4;
  completedSteps += (timeline.discomChecks?.length || 0);
  if (timeline.discomSubsidyStatus === "approved") {
    completedSteps += 1;
  }

  // 6. Payment (1 step for completion)
  totalSteps += 1;
  if ((timeline.paymentType === "cash-to-mahi" && timeline.cashToMahiConfirmed) ||
      (timeline.paymentType === "instalments" && timeline.firstInstallmentPaid && timeline.secondInstallmentPaid)) {
    completedSteps += 1;
  }

  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Gets the invoice amount based on project payment type
 * - Cash projects: use contractAmount
 * - Loan projects: use bankDocumentationAmount (higher amount for bank)
 */
export function getInvoiceAmountFromProject(project: Project): number {
  if (project.paymentType === "loan" && project.bankDocumentationAmount) {
    return project.bankDocumentationAmount;
  }
  return project.contractAmount;
}

/**
 * Gets a display label for the project stage
 */
export function getProjectStageLabel(stage: string): string {
  const stageLabels: Record<string, string> = {
    "enquiry": "Enquiry",
    "site-survey": "Site Survey",
    "quotation-sent": "Quotation Sent",
    "work-in-progress": "Work in Progress",
    "completed": "Completed",
  };
  return stageLabels[stage] || stage;
}

/**
 * Gets the appropriate badge color for a project stage
 */
export function getProjectStageBadgeClass(stage: string): string {
  const stageClasses: Record<string, string> = {
    "enquiry": "bg-muted text-muted-foreground",
    "site-survey": "bg-blue-500/10 text-blue-600 border-blue-500/30",
    "quotation-sent": "bg-amber-500/10 text-amber-600 border-amber-500/30",
    "work-in-progress": "bg-purple-500/10 text-purple-600 border-purple-500/30",
    "completed": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
  return stageClasses[stage] || "bg-muted text-muted-foreground";
}
