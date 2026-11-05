import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOBILE_BREAKPOINT } from "@/constants.ts";
import { useIsMobile } from "@/hooks/use-mobile";
import { installMatchMedia } from "@/test/match-media";

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("returns true below the breakpoint", () => {
    installMatchMedia();
    setWidth(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false at the breakpoint", () => {
    installMatchMedia();
    setWidth(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const media = installMatchMedia();
    setWidth(MOBILE_BREAKPOINT + 200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWidth(MOBILE_BREAKPOINT - 100);
      media.setMatches(QUERY, true);
    });
    expect(result.current).toBe(true);

    act(() => {
      setWidth(MOBILE_BREAKPOINT + 1);
      media.setMatches(QUERY, false);
    });
    expect(result.current).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const media = installMatchMedia();
    setWidth(MOBILE_BREAKPOINT);
    const { unmount } = renderHook(() => useIsMobile());
    expect(media.listenerCount(QUERY)).toBe(1);
    unmount();
    expect(media.listenerCount(QUERY)).toBe(0);
  });
});
