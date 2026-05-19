const LS_COMPANY = "mss.settings.company";

/** GST state code for the company (from Settings → Company). Defaults to Rajasthan (08). */
export function getCompanyStateCode(): string {
  if (typeof window === "undefined") return "08";
  try {
    const raw = window.localStorage.getItem(LS_COMPANY);
    if (!raw) return "08";
    const parsed = JSON.parse(raw) as { companyState?: string };
    const code = parsed.companyState?.trim();
    return code || "08";
  } catch {
    return "08";
  }
}
