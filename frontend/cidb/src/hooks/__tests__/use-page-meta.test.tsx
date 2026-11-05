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
});
