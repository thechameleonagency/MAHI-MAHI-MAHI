import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSessionUserId,
  loadStoredDemoUserName,
  loadStoredSessionRole,
  persistDemoUserName,
  persistSessionRole,
  SESSION_ROLE_STORAGE_KEY,
  SESSION_USER_NAME_STORAGE_KEY,
} from "@/lib/sessionActorStorage";

describe("sessionActorStorage (Md2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("buildSessionUserId uses slugged demo name when set", () => {
    expect(buildSessionUserId("Jitesh K.", "admin")).toBe("user-jitesh-k");
    expect(buildSessionUserId("  ", "salesperson")).toBe("actor-salesperson");
  });

  it("persists and reloads role and demo user name", () => {
    persistSessionRole("management");
    persistDemoUserName("Demo Admin Two");
    expect(loadStoredSessionRole()).toBe("management");
    expect(loadStoredDemoUserName()).toBe("Demo Admin Two");
    expect(buildSessionUserId(loadStoredDemoUserName(), loadStoredSessionRole())).toBe(
      "user-demo-admin-two",
    );
  });

  it("clears stored name when empty", () => {
    persistDemoUserName("Alice");
    persistDemoUserName("");
    expect(localStorage.getItem(SESSION_USER_NAME_STORAGE_KEY)).toBeNull();
    expect(loadStoredDemoUserName()).toBe("");
  });

  it("uses default salesperson role when storage empty", () => {
    expect(loadStoredSessionRole()).toBe("salesperson");
    expect(localStorage.getItem(SESSION_ROLE_STORAGE_KEY)).toBeNull();
  });
});
