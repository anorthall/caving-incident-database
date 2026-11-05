import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { IncidentFilters, SortField, SortOrder } from "@/lib/api";

import {
  activeFilterCount,
  type FilterDimension,
  parseFilters,
  parseSort,
  serializeFilters,
  toggleValue,
} from "./filters";

export function useIncidentFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const sort = useMemo(() => parseSort(searchParams, filters.q), [searchParams, filters.q]);
  const activeCount = activeFilterCount(filters);

  const applyFilters = (next: IncidentFilters) => setSearchParams(serializeFilters(next, sort));

  return {
    filters,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    hasFilters: activeCount > 0,
    activeCount,
    toggle: (dimension: FilterDimension, value: string) =>
      applyFilters(toggleValue(filters, dimension, value)),
    setYears: (yearFrom?: number, yearTo?: number) =>
      applyFilters({ ...filters, year_from: yearFrom, year_to: yearTo }),
    removeQuery: () => applyFilters({ ...filters, q: undefined }),
    clear: (keepQuery = false) =>
      setSearchParams(
        serializeFilters(
          { q: keepQuery ? filters.q : undefined, tags: [], states: [], countries: [] },
          sort
        )
      ),
    setSort: (sortBy: SortField, sortOrder: SortOrder) =>
      setSearchParams(serializeFilters(filters, { sortBy, sortOrder }), { replace: true }),
  };
}
