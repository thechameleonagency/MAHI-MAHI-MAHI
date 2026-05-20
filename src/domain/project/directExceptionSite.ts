import type { Project } from "@/types/project";

/** Site / classification fields required for direct-exception project create (no quotation to derive from). */
export interface DirectExceptionSiteDetails {
  projectType: "Residential" | "Commercial" | "Industrial";
  projectCategory: "solar" | "other";
  capacity: string;
  location: string;
}

const BLOCKED_SENTINELS = new Set(["pending", "n/a", "na", "tbd", "—", "-"]);

export type DirectExceptionSiteValidation =
  | { ok: true; site: DirectExceptionSiteDetails }
  | { ok: false; errorCode: string; message: string };

export function validateDirectExceptionSite(
  site: DirectExceptionSiteDetails | undefined,
): DirectExceptionSiteValidation {
  if (!site) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_SITE_REQUIRED",
      message:
        "Direct exception requires project type, category, capacity, and location in intake.site — no defaults are applied.",
    };
  }

  const projectType = site.projectType;
  if (!projectType || !["Residential", "Commercial", "Industrial"].includes(projectType)) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_PROJECT_TYPE_REQUIRED",
      message: "Select a project type (Residential, Commercial, or Industrial).",
    };
  }

  const projectCategory = site.projectCategory;
  if (!projectCategory || !["solar", "other"].includes(projectCategory)) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_PROJECT_CATEGORY_REQUIRED",
      message: "Select a project category (solar or other).",
    };
  }

  const capacity = site.capacity?.trim() ?? "";
  if (!capacity || BLOCKED_SENTINELS.has(capacity.toLowerCase())) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_CAPACITY_REQUIRED",
      message: "Enter the system capacity (e.g. 10 or 10 kW). Placeholder values like N/A are not allowed.",
    };
  }

  const location = site.location?.trim() ?? "";
  if (!location || BLOCKED_SENTINELS.has(location.toLowerCase())) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_LOCATION_REQUIRED",
      message: "Enter the project site address or city. Placeholder values like Pending are not allowed.",
    };
  }

  return {
    ok: true,
    site: { projectType, projectCategory, capacity, location },
  };
}
