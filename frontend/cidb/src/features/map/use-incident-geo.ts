import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getIncidentGeo, type IncidentFilters } from "@/lib/api";

const GEO_STALE_TIME_MS = 5 * 60 * 1000;

export function useIncidentGeo(filters: IncidentFilters) {
  return useQuery({
    queryKey: ["incident-geo", filters],
    queryFn: () => getIncidentGeo(filters),
    placeholderData: keepPreviousData,
    staleTime: GEO_STALE_TIME_MS,
  });
}
