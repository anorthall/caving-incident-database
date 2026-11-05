import { decadeRange, filterHref } from "@/features/search/filters";
import type { IncidentFilters, StatRow, StatsGroupBy } from "@/lib/api";

export interface StatsChartConfig {
  groupBy: StatsGroupBy;
  title: string;
  description: string;
  formatLabel: (label: string) => string;
  href?: (filters: IncidentFilters, label: string) => string;
}

const identity = (label: string) => label;

export const STATS_CHARTS: StatsChartConfig[] = [
  {
    groupBy: "decade",
    title: "Incidents per decade",
    description: "Reported incidents by decade of occurrence",
    formatLabel: (label) => `${label}s`,
    href: (filters, label) => filterHref({ ...filters, ...decadeRange(Number(label)) }),
  },
  {
    groupBy: "tag",
    title: "Top tags",
    description: "Most common incident tags",
    formatLabel: identity,
    href: (filters, label) =>
      filterHref({
        ...filters,
        tags: filters.tags.includes(label) ? filters.tags : [...filters.tags, label],
      }),
  },
  {
    groupBy: "state",
    title: "Top states",
    description: "States and regions with the most incidents",
    formatLabel: identity,
    href: (filters, label) =>
      filterHref({
        ...filters,
        states: filters.states.includes(label) ? filters.states : [...filters.states, label],
      }),
  },
  {
    groupBy: "injury",
    title: "Injury types",
    description: "Injuries recorded for people involved",
    formatLabel: identity,
  },
  {
    groupBy: "age_bucket",
    title: "Age distribution",
    description: "Age of people involved, where recorded",
    formatLabel: identity,
  },
];

export function totalCount(rows: StatRow[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0);
}
