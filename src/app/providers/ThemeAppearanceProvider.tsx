import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import {
  APP_THEME_STORAGE_KEY,
  applyAccentToDocument,
  normalizeAccent,
  watchSystemTheme,
  type ResolvedThemeClass,
} from "@/lib/appAppearance";
import { loadSettingsPageInitialState } from "@/lib/settingsStorage";

function ThemeAccentSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    return watchSystemTheme();
  }, []);

  useEffect(() => {
    const mode: ResolvedThemeClass = resolvedTheme === "dark" ? "dark" : "light";
    const accent = normalizeAccent(loadSettingsPageInitialState().accent);
    applyAccentToDocument(accent, mode);
  }, [resolvedTheme]);

  return null;
}

export function ThemeAppearanceProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      storageKey={APP_THEME_STORAGE_KEY}
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeAccentSync />
      {children}
    </ThemeProvider>
  );
}
