import type { Project } from "@/types/project";

export const PROJECT_PAYMENT_TYPE_VALUES = ["cash", "loan", "cash-and-loan"] as const;

export type ProjectPaymentType = (typeof PROJECT_PAYMENT_TYPE_VALUES)[number];

export function isProjectPaymentType(value: unknown): value is ProjectPaymentType {
  return (
    typeof value === "string" &&
    value !== "" &&
    (PROJECT_PAYMENT_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function parseProjectPaymentType(value: unknown): ProjectPaymentType | undefined {
  return isProjectPaymentType(value) ? value : undefined;
}

/** Prefer validated intake value, then quotation — never cast or coerce empty string. */
export function resolveProjectPaymentTypeFromSources(params: {
  intakePayment?: unknown;
  quotationPayment?: unknown;
}): ProjectPaymentType | undefined {
  return (
    parseProjectPaymentType(params.intakePayment) ??
    parseProjectPaymentType(params.quotationPayment)
  );
}

export function validateIntakePaymentType(
  value: unknown,
  options?: { required?: boolean },
): { ok: true; value?: ProjectPaymentType } | { ok: false; message: string } {
  const parsed = parseProjectPaymentType(value);
  if (parsed) {
    return { ok: true, value: parsed };
  }
  if (value === "" || value === undefined || value === null) {
    if (options?.required) {
      return {
        ok: false,
        message: "Payment type is required (cash, loan, or cash-and-loan).",
      };
    }
    return { ok: true, value: undefined };
  }
  return {
    ok: false,
    message: `Invalid payment type "${String(value)}". Must be cash, loan, or cash-and-loan.`,
  };
}

/** Normalize persisted project payment — drops empty string and unknown values. */
export function normalizeProjectPaymentType(
  value: Project["paymentType"] | unknown,
): ProjectPaymentType | undefined {
  return parseProjectPaymentType(value);
}
