import type {
  LegacyIntakePayload,
  ProjectIntakePayload,
  TypedIntakePayload,
} from "@/application/services/ProjectTypeService";
import { projectKindConfigs } from "@/domain/projectTypes/config";
import {
  LEGACY_KIND_TO_TYPE,
  PROJECT_KINDS,
  PROJECT_TYPES,
  type ExecutionScope,
  type PartnerRole,
  type ProjectKind,
  type ProjectType,
  type VendorshipOwner,
} from "@/domain/projectTypes/types";

export type IntakePayloadShape = "legacy" | "typed";

export type ResolvedIntakeLegacyKind =
  | { ok: true; kind: ProjectKind; shape: IntakePayloadShape }
  | { ok: false; error: string };

const VENDORSHIP_OWNERS: VendorshipOwner[] = ["MSS", "partner", "none"];
const EXECUTION_SCOPES: ExecutionScope[] = ["full", "service_only", "none"];
const PARTNER_ROLES: PartnerRole[] = ["epc", "fixed_margin", "vendor_channel", "vendorship_only"];

function isKnownProjectKind(kind: unknown): kind is ProjectKind {
  return typeof kind === "string" && (PROJECT_KINDS as readonly string[]).includes(kind);
}

function hasTypedTaxonomyFields(payload: ProjectIntakePayload): boolean {
  const t = payload as TypedIntakePayload;
  return (
    t.projectMode !== undefined ||
    t.vendorshipOwner !== undefined ||
    t.partnerRole !== undefined ||
    t.executionScope !== undefined
  );
}

function isCompleteTypedPayload(payload: ProjectIntakePayload): payload is TypedIntakePayload {
  const t = payload as TypedIntakePayload;
  return (
    typeof t.projectMode === "string" &&
    typeof t.vendorshipOwner === "string" &&
    typeof t.executionScope === "string"
  );
}

function validateTypedTaxonomyValues(t: TypedIntakePayload): string | null {
  if (!(PROJECT_TYPES as readonly string[]).includes(t.projectMode)) {
    return `Invalid projectMode "${String(t.projectMode)}".`;
  }
  if (!(VENDORSHIP_OWNERS as readonly string[]).includes(t.vendorshipOwner)) {
    return `Invalid vendorshipOwner "${String(t.vendorshipOwner)}".`;
  }
  if (!(EXECUTION_SCOPES as readonly string[]).includes(t.executionScope)) {
    return `Invalid executionScope "${String(t.executionScope)}".`;
  }
  if (
    t.partnerRole !== undefined &&
    !(PARTNER_ROLES as readonly string[]).includes(t.partnerRole)
  ) {
    return `Invalid partnerRole "${String(t.partnerRole)}".`;
  }
  return null;
}

function findLegacyKindForTyped(t: TypedIntakePayload): ProjectKind | undefined {
  const entry = (
    Object.entries(LEGACY_KIND_TO_TYPE) as [ProjectKind, (typeof LEGACY_KIND_TO_TYPE)[ProjectKind]][]
  ).find(
    ([, v]) =>
      v.projectType === t.projectMode &&
      v.vendorshipOwner === t.vendorshipOwner &&
      v.partnerRole === t.partnerRole &&
      v.executionScope === t.executionScope,
  );
  return entry?.[0];
}

function validateLegacyKind(kind: unknown): ResolvedIntakeLegacyKind | null {
  if (!isKnownProjectKind(kind)) {
    return { ok: false, error: `Unknown project kind "${String(kind)}".` };
  }
  if (!projectKindConfigs[kind]) {
    return { ok: false, error: `Unknown project kind: ${String(kind)}` };
  }
  return { ok: true, kind, shape: "legacy" };
}

/**
 * Resolve the legacy {@link ProjectKind} for intake validation and shell builders.
 * Rejects unknown shapes — no silent `SOLO_EPC` fallback when taxonomy does not map.
 */
export function resolveIntakeLegacyKind(payload: ProjectIntakePayload): ResolvedIntakeLegacyKind {
  const hasKind = (payload as LegacyIntakePayload).kind !== undefined;
  const hasTyped = hasTypedTaxonomyFields(payload);

  if (hasKind && hasTyped) {
    const legacyResolved = validateLegacyKind((payload as LegacyIntakePayload).kind);
    if (!legacyResolved?.ok) {
      return legacyResolved ?? { ok: false, error: "Invalid legacy kind on intake." };
    }
    if (isCompleteTypedPayload(payload)) {
      const taxonomyError = validateTypedTaxonomyValues(payload);
      if (taxonomyError) {
        return { ok: false, error: taxonomyError };
      }
      const mapped = findLegacyKindForTyped(payload);
      if (mapped && mapped !== legacyResolved.kind) {
        return {
          ok: false,
          error: `Intake kind "${legacyResolved.kind}" conflicts with projectMode/vendorship/execution attributes.`,
        };
      }
    }
    return legacyResolved;
  }

  if (hasKind) {
    const legacyResolved = validateLegacyKind((payload as LegacyIntakePayload).kind);
    if (!legacyResolved?.ok) {
      return legacyResolved ?? { ok: false, error: "Invalid legacy kind on intake." };
    }
    return legacyResolved;
  }

  if (!isCompleteTypedPayload(payload)) {
    if (hasTyped) {
      return {
        ok: false,
        error:
          "Typed intake must include projectMode, vendorshipOwner, and executionScope.",
      };
    }
    return {
      ok: false,
      error:
        "Intake must use legacy `{ kind, parties, commercial }` or typed `{ projectMode, vendorshipOwner, executionScope, parties, commercial }`.",
    };
  }

  const taxonomyError = validateTypedTaxonomyValues(payload);
  if (taxonomyError) {
    return { ok: false, error: taxonomyError };
  }

  const mapped = findLegacyKindForTyped(payload);
  if (!mapped) {
    return {
      ok: false,
      error: `No project kind matches intake taxonomy (projectMode=${payload.projectMode}, vendorshipOwner=${payload.vendorshipOwner}, executionScope=${payload.executionScope}, partnerRole=${payload.partnerRole ?? "—"}).`,
    };
  }

  return { ok: true, kind: mapped, shape: "typed" };
}

export function resolveProjectKindFromIntake(
  intake: ProjectIntakePayload,
): { ok: true; kind: ProjectKind } | { ok: false; errorCode: string; message: string } {
  const resolved = resolveIntakeLegacyKind(intake);
  if (!resolved.ok) {
    return {
      ok: false,
      errorCode: "PROJECT_INTAKE_SHAPE_INVALID",
      message: resolved.error,
    };
  }
  return { ok: true, kind: resolved.kind };
}
