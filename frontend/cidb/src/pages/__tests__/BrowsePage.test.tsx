import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBrowseValues } from "@/lib/api";

import { BrowsePage } from "../BrowsePage";

vi.mock("@/lib/api", () => ({ getBrowseValues: vi.fn() }));

const getBrowseValuesMock = vi.mocked(getBrowseValues);

function renderAt(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/browse/:dimension" element={<BrowsePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getBrowseValuesMock.mockReset();
});

describe("BrowsePage", () => {
  it("lists dimensions on the index and sets the title", () => {
    renderAt("/browse");
    expect(screen.getByRole("link", { name: /By tag/ })).toHaveAttribute("href", "/browse/tag");
    expect(document.title).toBe("Browse | Caving Incident Database");
  });

  it("lists values with counts linking to filtered search", async () => {
    getBrowseValuesMock.mockResolvedValue([
      { value: "Tennessee", count: 3, id: null },
      { value: "Kentucky", count: 2, id: null },
    ]);
    renderAt("/browse/state");
    expect(await screen.findByRole("link", { name: /Tennessee/ })).toHaveAttribute(
      "href",
      "/?states=Tennessee"
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/browse");
    expect(document.title).toBe("Browse by state | Caving Incident Database");
  });

  it("filters the list by typed text", async () => {
    getBrowseValuesMock.mockResolvedValue([
      { value: "Tennessee", count: 3, id: null },
      { value: "Kentucky", count: 2, id: null },
    ]);
    renderAt("/browse/state");
    await userEvent.type(await screen.findByLabelText("Filter list"), "kent");
    expect(screen.queryByText("Tennessee")).not.toBeInTheDocument();
    expect(screen.getByText("Kentucky")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Filter list"), "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("links decades to year ranges and caves to name search", async () => {
    getBrowseValuesMock.mockResolvedValue([{ value: "1990", count: 4, id: null }]);
    const { unmount } = renderAt("/browse/decade");
    expect(await screen.findByRole("link", { name: /1990s/ })).toHaveAttribute(
      "href",
      "/?year_from=1990&year_to=1999"
    );
    unmount();
    getBrowseValuesMock.mockResolvedValue([{ value: "Alpha Cave", count: 4, id: 7 }]);
    renderAt("/browse/cave");
    expect(await screen.findByRole("link", { name: /Alpha Cave/ })).toHaveAttribute(
      "href",
      "/?q=Alpha+Cave"
    );
  });

  it("shows an error when loading fails", async () => {
    getBrowseValuesMock.mockRejectedValue(new Error("boom"));
    renderAt("/browse/tag");
    expect(await screen.findByText("Failed to load values")).toBeInTheDocument();
  });
});
