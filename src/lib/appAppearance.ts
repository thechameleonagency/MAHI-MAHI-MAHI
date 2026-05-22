import {
  loadSettingsPageInitialState,
  SETTINGS_LS_KEYS,
  type SettingsPageInitialState,
} from "@/lib/settingsStorage";

export const APP_THEME_VALUES = ["light", "dark", "system"] as const;
export type AppThemePreference = (typeof APP_THEME_VALUES)[number];

export const APP_ACCENT_VALUES = ["blue", "green", "purple", "amber", "red"] as const;
export type AppAccent = (typeof APP_ACCENT_VALUES)[number];

export type ResolvedThemeClass = "light" | "dark";

/** Same key used by next-themes `ThemeProvider` and settings storage. */
export const APP_THEME_STORAGE_KEY = SETTINGS_LS_KEYS.theme;

function isAppThemePreference(value: string): value is AppThemePreference {
  return (APP_THEME_VALUES as readonly string[]).includes(value);
}

function isAppAccent(value: string): value is AppAccent {
  return (APP_ACCENT_VALUES as readonly string[]).includes(value);
}

export function normalizeThemePreference(theme: string): AppThemePreference {
  return isAppThemePreference(theme) ? theme : "light";
}

export function normalizeAccent(accent: string): AppAccent {
  return isAppAccent(accent) ? accent : "blue";
}

export function prefersDarkColorScheme(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Map stored preference to the class Tailwind uses on `<html>`. */
export function resolveThemeClass(theme: AppThemePreference): ResolvedThemeClass {
  if (theme === "system") {
    return prefersDarkColorScheme() ? "dark" : "light";
  }
  return theme;
}

export function applyThemeToDocument(theme: AppThemePreference): ResolvedThemeClass {
  const resolved = resolveThemeClass(theme);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  return resolved;
}

export function applyAccentToDocument(accent: AppAccent, _mode?: ResolvedThemeClass): void {
  document.documentElement.setAttribute("data-accent", accent);
}

export function applyAppearanceFromSettings(settings: SettingsPageInitialState): ResolvedThemeClass {
  const theme = normalizeThemePreference(settings.theme);
  const accent = normalizeAccent(settings.accent);
  const resolved = applyThemeToDocument(theme);
  applyAccentToDocument(accent, resolved);
  return resolved;
}

/** Call synchronously before React render to avoid theme flash. */
export function initAppAppearance(storage: Storage = window.localStorage): ResolvedThemeClass {
  const settings = loadSettingsPageInitialState(storage);
  return applyAppearanceFromSettings(settings);
}

/**
 * Re-apply resolved class when OS preference changes (only when stored theme is `system`).
 */
export function watchSystemTheme(
  getStoredTheme: () => AppThemePreference = () =>
    normalizeThemePreference(window.localStorage.getItem(APP_THEME_STORAGE_KEY) ?? "light"),
): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (getStoredTheme() === "system") {
      applyThemeToDocument("system");
    }
  };

  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
