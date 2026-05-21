import { describe, expect, it } from "vitest";
import { smokeRoutes } from "@/data/seed/seedLayerOrder";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { DEMO_LOGIN_USERS, DEMO_PASSWORD } from "@/domain/demoCredentials";
import { validateLoginPassword } from "@/lib/sessionActorStorage";

describe("manualSmokeFlows", () => {
  it("smoke routes list covers primary operational pages", () => {
    expect(smokeRoutes.length).toBeGreaterThanOrEqual(8);
    expect(smokeRoutes).toContain("/settings");
    expect(smokeRoutes).toContain("/notifications");
  });

  it("full seed supports super_admin demo login credentials", () => {
    const { state } = buildBusinessSeed("full");
    const superAdmin = DEMO_LOGIN_USERS.find((u) => u.role === "super_admin")!;
    const member = state.settingsTeamMembers.find((m) => m.id === superAdmin.memberId);
    expect(member?.status).toBe("Active");
    expect(validateLoginPassword(superAdmin.email, DEMO_PASSWORD, DEMO_PASSWORD)).toBe(true);
  });

  it("installation team has at least 3 active directory rows", () => {
    const { state } = buildBusinessSeed("full");
    const inst = state.settingsTeamMembers.filter(
      (m) => m.role === "installation_team" && m.status === "Active",
    );
    expect(inst.length).toBeGreaterThanOrEqual(3);
  });
});
