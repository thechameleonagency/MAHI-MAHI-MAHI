import { describe, expect, it } from "vitest";
import { DEMO_LOGIN_USERS, DEMO_PASSWORD, findDemoUserByEmail } from "@/domain/demoCredentials";
import { validateLoginPassword } from "@/lib/sessionActorStorage";

describe("demo login credentials", () => {
  it("has one user per core role plus multiple installation team", () => {
    expect(DEMO_LOGIN_USERS.find((u) => u.role === "super_admin")).toBeDefined();
    expect(DEMO_LOGIN_USERS.find((u) => u.role === "admin")).toBeDefined();
    expect(DEMO_LOGIN_USERS.filter((u) => u.role === "installation_team").length).toBeGreaterThanOrEqual(4);
  });

  it("validates shared demo password", () => {
    const user = findDemoUserByEmail("rajesh.kulkarni@mss.solar");
    expect(user?.memberId).toBe("SA-001");
    expect(validateLoginPassword(user!.email, DEMO_PASSWORD, DEMO_PASSWORD)).toBe(true);
  });
});
