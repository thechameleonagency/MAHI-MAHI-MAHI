import { describe, expect, it } from "vitest";
import {
  SETTINGS_PASSWORD_CURRENT_HELP,
  validateSettingsPasswordUpdate,
} from "@/lib/settingsPasswordUpdate";

describe("validateSettingsPasswordUpdate", () => {
  it("requires non-empty current password", () => {
    const r = validateSettingsPasswordUpdate({
      currentPassword: "   ",
      newPassword: "secret12",
      confirmPassword: "secret12",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.title).toMatch(/current password/i);
  });

  it("rejects mismatch and short passwords after current is provided", () => {
    expect(
      validateSettingsPasswordUpdate({
        currentPassword: "old",
        newPassword: "abc",
        confirmPassword: "abc",
      }).ok,
    ).toBe(false);
    expect(
      validateSettingsPasswordUpdate({
        currentPassword: "old",
        newPassword: "newpass",
        confirmPassword: "other",
      }).ok,
    ).toBe(false);
  });

  it("accepts valid fields when current password is present", () => {
    expect(
      validateSettingsPasswordUpdate({
        currentPassword: "old",
        newPassword: "newpass",
        confirmPassword: "newpass",
      }).ok,
    ).toBe(true);
  });

  it("documents prototype limitation in help copy", () => {
    expect(SETTINGS_PASSWORD_CURRENT_HELP).toMatch(/not checked against a server/i);
  });
});
