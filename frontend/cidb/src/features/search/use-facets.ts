import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getFacets, type IncidentFilters } from "@/lib/api";

const FACETS_STALE_TIME_MS = 5 * 60 * 1000;

export function useFacets(filters: IncidentFilters) {
  return useQuery({
    queryKey: ["facets", filters],
    queryFn: () => getFacets(filters),
    placeholderData: keepPreviousData,
    staleTime: FACETS_STALE_TIME_MS,
  });
}
