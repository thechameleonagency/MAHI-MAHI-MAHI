import { beforeEach, describe, expect, it } from "vitest";
import {
  loadSettingsPageInitialState,
  saveSettingsCompany,
  saveSettingsProfile,
  SETTINGS_LS_KEYS,
} from "@/lib/settingsStorage";

describe("settingsStorage", () => {
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

  it("loads profile and company from a single parse each", () => {
    storage.setItem(
      SETTINGS_LS_KEYS.profile,
      JSON.stringify({ firstName: "Asha", lastName: "Rao", email: "a@test.com" }),
    );
    storage.setItem(
      SETTINGS_LS_KEYS.company,
      JSON.stringify({ companyName: "Mahi Solar", companyState: "27" }),
    );
    storage.setItem(SETTINGS_LS_KEYS.theme, "light");
    storage.setItem(SETTINGS_LS_KEYS.accent, "green");
    storage.setItem(SETTINGS_LS_KEYS.twoFa, "true");

    const s = loadSettingsPageInitialState(storage);
    expect(s.profile.firstName).toBe("Asha");
    expect(s.profile.lastName).toBe("Rao");
    expect(s.profile.email).toBe("a@test.com");
    expect(s.company.companyName).toBe("Mahi Solar");
    expect(s.company.companyState).toBe("27");
    expect(s.theme).toBe("light");
    expect(s.accent).toBe("green");
    expect(s.twoFAEnabled).toBe(true);
  });

  it("returns defaults when JSON is invalid or missing", () => {
    storage.setItem(SETTINGS_LS_KEYS.profile, "not-json");
    const s = loadSettingsPageInitialState(storage);
    expect(s.profile.firstName).toBe("");
    expect(s.company.industry).toBe("construction");
    expect(s.theme).toBe("dark");
  });

  it("save helpers write atomic JSON blobs", () => {
    saveSettingsProfile(
      { firstName: "J", lastName: "D", email: "j@d.com", phone: "9", role: "admin" },
      storage,
    );
    saveSettingsCompany(
      {
        companyName: "Co",
        gstNumber: "G",
        panNumber: "P",
        address: "Addr",
        website: "W",
        industry: "solar",
        companyState: "08",
      },
      storage,
    );
    const s = loadSettingsPageInitialState(storage);
    expect(s.profile.firstName).toBe("J");
    expect(s.company.companyName).toBe("Co");
  });
});
