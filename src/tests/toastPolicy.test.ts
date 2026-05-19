import { describe, expect, it } from "vitest";
import { getToastDurationMs, TOAST_DURATION_MS } from "@/lib/toastPolicy";

describe("toastPolicy", () => {
  it("uses 4s for default toasts and 8s for destructive", () => {
    expect(getToastDurationMs()).toBe(TOAST_DURATION_MS.default);
    expect(getToastDurationMs("default")).toBe(4_000);
    expect(getToastDurationMs("destructive")).toBe(8_000);
  });
});
