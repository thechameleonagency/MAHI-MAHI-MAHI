import type { CommandFailure } from "@/application/commands/types";
import { QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE } from "@/domain/quotation/quotationPaymentType";
import { QUOTATION_ZERO_AMOUNT_ERROR } from "@/domain/quotation/quotationCommercialAmount";

/** Known command / domain error codes → user-facing toast description (DS7). */
export const COMMAND_ERROR_MESSAGES: Record<string, string> = {
  COMMAND_HANDLER_NOT_FOUND: "This action is not available yet. Contact support if it persists.",
  ENQUIRY_ID_EXISTS: "An enquiry with this id already exists.",
  ENQUIRY_NOT_FOUND: "Enquiry not found.",
  INVALID_ENQUIRY_TRANSITION: "That status change is not allowed for this enquiry.",
  ENQUIRY_MISSING_QUOTATION: "Create and link a quotation before marking the enquiry as quotation sent.",
  ENQUIRY_TERMINAL_FOR_QUOTATION: "Cannot create a quotation for a converted or lost enquiry.",
  QUOTATION_ID_EXISTS: "A quotation with this id already exists.",
  QUOTATION_CREATE_SOURCE_INVALID: "This quotation cannot be created from the selected source.",
  QUOTATION_NOT_FOUND: "Quotation not found.",
  INVALID_QUOTATION_TRANSITION: "That status change is not allowed for this quotation.",
  QUOTATION_SEND_VALIDATION_FAILED: "Complete customer and line items before sending the quotation.",
  QUOTATION_ZERO_AMOUNT: QUOTATION_ZERO_AMOUNT_ERROR,
  QUOTATION_PAYMENT_TYPE_REQUIRED: QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE,
  QUOTATION_CONVERT_VALIDATION_FAILED: "Complete payment details before converting this quotation.",
  QUOTATION_APPROVE_VALIDATION_FAILED: "Complete customer details before approving this quotation.",
  QUOTATION_NOT_APPROVED: "Project can only be created from an approved quotation.",
  QUOTATION_ALREADY_CONVERTED: "This quotation is already linked to a project.",
  QUOTATION_TERMINAL:
    "This quotation is linked to a project and cannot be edited. Clone it for a new quote, or use Change requests on the project.",
  QUOTATION_PROJECT_MISMATCH: "Project and quotation ids do not match.",
  QUOTATION_MISSING_SYSTEM_CATEGORY:
    "Solar quotation is missing system category. Complete the quotation before creating a project.",
  LOCKED_FIELD: "Commercial fields cannot be changed after approval (except via status transition).",
  INVALID_STATUS_TRANSITION: "That status change is not allowed.",
  PROJECT_PAYMENT_TYPE_INVALID: "Payment type must be cash, loan, or cash-and-loan.",
  PROJECT_INTAKE_INVALID: "Project intake is incomplete. Check required fields.",
  PROJECT_INTAKE_SHAPE_INVALID: "Project intake data is invalid.",
  PROJECT_ID_EXISTS: "A project with this id already exists.",
  PROJECT_KIND_CONFIG_MISSING: "Project type configuration is missing for this kind.",
  PROJECT_NOT_FOUND: "Project not found.",
  PARTNER_COUNT: "At most one external partner per project.",
  REASON_REQUIRED: "Enter a reason for the direct project exception.",
  QUOTATION_REQUIRED: "Solo EPC projects require an approved quotation.",
  DIRECT_EXCEPTION_SITE_REQUIRED:
    "Direct exception requires project type, category, capacity, and location.",
  DIRECT_EXCEPTION_PROJECT_TYPE_REQUIRED: "Select a project type (Residential, Commercial, or Industrial).",
  DIRECT_EXCEPTION_PROJECT_CATEGORY_REQUIRED: "Select a project category (solar or other).",
  DIRECT_EXCEPTION_CAPACITY_REQUIRED: "Enter system capacity (e.g. 10 kW).",
  DIRECT_EXCEPTION_LOCATION_REQUIRED: "Enter the project site address or city.",
  DIRECT_EXCEPTION_PAYMENT_TYPE_INVALID: "Payment type must be cash, loan, or cash-and-loan.",
  DIRECT_EXCEPTION_PAYMENT_TYPE_REQUIRED: "Select a payment type for this direct exception project.",
  INVALID_QTY: "Quantity must be greater than zero.",
  INVENTORY_NOT_FOUND: "Inventory item not found.",
  MOVEMENT_INVALID: "Inventory movement could not be applied.",
  forbidden: "Your role cannot perform this action.",
  INVENTORY_MOVEMENT_REVERSE_FORBIDDEN: "Your role cannot reverse inventory movements.",
  TOOL_MOVEMENT_REVERSE_FORBIDDEN: "Your role cannot reverse tool movements.",
};

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,}$/;

export function isCommandErrorCode(value: string): boolean {
  return ERROR_CODE_PATTERN.test(value.trim());
}

/** Map raw command error text (code or message) to user-facing copy. */
export function friendlyCommandErrorMessage(
  raw: string | undefined | null,
  fallback = "Something went wrong. Try again.",
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  if (COMMAND_ERROR_MESSAGES[trimmed]) return COMMAND_ERROR_MESSAGES[trimmed];
  if (!isCommandErrorCode(trimmed)) return trimmed;
  return trimmed
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type CommandErrorInput =
  | string
  | undefined
  | null
  | Pick<CommandFailure, "errorCode" | "message">
  | { error?: string; errorCode?: string; message?: string };

/** Resolve description for destructive toasts from command failures or `{ error }` results. */
export function resolveCommandErrorMessage(
  input: CommandErrorInput,
  fallback = "Something went wrong. Try again.",
): string {
  if (input == null) return fallback;
  if (typeof input === "string") return friendlyCommandErrorMessage(input, fallback);

  const message = input.message?.trim();
  const code = input.errorCode?.trim();
  const error = "error" in input ? input.error?.trim() : undefined;

  if (message && !isCommandErrorCode(message)) return message;
  if (code && COMMAND_ERROR_MESSAGES[code]) return COMMAND_ERROR_MESSAGES[code];
  if (error && !isCommandErrorCode(error)) return error;
  if (message) return friendlyCommandErrorMessage(message, fallback);
  if (error) return friendlyCommandErrorMessage(error, fallback);
  if (code) return friendlyCommandErrorMessage(code, fallback);
  return fallback;
}
