import type {
  ProjectChangeRequestMaterialDelta,
  ProjectChangeRequestType,
} from "@/types/operations";

export type ChangeRequestDraftFields = {
  type: ProjectChangeRequestType;
  deltaKw?: number;
  deltaPanels?: number;
  deltaAmount?: number;
  materialDelta?: ProjectChangeRequestMaterialDelta[];
};

function positiveOrUndefined(raw: string): number | undefined {
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Parse UI string inputs into persisted numeric fields (only strictly positive values). */
export function parseChangeRequestFieldsFromForm(
  type: ProjectChangeRequestType,
  form: { deltaKw: string; deltaPanels: string; deltaAmount: string },
): Pick<ChangeRequestDraftFields, "deltaKw" | "deltaPanels" | "deltaAmount"> {
  switch (type) {
    case "capacity":
      return {
        deltaKw: positiveOrUndefined(form.deltaKw),
        deltaAmount: positiveOrUndefined(form.deltaAmount),
      };
    case "panels":
      return { deltaPanels: positiveOrUndefined(form.deltaPanels) };
    case "addon-work":
      return { deltaAmount: positiveOrUndefined(form.deltaAmount) };
    default:
      return {};
  }
}

/** Gate draft create/approve — each request type requires its primary commercial input. */
export function validateChangeRequestDraft(
  draft: ChangeRequestDraftFields,
): { ok: true } | { ok: false; message: string } {
  switch (draft.type) {
    case "capacity": {
      const kw = draft.deltaKw ?? 0;
      const amt = draft.deltaAmount ?? 0;
      if (kw > 0 || amt > 0) return { ok: true };
      return {
        ok: false,
        message: "Capacity changes require a positive kW delta or amount (₹).",
      };
    }
    case "panels": {
      const panels = draft.deltaPanels ?? 0;
      if (panels > 0) return { ok: true };
      return {
        ok: false,
        message: "Panel changes require additional panel count greater than zero.",
      };
    }
    case "addon-work": {
      const amt = draft.deltaAmount ?? 0;
      if (amt > 0) return { ok: true };
      return {
        ok: false,
        message: "Add-on work requires a positive amount (₹).",
      };
    }
    default:
      return { ok: false, message: "Unknown change request type." };
  }
}
