import { describe, expect, it } from "vitest";
import { DEMO_DEFAULT_SESSION_ROLE, USER_ROLES } from "@/domain/entities/identity";

describe("demo session default role (Md1)", () => {
  it("defaults to salesperson — lowest-privilege pipeline role", () => {
    expect(DEMO_DEFAULT_SESSION_ROLE).toBe("salesperson");
    expect(USER_ROLES).toContain(DEMO_DEFAULT_SESSION_ROLE);
  });

  it("is not admin or super_admin", () => {
    expect(DEMO_DEFAULT_SESSION_ROLE).not.toBe("admin");
    expect(DEMO_DEFAULT_SESSION_ROLE).not.toBe("super_admin");
  });
});
