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

  it("renders nothing without a suggestion", async () => {
    vi.mocked(getDidYouMean).mockResolvedValue({ suggestion: null, similarity: null });
    const { container } = renderWithProviders(<DidYouMean query="zzz" />);
    await vi.waitFor(() => expect(getDidYouMean).toHaveBeenCalled());
    expect(container.querySelector("p")).toBeNull();
  });
});
