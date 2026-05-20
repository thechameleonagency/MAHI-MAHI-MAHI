/**
 * DS7 — Toast copy for command / validation failures
 *
 * - **Title** — short prose (“Could not update enquiry”), never a raw `ERROR_CODE`.
 * - **Description** — user-facing explanation via `friendlyCommandErrorMessage()`; map known
 *   `errorCode` values in `commandErrorMessages.ts` before falling back to server `message`.
 */

export const COMMAND_ERROR_TOAST_HELPER = "friendlyCommandErrorMessage";
