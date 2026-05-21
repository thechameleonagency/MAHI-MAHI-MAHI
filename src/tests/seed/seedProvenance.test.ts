import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";

describe("seedProvenance", () => {
  it("audit logs use seeded team member ids where applicable", () => {
    const { state } = buildBusinessSeed("full");
    const memberIds = new Set(state.settingsTeamMembers.map((m) => m.id));
    const demoIds = new Set(DEMO_LOGIN_USERS.map((u) => u.memberId));

    for (const log of state.auditLogs.slice(0, 50)) {
      if (log.userId.startsWith("actor-") || log.userId.startsWith("user-")) continue;
      expect(
        memberIds.has(log.userId) || demoIds.has(log.userId) || log.userId.startsWith("LOG"),
        `audit userId ${log.userId} should match roster`,
      ).toBe(true);
    }

    expect(state.auditLogs.some((l) => l.userId === "SA-001" || l.userId === "ADM-001")).toBe(true);
  });

  it("every demo login user exists in settingsTeamMembers after seed", () => {
    const { state, verification } = buildBusinessSeed("full");
    expect(verification.ok).toBe(true);
    for (const u of DEMO_LOGIN_USERS) {
      expect(state.settingsTeamMembers.some((m) => m.id === u.memberId && m.email === u.email)).toBe(true);
    }
  });
});
