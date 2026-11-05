import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatsPage } from "@/pages/StatsPage";

import { EMPTY_FILTERS } from "@/features/search/filters";

import { STATS_CHARTS } from "../stats-config";

const getStats = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ getStats }));

function renderPage(path: string) {
  const router = createMemoryRouter([{ path: "/stats", element: <StatsPage /> }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("StatsPage", () => {
  beforeEach(() => {
    getStats.mockReset();
  });

  it("requests every chart with the URL filters", async () => {
    getStats.mockResolvedValue([{ label: "1990", count: 3 }]);
    renderPage("/stats?tags=Rope&year_from=1990");
    await waitFor(() => expect(screen.getAllByTestId(/^stats-/)).toHaveLength(STATS_CHARTS.length));
    const groups = getStats.mock.calls.map((call) => call[0]);
    expect(groups.sort()).toEqual(STATS_CHARTS.map((c) => c.groupBy).sort());
    expect(getStats.mock.calls[0][1]).toMatchObject({ tags: ["Rope"], year_from: 1990 });
    expect(screen.getByRole("link", { name: "View matching incidents" })).toBeInTheDocument();
  });

  it("shows an empty message when there is no data", async () => {
    getStats.mockResolvedValue([]);
    renderPage("/stats");
    await waitFor(() =>
      expect(screen.getAllByText("No data recorded yet.")).toHaveLength(STATS_CHARTS.length)
    );
  });

  it("mentions the filters when filtered data is empty", async () => {
    getStats.mockResolvedValue([]);
    renderPage("/stats?tags=Rope");
    await waitFor(() =>
      expect(screen.getAllByText("No data for the current filters.")).toHaveLength(
        STATS_CHARTS.length
      )
    );
  });
});

describe("chart links", () => {
  const empty = EMPTY_FILTERS;

  it("links decades to a year range", () => {
    const href = STATS_CHARTS[0].href?.(empty, "1990");
    expect(href).toContain("year_from=1990");
    expect(href).toContain("year_to=1999");
  });

  it("links tags and states to filters", () => {
    expect(STATS_CHARTS[1].href?.(empty, "Rope")).toContain("tags=Rope");
    expect(STATS_CHARTS[2].href?.(empty, "Kentucky")).toContain("states=Kentucky");
  });

  it("has no link for injuries or ages", () => {
    expect(STATS_CHARTS[3].href).toBeUndefined();
    expect(STATS_CHARTS[4].href).toBeUndefined();
  });
});
