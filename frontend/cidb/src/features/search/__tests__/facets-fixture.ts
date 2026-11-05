import type { IncidentFacets } from "@/lib/api";

export const FACETS: IncidentFacets = {
  total: 120,
  countries: [
    { value: "United States", count: 110 },
    { value: "Mexico", count: 10 },
  ],
  states: [
    { value: "Tennessee", count: 60 },
    { value: "Kentucky", count: 40 },
    { value: "Texas", count: 10 },
  ],
  tags: [
    { value: "Flooding", count: 30 },
    { value: "Rope failure", count: 20 },
  ],
  decades: [
    { decade: 1980, count: 50 },
    { decade: 1990, count: 70 },
  ],
  year_min: 1941,
  year_max: 2019,
};
