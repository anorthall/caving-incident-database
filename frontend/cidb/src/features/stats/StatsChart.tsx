import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStats, type IncidentFilters } from "@/lib/api";

import type { StatsChartConfig } from "./stats-config";

const ROW_CLASS =
  "grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-2 py-1.5";

export function StatsChart({
  chart,
  filters,
  isFiltered,
}: {
  chart: StatsChartConfig;
  filters: IncidentFilters;
  isFiltered: boolean;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", chart.groupBy, filters],
    queryFn: () => getStats(chart.groupBy, filters),
  });

  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((row) => row.count));
  const href = chart.href;

  return (
    <Card data-testid={`stats-${chart.groupBy}`} className="min-w-0 gap-4">
      <CardHeader>
        <CardTitle>{chart.title}</CardTitle>
        <CardDescription>{chart.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : isError ? (
          <p className="text-destructive text-sm">Failed to load this chart.</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isFiltered ? "No data for the current filters." : "No data recorded yet."}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => {
              const content = (
                <>
                  <span className="min-w-0 text-sm break-words">
                    {chart.formatLabel(row.label)}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {row.count.toLocaleString()}
                  </span>
                  <span className="bg-muted col-span-2 h-2 overflow-hidden rounded-full">
                    <span
                      className="bg-primary block h-full rounded-full"
                      style={{ width: `max(${(row.count / max) * 100}%, 0.5rem)` }}
                    />
                  </span>
                </>
              );
              return (
                <li key={row.label}>
                  {href ? (
                    <Link
                      to={href(filters, row.label)}
                      className={`${ROW_CLASS} hover:bg-accent focus-visible:ring-ring cursor-pointer rounded-md outline-none focus-visible:ring-2`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={ROW_CLASS}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
