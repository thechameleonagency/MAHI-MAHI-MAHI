import {
  readSettingsCompanyStored,
  SETTINGS_LS_KEYS,
} from "@/lib/settingsStorage";

/** Shown in the shell when Settings → Company name is empty (prototype default). */
export const DEFAULT_COMPANY_DISPLAY_NAME = "Mahi Solar";

export { SETTINGS_COMPANY_CHANGED_EVENT as COMPANY_SETTINGS_CHANGED_EVENT } from "@/lib/settingsStorage";

/** Display name from Settings → Company (`mss.settings.company`). */
export function getCompanyDisplayName(
  storage: Storage = typeof window !== "undefined" ? window.localStorage : ({} as Storage),
): string {
  const name = readSettingsCompanyStored(storage).companyName?.trim();
  return name || DEFAULT_COMPANY_DISPLAY_NAME;
}

/** GST state code for the company (from Settings → Company). Defaults to Rajasthan (08). */
export function getCompanyStateCode(): string {
  if (typeof window === "undefined") return "08";
  const code = readSettingsCompanyStored().companyState?.trim();
  return code || "08";
}

export function companySettingsStorageKey(): string {
  return SETTINGS_LS_KEYS.company;
}
