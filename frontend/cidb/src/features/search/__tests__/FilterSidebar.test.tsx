import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacets } from "@/lib/api";

import { FilterSidebar } from "../FilterSidebar";
import { FACETS } from "./facets-fixture";
import { renderWithProviders } from "./test-utils";

vi.mock("@/lib/api", () => ({ getFacets: vi.fn() }));

const getFacetsMock = vi.mocked(getFacets);

beforeEach(() => {
  getFacetsMock.mockReset();
  getFacetsMock.mockResolvedValue(FACETS);
});

const location = () => screen.getByTestId("location").textContent;

describe("FilterSidebar", () => {
  it("shows a skeleton while loading", () => {
    getFacetsMock.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithProviders(<FilterSidebar />);
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("shows an error message when facets fail", async () => {
    getFacetsMock.mockRejectedValue(new Error("boom"));
    renderWithProviders(<FilterSidebar />);
    expect(await screen.findByText("Failed to load filters")).toBeInTheDocument();
  });

  it("renders groups with counts in order", async () => {
    renderWithProviders(<FilterSidebar />);
    const groups = await screen.findAllByRole("group");
    expect(groups.map((g) => g.querySelector("h3")?.textContent)).toEqual([
      "Tag",
      "State",
      "Injury",
      "Cave",
      "Country",
      "Year",
    ]);
    expect(screen.getByRole("button", { name: /Flooding/ })).toHaveTextContent("30");
    expect(screen.getByLabelText("From")).toHaveAttribute("placeholder", "1941");
    expect(screen.getByLabelText("To")).toHaveAttribute("placeholder", "2019");
  });

  it("toggles a value into the URL", async () => {
    renderWithProviders(<FilterSidebar />);
    await userEvent.click(await screen.findByRole("button", { name: /Tennessee/ }));
    expect(location()).toBe("/?states=Tennessee");
    expect(screen.getByRole("button", { name: /Tennessee/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows a selected value that has a zero count", async () => {
    getFacetsMock.mockResolvedValue({
      ...FACETS,
      tags: [...FACETS.tags, { value: "Hypothermia", count: 0 }],
    });
    renderWithProviders(<FilterSidebar />, "/?tags=Hypothermia");
    const toggle = await screen.findByRole("button", { name: /Hypothermia/ });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("0");
  });

  it("collapses long groups behind Show all", async () => {
    const tags = Array.from({ length: 10 }, (_, i) => ({ value: `Tag ${i}`, count: 10 - i }));
    getFacetsMock.mockResolvedValue({ ...FACETS, tags });
    renderWithProviders(<FilterSidebar />);
    await screen.findByRole("button", { name: /Tag 0/ });
    expect(screen.queryByRole("button", { name: /Tag 9/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all (10)" }));
    expect(screen.getByRole("button", { name: /Tag 9/ })).toBeInTheDocument();
  });

  it("hides groups with a single value and no selection", async () => {
    getFacetsMock.mockResolvedValue({
      ...FACETS,
      countries: [{ value: "United States", count: 120 }],
    });
    renderWithProviders(<FilterSidebar />);
    await screen.findByRole("button", { name: /Flooding/ });
    expect(screen.queryByText("Country")).not.toBeInTheDocument();
  });

  it("keeps a single-value group when it is selected", async () => {
    getFacetsMock.mockResolvedValue({
      ...FACETS,
      countries: [{ value: "United States", count: 120 }],
    });
    renderWithProviders(<FilterSidebar />, "/?countries=United+States");
    expect(await screen.findByText("Country")).toBeInTheDocument();
  });

  it("commits years on blur and on Enter", async () => {
    renderWithProviders(<FilterSidebar />);
    const from = await screen.findByLabelText("From");
    await userEvent.type(from, "1990");
    await userEvent.tab();
    await waitFor(() => expect(location()).toBe("/?year_from=1990"));

    await userEvent.type(screen.getByLabelText("To"), "1999{Enter}");
    await waitFor(() => expect(location()).toBe("/?year_from=1990&year_to=1999"));
  });

  it("ignores invalid year input", async () => {
    renderWithProviders(<FilterSidebar />);
    await userEvent.type(await screen.findByLabelText("From"), "0{Enter}");
    expect(location()).toBe("/");
    expect(screen.getByLabelText("From")).toHaveValue("");
  });
});
