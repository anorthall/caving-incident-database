import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacets } from "@/lib/api";

import { BrowseEntryPoints } from "../BrowseEntryPoints";
import { FACETS } from "./facets-fixture";
import { renderWithProviders } from "./test-utils";

vi.mock("@/lib/api", () => ({ getFacets: vi.fn() }));

const getFacetsMock = vi.mocked(getFacets);

beforeEach(() => {
  getFacetsMock.mockReset();
});

describe("BrowseEntryPoints", () => {
  it("links to pre-filtered searches", async () => {
    getFacetsMock.mockResolvedValue({
      ...FACETS,
      tags: [{ value: "Bad air", count: 5 }],
    });
    renderWithProviders(<BrowseEntryPoints />);

    expect(await screen.findByRole("link", { name: /1990s/ })).toHaveAttribute(
      "href",
      "/?year_from=1990&year_to=1999"
    );
    expect(screen.getByRole("link", { name: /Tennessee/ })).toHaveAttribute(
      "href",
      "/?states=Tennessee"
    );
    expect(screen.getByRole("link", { name: /Bad air/ })).toHaveAttribute("href", "/?tags=Bad+air");
    expect(screen.getByText("Browse by decade")).toBeInTheDocument();
    expect(screen.getByText("Browse by state")).toBeInTheDocument();
    expect(screen.getByText("Browse by tag")).toBeInTheDocument();
  });

  it("limits states and tags to 12", async () => {
    const states = Array.from({ length: 15 }, (_, i) => ({ value: `State ${i}`, count: 1 }));
    getFacetsMock.mockResolvedValue({ ...FACETS, states });
    renderWithProviders(<BrowseEntryPoints />);
    await screen.findByRole("link", { name: /State 0/ });
    expect(screen.getAllByRole("link", { name: /State \d+/ })).toHaveLength(12);
  });

  it("renders nothing while loading", () => {
    getFacetsMock.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<BrowseEntryPoints />);
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("renders nothing on error", async () => {
    getFacetsMock.mockRejectedValue(new Error("boom"));
    const { container } = renderWithProviders(<BrowseEntryPoints />);
    await vi.waitFor(() => expect(getFacetsMock).toHaveBeenCalled());
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });
});
