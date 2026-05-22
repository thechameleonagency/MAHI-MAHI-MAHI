import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAccentToDocument,
  applyThemeToDocument,
  initAppAppearance,
  normalizeAccent,
  normalizeThemePreference,
  resolveThemeClass,
} from "@/lib/appAppearance";
import { SETTINGS_LS_KEYS } from "@/lib/settingsStorage";

describe("appAppearance", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-accent");
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  it("normalizeThemePreference falls back to light for unknown values", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("invalid")).toBe("light");
  });

  it("normalizeAccent falls back to blue", () => {
    expect(normalizeAccent("green")).toBe("green");
    expect(normalizeAccent("nope")).toBe("blue");
  });

  it("resolveThemeClass maps system to matchMedia result", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    expect(resolveThemeClass("system")).toBe("dark");
    expect(resolveThemeClass("light")).toBe("light");
  });

  it("applyThemeToDocument sets html class", () => {
    applyThemeToDocument("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    applyThemeToDocument("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applyAccentToDocument sets data-accent attribute", () => {
    applyAccentToDocument("purple");
    expect(document.documentElement.getAttribute("data-accent")).toBe("purple");
  });

  it("initAppAppearance reads storage and applies theme + accent", () => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
      get length() {
        return Object.keys(this.store).length;
      },
      key() {
        return null;
      },
    } as Storage;

    storage.setItem(SETTINGS_LS_KEYS.theme, "dark");
    storage.setItem(SETTINGS_LS_KEYS.accent, "green");

    const resolved = initAppAppearance(storage);
    expect(resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-accent")).toBe("green");
  });

  it("uses light default when theme key is missing", () => {
    const storage = {
      store: {} as Record<string, string>,
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
      clear() {},
      get length() {
        return 0;
      },
      key() {
        return null;
      },
    } as Storage;

    initAppAppearance(storage);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
