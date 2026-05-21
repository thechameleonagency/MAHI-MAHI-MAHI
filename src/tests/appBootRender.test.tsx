import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import App from "@/App";
import { clearAuthenticatedSession, persistAuthenticatedSession } from "@/lib/sessionActorStorage";

describe("appBootRender", () => {
  const errors: unknown[] = [];

  beforeEach(() => {
    errors.length = 0;
    persistAuthenticatedSession({
      memberId: "SA-001",
      email: "rajesh.kulkarni@mss.solar",
      role: "super_admin",
      displayName: "Rajesh Kulkarni",
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });
  });

  afterEach(() => {
    clearAuthenticatedSession();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("mounts without uncaught render errors", async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector("main")).toBeTruthy(), { timeout: 8000 });

    const messages = errors
      .flat()
      .map((x) => (x instanceof Error ? x.message : String(x)))
      .join("\n");
    expect(messages, `console.error during mount:\n${messages}`).not.toMatch(
      /ReferenceError|SyntaxError|is not defined|already been declared|Cannot read properties of undefined/i,
    );
  });
});
