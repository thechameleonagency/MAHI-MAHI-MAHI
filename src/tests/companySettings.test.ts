import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_COMPANY_DISPLAY_NAME,
  getCompanyDisplayName,
} from "@/lib/companySettings";
import { saveSettingsCompany, SETTINGS_LS_KEYS } from "@/lib/settingsStorage";

describe("companySettings", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = {
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
  });

  it("returns stored company name from settings", () => {
    storage.setItem(
      SETTINGS_LS_KEYS.company,
      JSON.stringify({ companyName: "Acme Solar Pvt Ltd", companyState: "08" }),
    );
    expect(getCompanyDisplayName(storage)).toBe("Acme Solar Pvt Ltd");
  });

  it("falls back when company name is empty", () => {
    expect(getCompanyDisplayName(storage)).toBe(DEFAULT_COMPANY_DISPLAY_NAME);
  });

  it("sidebar source no longer hardcodes Mahi Sola Solutions", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/Sidebar.tsx"), "utf8");
    expect(source).not.toContain("Mahi Sola Solutions");
    expect(source).toContain("useCompanyDisplayName");
  });
});

describe("saveSettingsCompany (Mn7 same-tab refresh)", () => {
  it("dispatches company-changed event on save", () => {
    const events: string[] = [];
    const handler = (e: Event) => events.push(e.type);
    window.addEventListener("mss.settings.company-changed", handler);
    saveSettingsCompany({ companyName: "Test Co", companyState: "08", gstNumber: "", panNumber: "", address: "", website: "", industry: "construction" });
    window.removeEventListener("mss.settings.company-changed", handler);
    expect(events).toContain("mss.settings.company-changed");
  });
});
