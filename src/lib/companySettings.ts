import { readSettingsCompanyStored } from "@/lib/settingsStorage";

/** GST state code for the company (from Settings → Company). Defaults to Rajasthan (08). */
export function getCompanyStateCode(): string {
  if (typeof window === "undefined") return "08";
  const code = readSettingsCompanyStored().companyState?.trim();
  return code || "08";
}
