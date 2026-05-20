import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  PageHeaderStickyProvider,
  usePageHeaderSticky,
} from "@/contexts/PageHeaderStickyContext";

function wrapper({ children }: { children: ReactNode }) {
  return <PageHeaderStickyProvider>{children}</PageHeaderStickyProvider>;
}

describe("PageHeaderStickyContext pinnable registration", () => {
  it("starts without a pinnable page header", () => {
    const { result } = renderHook(() => usePageHeaderSticky(), { wrapper });
    expect(result.current.hasPinnablePageHeader).toBe(false);
  });

  it("sets hasPinnablePageHeader while a sticky surface is registered", () => {
    const { result } = renderHook(() => usePageHeaderSticky(), { wrapper });
    let cleanup: (() => void) | undefined;

    act(() => {
      cleanup = result.current.registerPinnablePageHeader();
    });
    expect(result.current.hasPinnablePageHeader).toBe(true);

    act(() => {
      cleanup?.();
    });
    expect(result.current.hasPinnablePageHeader).toBe(false);
  });

  it("supports nested register/unregister without dropping below zero", () => {
    const { result } = renderHook(() => usePageHeaderSticky(), { wrapper });
    let cleanupA: (() => void) | undefined;
    let cleanupB: (() => void) | undefined;

    act(() => {
      cleanupA = result.current.registerPinnablePageHeader();
      cleanupB = result.current.registerPinnablePageHeader();
    });
    expect(result.current.hasPinnablePageHeader).toBe(true);

    act(() => {
      cleanupA?.();
    });
    expect(result.current.hasPinnablePageHeader).toBe(true);

    act(() => {
      cleanupB?.();
    });
    expect(result.current.hasPinnablePageHeader).toBe(false);
  });
});
