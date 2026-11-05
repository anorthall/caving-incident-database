import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IncidentGeo, IncidentFilters } from "@/lib/api";
import MapPage from "@/pages/MapPage";

const getIncidentGeo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ getIncidentGeo, getFacets: vi.fn().mockResolvedValue(null) }));

vi.mock("@/features/map/IncidentMap", () => ({
  default: ({ points }: { points: { id: number; title: string }[] }) => (
    <ul data-testid="map">
      {points.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  ),
}));

vi.mock("@/features/search/FilterSidebar", () => ({ FilterSidebar: () => null }));
vi.mock("@/features/search/FilterSheet", () => ({ FilterSheet: () => null }));
vi.mock("@/features/search/ActiveFilterChips", () => ({ ActiveFilterChips: () => null }));

const geo: IncidentGeo = {
  points: [{ id: 1, title: "Flood", latitude: 10, longitude: 20, year: 1990 }],
  total: 1,
  without_location: 3,
};

function renderPage(route = "/map") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("MapPage", () => {
  beforeEach(() => {
    getIncidentGeo.mockReset();
    getIncidentGeo.mockResolvedValue(geo);
  });

  it("shows points and the count without coordinates", async () => {
    renderPage();
    expect(await screen.findByText("Flood")).toBeInTheDocument();
    expect(screen.getByText("1 on map")).toBeInTheDocument();
    expect(screen.getByText("3 without coordinates")).toBeInTheDocument();
  });

  it("passes URL filters to the geo query", async () => {
    renderPage("/map?tags=Rope&year_from=1990");
    await screen.findByText("Flood");
    const filters = getIncidentGeo.mock.calls[0][0] as IncidentFilters;
    expect(filters.tags).toEqual(["Rope"]);
    expect(filters.year_from).toBe(1990);
  });

  it("hides the missing-coordinates note when all are located", async () => {
    getIncidentGeo.mockResolvedValue({ ...geo, without_location: 0 });
    renderPage();
    await screen.findByText("Flood");
    expect(screen.queryByText(/without coordinates/)).not.toBeInTheDocument();
  });
});
