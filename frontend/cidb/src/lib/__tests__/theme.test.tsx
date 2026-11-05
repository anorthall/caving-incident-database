import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { installMatchMedia } from "@/test/match-media";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function hasDarkClass() {
  return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("defaults to dark when no theme is stored", () => {
    installMatchMedia({ [DARK_QUERY]: false });
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
    expect(result.current.isDarkMode).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it("ignores the system preference for an explicit theme", () => {
    localStorage.setItem("theme", "light");
    const media = installMatchMedia({ [DARK_QUERY]: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
    expect(hasDarkClass()).toBe(false);

    act(() => media.setMatches(DARK_QUERY, false));
    act(() => media.setMatches(DARK_QUERY, true));
    expect(result.current.isDarkMode).toBe(false);
    expect(hasDarkClass()).toBe(false);
  });

  it("follows the system preference in system mode", () => {
    localStorage.setItem("theme", "system");
    const media = installMatchMedia({ [DARK_QUERY]: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDarkMode).toBe(true);
    expect(hasDarkClass()).toBe(true);

    act(() => media.setMatches(DARK_QUERY, false));
    expect(result.current.isDarkMode).toBe(false);
    expect(hasDarkClass()).toBe(false);
  });

  it("re-derives isDarkMode and persists when the theme changes", () => {
    const media = installMatchMedia({ [DARK_QUERY]: false });
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("light"));
    expect(result.current.isDarkMode).toBe(false);
    expect(hasDarkClass()).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");

    act(() => media.setMatches(DARK_QUERY, true));
    act(() => result.current.setTheme("system"));
    expect(result.current.isDarkMode).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it("cycles from the effective mode to its opposite", () => {
    localStorage.setItem("theme", "system");
    installMatchMedia({ [DARK_QUERY]: true });
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("light");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("dark");
  });
});
