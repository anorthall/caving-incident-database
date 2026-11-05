import type { FacetValue, IncidentFilters, SortField, SortOrder } from "@/lib/api";
import { appendFilterParams } from "@/lib/filter-params";

const MAX_FILTER_VALUES = 20;
const MIN_YEAR = 1;
const MAX_YEAR = 9999;

export type FilterDimension = "tags" | "states" | "countries";

interface SortState {
  sortBy: SortField;
  sortOrder: SortOrder;
}

export const EMPTY_FILTERS: IncidentFilters = { tags: [], states: [], countries: [] };

const SORT_FIELDS: readonly SortField[] = ["date", "relevance", "popularity", "title", "cave_name"];
const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"];
const DEFAULT_SORT_ORDER: SortOrder = "desc";

export function parseYear(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return undefined;
  const year = Number(trimmed);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : undefined;
}

function parseList(params: URLSearchParams, name: string): string[] {
  const values = params
    .getAll(name)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)].slice(0, MAX_FILTER_VALUES);
}

export function parseFilters(params: URLSearchParams): IncidentFilters {
  return {
    q: params.get("q")?.trim() || undefined,
    tags: parseList(params, "tags"),
    states: parseList(params, "states"),
    countries: parseList(params, "countries"),
    year_from: parseYear(params.get("year_from") ?? ""),
    year_to: parseYear(params.get("year_to") ?? ""),
  };
}

function defaultSortBy(q?: string): SortField {
  return q ? "relevance" : "date";
}

function resolveSortBy(sortBy: SortField, q?: string): SortField {
  return sortBy === "relevance" && !q ? defaultSortBy(q) : sortBy;
}

export function parseSort(params: URLSearchParams, q?: string): SortState {
  const sortBy = SORT_FIELDS.find((field) => field === params.get("sort_by"));
  const sortOrder = SORT_ORDERS.find((order) => order === params.get("sort_order"));
  return {
    sortBy: sortBy ? resolveSortBy(sortBy, q) : defaultSortBy(q),
    sortOrder: sortOrder ?? DEFAULT_SORT_ORDER,
  };
}

export function serializeFilters(filters: IncidentFilters, sort?: SortState): URLSearchParams {
  const params = new URLSearchParams();
  appendFilterParams(params, filters);
  if (sort) {
    const sortBy = resolveSortBy(sort.sortBy, filters.q);
    if (sortBy !== defaultSortBy(filters.q)) params.set("sort_by", sortBy);
    if (sort.sortOrder !== DEFAULT_SORT_ORDER) params.set("sort_order", sort.sortOrder);
  }
  return params;
}

export function filterHref(partial: Partial<IncidentFilters>): string {
  const query = serializeFilters({ ...EMPTY_FILTERS, ...partial }).toString();
  return query ? `/?${query}` : "/";
}

export function hasYearFilter(filters: IncidentFilters): boolean {
  return filters.year_from !== undefined || filters.year_to !== undefined;
}

export function activeFilterCount(filters: IncidentFilters): number {
  return (
    filters.tags.length +
    filters.states.length +
    filters.countries.length +
    (hasYearFilter(filters) ? 1 : 0)
  );
}

export function toggleValue(
  filters: IncidentFilters,
  dimension: FilterDimension,
  value: string
): IncidentFilters {
  const current = filters[dimension];
  if (current.includes(value)) {
    return { ...filters, [dimension]: current.filter((item) => item !== value) };
  }
  if (current.length >= MAX_FILTER_VALUES) return filters;
  return { ...filters, [dimension]: [...current, value] };
}

export function decadeRange(decade: number): Pick<IncidentFilters, "year_from" | "year_to"> {
  return { year_from: decade, year_to: decade + 9 };
}

export function yearRangeLabel(yearFrom?: number, yearTo?: number): string {
  if (yearFrom !== undefined && yearTo !== undefined) {
    return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
  }
  if (yearFrom !== undefined) return `From ${yearFrom}`;
  return `Until ${yearTo}`;
}

export function isFacetGroupVisible(values: FacetValue[], selected: string[]): boolean {
  return values.length > 1 || selected.length > 0;
}
