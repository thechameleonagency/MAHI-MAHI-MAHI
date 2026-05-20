import { describe, expect, it } from "vitest";
import {
  clampSidebarDragOffset,
  shouldCloseSidebarOnSwipeEnd,
  sidebarBackdropOpacity,
  MOBILE_SIDEBAR_WIDTH_PX,
} from "@/lib/mobileSidebarSwipe";

describe("mobileSidebarSwipe (Md3)", () => {
  it("clamps drag offset to [-width, 0]", () => {
    expect(clampSidebarDragOffset(-400, 0)).toBe(-MOBILE_SIDEBAR_WIDTH_PX);
    expect(clampSidebarDragOffset(50, -100)).toBe(-50);
    expect(clampSidebarDragOffset(-80, -100)).toBe(-180);
  });

  it("closes when dragged past 50% width", () => {
    expect(shouldCloseSidebarOnSwipeEnd(-MOBILE_SIDEBAR_WIDTH_PX * 0.5)).toBe(true);
    expect(shouldCloseSidebarOnSwipeEnd(-MOBILE_SIDEBAR_WIDTH_PX * 0.49)).toBe(false);
    expect(shouldCloseSidebarOnSwipeEnd(0)).toBe(false);
  });

  it("backdrop opacity tracks drag progress", () => {
    expect(sidebarBackdropOpacity(0)).toBe(0.5);
    expect(sidebarBackdropOpacity(-MOBILE_SIDEBAR_WIDTH_PX)).toBe(0);
  });
});
