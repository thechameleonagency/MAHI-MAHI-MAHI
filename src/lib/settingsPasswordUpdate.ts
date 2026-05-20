/** Shown under the current-password field on Settings → Security. */
export const SETTINGS_PASSWORD_CURRENT_HELP =
  "Prototype only: your current password is not checked against a server. Enter it to confirm you intend to change the password on this device.";

export const SETTINGS_PASSWORD_SUCCESS_DESCRIPTION =
  "New password accepted for this browser session. Current password was not verified against an account server in the prototype.";

export type SettingsPasswordFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type SettingsPasswordValidationError = {
  ok: false;
  title: string;
  description: string;
};

export type SettingsPasswordValidationResult =
  | { ok: true }
  | SettingsPasswordValidationError;

const MIN_PASSWORD_LENGTH = 6;

/**
 * Client-side validation for Settings → Update password (prototype; no auth backend).
 */
export function validateSettingsPasswordUpdate(
  fields: SettingsPasswordFields,
): SettingsPasswordValidationResult {
  if (!fields.currentPassword.trim()) {
    return {
      ok: false,
      title: "Current password required",
      description: "Enter your current password before setting a new one.",
    };
  }
  if (!fields.newPassword) {
    return {
      ok: false,
      title: "New password required",
      description: "Enter a new password.",
    };
  }
  if (fields.newPassword !== fields.confirmPassword) {
    return {
      ok: false,
      title: "Password mismatch",
      description: "New password and confirm password do not match.",
    };
  }
  if (fields.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      title: "Too short",
      description: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { ok: true };
}
