import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import {
  DEMO_INVITE_PROTOTYPE_LABEL,
  findPendingInviteMember,
  SEED_DEMO_INVITE_TOKEN,
} from "@/lib/inviteAcceptPrototype";

describe("inviteAcceptPrototype (MN4)", () => {
  it("finds seeded pending invite by token", () => {
    const { state } = buildBusinessSeed("smoke");
    const member = findPendingInviteMember(state.settingsTeamMembers, SEED_DEMO_INVITE_TOKEN);
    expect(member?.email).toBe("pending.invite@mss.solar");
    expect(member?.status).toBe("Pending");
  });

  it("returns undefined for unknown tokens", () => {
    const { state } = buildBusinessSeed("smoke");
    expect(findPendingInviteMember(state.settingsTeamMembers, "not-a-real-token")).toBeUndefined();
    expect(findPendingInviteMember(state.settingsTeamMembers, "")).toBeUndefined();
  });

  it("InviteAccept page labels the flow as a demo prototype", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/pages/InviteAccept.tsx"),
      "utf8",
    );
    expect(src).toContain("InvitePrototypeNotice");
    expect(src).toContain("variant=\"invalid\"");
  });

  it("InvitePrototypeNotice shows the audit demo label", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/auth/InvitePrototypeNotice.tsx"),
      "utf8",
    );
    expect(src).toContain("DEMO_INVITE_PROTOTYPE_LABEL");
    expect(src).toContain("SEED_DEMO_INVITE_TOKEN");
  });
});
