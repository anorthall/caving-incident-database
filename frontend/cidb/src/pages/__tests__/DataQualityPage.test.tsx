import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataQualityPage } from "@/pages/DataQualityPage";

const getDataQuality = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ getDataQuality }));
vi.mock("@/lib/auth-context", () => ({ useAuth }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/staff/data-quality"]}>
        <DataQualityPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DataQualityPage", () => {
  beforeEach(() => {
    getDataQuality.mockReset();
    useAuth.mockReturnValue({
      user: { is_staff: true, is_editor: false },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("renders checks with counts and sample links", async () => {
    getDataQuality.mockResolvedValue([
      {
        key: "missing_dates",
        title: "Missing dates",
        description: "Incidents with an empty date.",
        count: 2,
        samples: [{ kind: "incident", id: 7, label: "Bad incident" }],
      },
      {
        key: "duplicate_cave_names",
        title: "Duplicate cave names",
        description: "Dupes",
        count: 0,
        samples: [],
      },
    ]);
    renderPage();
    const link = await screen.findByRole("link", { name: "Bad incident" });
    expect(link.getAttribute("href")).toBe("/incidents/7");
    expect(screen.getByText("Missing dates")).toBeTruthy();
    expect(screen.getByText("None")).toBeTruthy();
  });

  it("shows an error", async () => {
    getDataQuality.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText(/boom/)).toBeTruthy();
  });

  it("redirects non staff", () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false });
    renderPage();
    expect(getDataQuality).not.toHaveBeenCalled();
  });
});
