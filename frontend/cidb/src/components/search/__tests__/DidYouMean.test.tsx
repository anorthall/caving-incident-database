import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DidYouMean } from "@/components/search/DidYouMean";
import { renderWithProviders } from "@/features/search/__tests__/test-utils";
import { getDidYouMean } from "@/lib/api";

vi.mock("@/lib/api", () => ({ getDidYouMean: vi.fn() }));

describe("DidYouMean", () => {
  it("links to the suggested query", async () => {
    vi.mocked(getDidYouMean).mockResolvedValue({ suggestion: "cave rescue", similarity: 0.6 });
    renderWithProviders(<DidYouMean query="cave rescu" />);
    const link = await screen.findByRole("link", { name: "cave rescue" });
    expect(link).toHaveAttribute("href", expect.stringContaining("q=cave+rescue"));
  });

  it("preserves active filters and sort when replacing the query", async () => {
    vi.mocked(getDidYouMean).mockResolvedValue({ suggestion: "cave rescue", similarity: 0.6 });
    renderWithProviders(
      <DidYouMean query="cave rescu" />,
      "/?q=cave+rescu&countries=UK&tags=flood&year_from=2000&sort_by=title&sort_order=asc"
    );
    const link = await screen.findByRole("link", { name: "cave rescue" });
    const params = new URL(link.getAttribute("href") ?? "", "http://x").searchParams;
    expect(params.get("q")).toBe("cave rescue");
    expect(params.getAll("countries")).toEqual(["UK"]);
    expect(params.getAll("tags")).toEqual(["flood"]);
    expect(params.get("year_from")).toBe("2000");
    expect(params.get("sort_by")).toBe("title");
    expect(params.get("sort_order")).toBe("asc");
  });

  it("renders nothing without a suggestion", async () => {
    vi.mocked(getDidYouMean).mockResolvedValue({ suggestion: null, similarity: null });
    const { container } = renderWithProviders(<DidYouMean query="zzz" />);
    await vi.waitFor(() => expect(getDidYouMean).toHaveBeenCalled());
    expect(container.querySelector("p")).toBeNull();
  });
});
