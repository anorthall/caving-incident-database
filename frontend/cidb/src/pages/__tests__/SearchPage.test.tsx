import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VIEW_MODE_STORAGE_KEY } from "@/constants.ts";
import type { IncidentListItem, PaginatedResponse, SearchParams } from "@/lib/api";
import { SearchPage } from "@/pages/SearchPage";

const searchIncidents = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  searchIncidents,
  trackSearchClick: vi.fn(),
  exportUrl: vi.fn(() => "/export"),
}));

vi.mock("@/hooks/use-staff-commands", () => ({
  useStaffCommands: () => ({ handleStaffCommand: vi.fn().mockResolvedValue(false) }),
}));

function response(title: string): PaginatedResponse<IncidentListItem> {
  return {
    items: [
      {
        id: 1,
        title,
        date: null,
        cave_name: "Cave",
        location_summary: "",
        summary: "",
        tags: [],
        view_count: 0,
        relevance_score: null,
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: "/", element: <SearchPage /> }], {
    initialEntries: [path],
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

beforeEach(() => {
  localStorage.clear();
  searchIncidents.mockReset();
  searchIncidents.mockImplementation(async (params: SearchParams) =>
    response(params.q ? `Result for ${params.q}` : "count")
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SearchPage", () => {
  it("resets the input when the URL query is cleared", async () => {
    const router = renderAt("/?q=rope");
    await screen.findByText("Result for rope");

    await act(() => router.navigate("/"));

    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("measures the time of every new search", async () => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, "table");
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(100);
    const router = renderAt("/?q=rope");

    now.mockReturnValue(150);
    await screen.findByText("Result for rope");
    expect(await screen.findByText("(50ms)")).toBeInTheDocument();

    now.mockReturnValue(1000);
    await act(() => router.navigate("/?q=flood"));
    now.mockReturnValue(1300);
    await screen.findByText("Result for flood");
    expect(await screen.findByText("(300ms)")).toBeInTheDocument();
  });

  it("shuffles the example queries once per mount", () => {
    const random = vi.spyOn(Math, "random");
    renderAt("/");
    const callsAfterMount = random.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "rope" } });

    expect(random.mock.calls.length).toBe(callsAfterMount);
  });
});
