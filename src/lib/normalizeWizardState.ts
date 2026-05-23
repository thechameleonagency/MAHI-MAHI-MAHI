import { legacyLeadPathFromDealKind } from "@/lib/wizardFlow";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Canonical field mapping before submit/build — merges duplicate name/capacity keys.
 */
export function normalizeWizardState(state: CreateProjectWizardState): CreateProjectWizardState {
  const normalized: CreateProjectWizardState = { ...state };

  if (state.dealKind) {
    const legacy = legacyLeadPathFromDealKind(state.dealKind);
    normalized.leadPath = legacy.leadPath;
    normalized.partnerType = legacy.partnerType ?? state.partnerType;
    normalized.directExceptionProjectKind = state.dealKind;
  } else if (state.directExceptionProjectKind && !state.dealKind) {
    normalized.dealKind = state.directExceptionProjectKind;
    const legacy = legacyLeadPathFromDealKind(state.directExceptionProjectKind);
    normalized.leadPath = legacy.leadPath;
    normalized.partnerType = legacy.partnerType ?? state.partnerType;
  }

  const projectName =
    trim(state.projectName) || trim(state.partnerProjectName) || trim(state.incProjectName);
  if (projectName) {
    if (!trim(normalized.projectName)) normalized.projectName = projectName;
    if (!trim(normalized.partnerProjectName) && state.partnerProjectName) {
      normalized.partnerProjectName = projectName;
    }
  }

  const capacity = trim(state.capacity) || trim(state.partnerCapacity) || trim(state.incCapacity);
  if (capacity) {
    if (!trim(normalized.capacity)) normalized.capacity = capacity;
    if (!trim(normalized.partnerCapacity) && state.partnerCapacity) {
      normalized.partnerCapacity = capacity;
    }
  }

  if (
    (normalized.partnerContractAmount === undefined || normalized.partnerContractAmount === null) &&
    state.contractAmount != null
  ) {
    normalized.partnerContractAmount = state.contractAmount;
  }

  return normalized;
}
