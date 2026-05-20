import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampSidebarDragOffset,
  isMobileSidebarViewport,
  shouldCloseSidebarOnSwipeEnd,
  sidebarBackdropOpacity,
} from "@/lib/mobileSidebarSwipe";

export function useMobileSidebarSwipe(mobileOpen: boolean, onClose: () => void) {
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef(0);
  const gestureRef = useRef({ startX: 0, startY: 0, startOffset: 0 });

  dragOffsetRef.current = dragOffsetPx;

  useEffect(() => {
    if (!mobileOpen) {
      setDragOffsetPx(0);
      setIsDragging(false);
    }
  }, [mobileOpen]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!mobileOpen || !isMobileSidebarViewport()) return;
      const touch = e.touches[0];
      if (!touch) return;
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startOffset: dragOffsetRef.current,
      };
      setIsDragging(true);
    },
    [mobileOpen],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !mobileOpen) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - gestureRef.current.startX;
      const deltaY = touch.clientY - gestureRef.current.startY;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        e.preventDefault();
      }
      setDragOffsetPx(clampSidebarDragOffset(deltaX, gestureRef.current.startOffset));
    },
    [isDragging, mobileOpen],
  );

  const finishGesture = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (shouldCloseSidebarOnSwipeEnd(dragOffsetRef.current)) {
      onClose();
    }
    setDragOffsetPx(0);
  }, [isDragging, onClose]);

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: finishGesture,
    onTouchCancel: finishGesture,
  };

  return {
    dragOffsetPx,
    isDragging,
    backdropOpacity: mobileOpen ? sidebarBackdropOpacity(dragOffsetPx) : 0,
    touchHandlers,
  };
}
