/** Mobile drawer width — matches `w-64` / `min-w-[256px]` on Sidebar. */
export const MOBILE_SIDEBAR_WIDTH_PX = 256;

export const MOBILE_SIDEBAR_CLOSE_THRESHOLD = 0.5;

export function clampSidebarDragOffset(
  deltaFromStart: number,
  startOffset: number,
  width = MOBILE_SIDEBAR_WIDTH_PX,
): number {
  return Math.min(0, Math.max(-width, startOffset + deltaFromStart));
}

/** Close when dragged left past 50% of sidebar width. */
export function shouldCloseSidebarOnSwipeEnd(
  dragOffsetPx: number,
  width = MOBILE_SIDEBAR_WIDTH_PX,
): boolean {
  return dragOffsetPx <= -width * MOBILE_SIDEBAR_CLOSE_THRESHOLD;
}

export function sidebarBackdropOpacity(
  dragOffsetPx: number,
  width = MOBILE_SIDEBAR_WIDTH_PX,
): number {
  return 0.5 * (1 + dragOffsetPx / width);
}

export function isMobileSidebarViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}
