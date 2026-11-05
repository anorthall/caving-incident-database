import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePageMeta } from "@/hooks/use-page-meta";

describe("usePageMeta", () => {
  it("sets title and description", () => {
    renderHook(() => usePageMeta("Privacy", "Our policy"));
    expect(document.title).toBe("Privacy | CIDB");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Our policy"
    );
  });

  it("falls back to the default title and reuses the meta tag", () => {
    const { rerender } = renderHook(({ t }) => usePageMeta(t, "d"), {
      initialProps: { t: "A" as string | null },
    });
    rerender({ t: null });
    expect(document.title).toBe("CIDB - Caving Incident DB");
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it("restores the previous title and description on unmount", () => {
    document.title = "Before";
    const tag = document.createElement("meta");
    tag.name = "description";
    tag.content = "Old";
    document.head.appendChild(tag);
    const { unmount } = renderHook(() => usePageMeta("X", "New"));
    expect(document.title).toBe("X | CIDB");
    unmount();
    expect(document.title).toBe("Before");
    expect(tag.content).toBe("Old");
    tag.remove();
  });
});
