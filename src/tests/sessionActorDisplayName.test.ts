import { describe, expect, it } from "vitest";
import { resolveSessionActorDisplayName } from "@/lib/sessionActorDisplayName";

describe("resolveSessionActorDisplayName", () => {
  it("prefers demo user name when set", () => {
    expect(
      resolveSessionActorDisplayName({
        demoUserName: "Priya Sharma",
        sessionUserId: "user-priya",
        role: "salesperson",
      }),
    ).toBe("Priya Sharma");
  });

  it("falls back to team member name then role label", () => {
    expect(
      resolveSessionActorDisplayName({
        demoUserName: "",
        sessionUserId: "tm-1",
        role: "admin",
        teamMembers: [{ id: "tm-1", name: "Karthik Rao" }],
      }),
    ).toBe("Karthik Rao");

    expect(
      resolveSessionActorDisplayName({
        demoUserName: "  ",
        sessionUserId: "unknown",
        role: "management",
        teamMembers: [],
      }),
    ).toBe("Management");
  });
});
