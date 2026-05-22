export const SETTINGS_LS_KEYS = {
  profile: "mss.settings.profile",
  company: "mss.settings.company",
  theme: "mss.settings.theme",
  accent: "mss.settings.accent",
  twoFa: "mss.settings.2fa",
} as const;

/** Fired after `saveSettingsCompany` so shell UI (sidebar brand) refreshes same-tab. */
export const SETTINGS_COMPANY_CHANGED_EVENT = "mss.settings.company-changed";

export type SettingsProfileStored = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

export type SettingsCompanyStored = {
  companyName: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  website: string;
  industry: string;
  companyState: string;
  ownerName?: string;
};

export type SettingsPageInitialState = {
  profile: SettingsProfileStored;
  company: SettingsCompanyStored;
  theme: string;
  accent: string;
  twoFAEnabled: boolean;
};

const DEFAULT_PROFILE: SettingsProfileStored = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
};

const DEFAULT_COMPANY: SettingsCompanyStored = {
  companyName: "",
  gstNumber: "",
  panNumber: "",
  address: "",
  website: "",
  industry: "construction",
  companyState: "08",
};

function parseJsonRecord<T extends Record<string, unknown>>(
  raw: string | null,
  defaults: T,
): T {
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return { ...defaults };
    return { ...defaults, ...parsed } as T;
  } catch {
    return { ...defaults };
  }
}

function readString(storage: Storage, key: string, fallback: string): string {
  const v = storage.getItem(key);
  return v && v.trim() ? v : fallback;
}

/**
 * Single read of all Settings page localStorage keys (one parse per JSON blob).
 * Use once per component mount — e.g. `useState(() => loadSettingsPageInitialState())`.
 */
export function loadSettingsPageInitialState(
  storage: Storage = typeof window !== "undefined" ? window.localStorage : ({} as Storage),
): SettingsPageInitialState {
  const profileRaw = storage.getItem(SETTINGS_LS_KEYS.profile);
  const companyRaw = storage.getItem(SETTINGS_LS_KEYS.company);

  const profileParsed = parseJsonRecord(profileRaw, DEFAULT_PROFILE);
  const companyParsed = parseJsonRecord(companyRaw, DEFAULT_COMPANY);

  return {
    profile: {
      firstName: String(profileParsed.firstName ?? ""),
      lastName: String(profileParsed.lastName ?? ""),
      email: String(profileParsed.email ?? ""),
      phone: String(profileParsed.phone ?? ""),
      role: String(profileParsed.role ?? ""),
    },
    company: {
      companyName: String(companyParsed.companyName ?? ""),
      gstNumber: String(companyParsed.gstNumber ?? ""),
      panNumber: String(companyParsed.panNumber ?? ""),
      address: String(companyParsed.address ?? ""),
      website: String(companyParsed.website ?? ""),
      industry: String(companyParsed.industry ?? "construction"),
      companyState: String(companyParsed.companyState ?? "08"),
      ownerName: companyParsed.ownerName ? String(companyParsed.ownerName) : undefined,
    },
    theme: readString(storage, SETTINGS_LS_KEYS.theme, "light"),
    accent: readString(storage, SETTINGS_LS_KEYS.accent, "blue"),
    twoFAEnabled: storage.getItem(SETTINGS_LS_KEYS.twoFa) === "true",
  };
}

export function saveSettingsProfile(
  profile: SettingsProfileStored,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(SETTINGS_LS_KEYS.profile, JSON.stringify(profile));
}

export function saveSettingsCompany(
  company: SettingsCompanyStored,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(SETTINGS_LS_KEYS.company, JSON.stringify(company));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SETTINGS_COMPANY_CHANGED_EVENT));
  }
}

export function saveSettingsTheme(theme: string, storage: Storage = window.localStorage): void {
  storage.setItem(SETTINGS_LS_KEYS.theme, theme);
}

export function saveSettingsAccent(accent: string, storage: Storage = window.localStorage): void {
  storage.setItem(SETTINGS_LS_KEYS.accent, accent);
}

export function saveSettingsTwoFa(enabled: boolean, storage: Storage = window.localStorage): void {
  storage.setItem(SETTINGS_LS_KEYS.twoFa, String(enabled));
}

/** Read company JSON once (for non-Settings consumers). */
export function readSettingsCompanyStored(
  storage: Storage = typeof window !== "undefined" ? window.localStorage : ({} as Storage),
): SettingsCompanyStored {
  return loadSettingsPageInitialState(storage).company;
}
