import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { filterHref } from "@/features/search/filters";
import { useIncidentFilters } from "@/features/search/use-incident-filters";
import { StatsChart } from "@/features/stats/StatsChart";
import { STATS_CHARTS } from "@/features/stats/stats-config";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function StatsPage() {
  const { filters, hasFilters } = useIncidentFilters();
  const isFiltered = hasFilters || !!filters.q;
  usePageMeta("Statistics", "Charts of documented caving incidents by decade, tag, state and age.");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground text-sm">
            {isFiltered
              ? "Showing incidents matching the current filters."
              : "Showing all incidents."}
          </p>
        </div>
        {isFiltered ? (
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link to={filterHref(filters)}>View matching incidents</Link>
          </Button>
        ) : null}
      </header>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {STATS_CHARTS.map((chart) => (
          <StatsChart key={chart.groupBy} chart={chart} filters={filters} isFiltered={isFiltered} />
        ))}
      </div>
    </div>
  );
}

export { StatsPage };
