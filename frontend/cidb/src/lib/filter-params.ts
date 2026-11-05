import type { IncidentFilters } from "./api";

export function appendFilterParams(params: URLSearchParams, filters: Partial<IncidentFilters>) {
  if (filters.q) params.set("q", filters.q);
  for (const tag of filters.tags ?? []) params.append("tags", tag);
  for (const state of filters.states ?? []) params.append("states", state);
  for (const country of filters.countries ?? []) params.append("countries", country);
  if (filters.year_from !== undefined) params.set("year_from", String(filters.year_from));
  if (filters.year_to !== undefined) params.set("year_to", String(filters.year_to));
}
