import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRelatedIncidents, type IncidentListItem } from "@/lib/api";

import { RelatedIncidents } from "../RelatedIncidents";

vi.mock("@/lib/api", () => ({ getRelatedIncidents: vi.fn() }));

const getRelatedMock = vi.mocked(getRelatedIncidents);

const INCIDENT: IncidentListItem = {
  id: 9,
  title: "Rope failure",
  date: null,
  cave_name: "Alpha Cave",
  location_summary: "",
  summary: "",
  tags: [{ id: 1, name: "Rope" }],
  view_count: 1200,
  relevance_score: null,
};

function renderRelated() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RelatedIncidents incidentId={1} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getRelatedMock.mockReset();
});

describe("RelatedIncidents", () => {
  it("renders related incidents as rows linking to the incident", async () => {
    getRelatedMock.mockResolvedValue([INCIDENT]);
    renderRelated();
    expect(await screen.findByRole("heading", { name: "Related incidents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rope failure/ })).toHaveAttribute(
      "href",
      "/incidents/9"
    );
    expect(screen.getByText("Alpha Cave")).toBeInTheDocument();
  });

  it("renders nothing when there are none", async () => {
    getRelatedMock.mockResolvedValue([]);
    const { container } = renderRelated();
    await vi.waitFor(() => expect(getRelatedMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
