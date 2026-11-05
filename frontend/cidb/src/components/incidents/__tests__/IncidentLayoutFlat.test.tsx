import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { IncidentDetail } from "@/lib/api";

import { IncidentLayoutFlat } from "../IncidentLayoutFlat";

const incident: IncidentDetail = {
  id: 1,
  title: "Flooded cave",
  date: null,
  time: null,
  cave: {
    id: 1,
    name: "Big Cave",
    location: {
      id: 1,
      country: "United States",
      state: "New Mexico",
      region: "Eddy County",
      latitude: null,
      longitude: null,
    },
  },
  report: "",
  analysis: "",
  summary: "",
  tags: [
    { id: 1, name: "Flooding" },
    { id: 2, name: "Rope & anchor" },
  ],
  origin_publication: null,
  references: [],
  people: [{ age_at_incident: 31, injuries: ["Broken leg"] }],
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderIncident(value: IncidentDetail) {
  return render(
    <MemoryRouter>
      <IncidentLayoutFlat incident={value} />
    </MemoryRouter>
  );
}

describe("IncidentLayoutFlat pivots", () => {
  it("links state, country and tags to filtered search", () => {
    renderIncident(incident);
    expect(screen.getByRole("link", { name: "New Mexico" })).toHaveAttribute(
      "href",
      "/?states=New+Mexico"
    );
    expect(screen.getByRole("link", { name: "United States" })).toHaveAttribute(
      "href",
      "/?countries=United+States"
    );
    expect(screen.getByRole("link", { name: "Flooding" })).toHaveAttribute(
      "href",
      "/?tags=Flooding"
    );
    expect(screen.getByRole("link", { name: "Rope & anchor" })).toHaveAttribute(
      "href",
      "/?tags=Rope+%26+anchor"
    );
  });

  it("keeps region as plain text and joins parts with commas", () => {
    renderIncident(incident);
    expect(screen.queryByRole("link", { name: "Eddy County" })).not.toBeInTheDocument();
    expect(screen.getByText(/Eddy County,/).textContent).toBe(
      "Eddy County, New Mexico, United States"
    );
  });

  it("omits missing location parts", () => {
    renderIncident({
      ...incident,
      cave: {
        ...incident.cave!,
        location: { ...incident.cave!.location!, state: "", region: "" },
      },
    });
    expect(screen.queryByRole("link", { name: "New Mexico" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "United States" })).toBeInTheDocument();
  });
});
