import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getStats, type IncidentFilters } from "@/lib/api";

import type { StatsChartConfig } from "./stats-config";

const ROW_HEIGHT = 28;
const MIN_HEIGHT = 200;
const LABEL_WIDTH = 110;

export function StatsChart({
  chart,
  filters,
}: {
  chart: StatsChartConfig;
  filters: IncidentFilters;
}) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", chart.groupBy, filters],
    queryFn: () => getStats(chart.groupBy, filters),
  });

  const config: ChartConfig = { count: { label: "Incidents", color: chart.color } };
  const rows = (data ?? []).map((row) => ({
    ...row,
    name: chart.formatLabel(row.label),
  }));
  const href = chart.href;
  const height = chart.horizontal ? Math.max(MIN_HEIGHT, rows.length * ROW_HEIGHT + 24) : 240;

  const openRow = (label: string) => {
    if (href) navigate(href(filters, label));
  };

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
          <p className="text-muted-foreground text-sm">No data for the current filters.</p>
        ) : (
          <>
            <ChartContainer
              config={config}
              className="aspect-auto w-full"
              style={{ height }}
              role="img"
              aria-label={chart.title}
            >
              <BarChart
                data={rows}
                layout={chart.horizontal ? "vertical" : "horizontal"}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={!chart.horizontal} vertical={chart.horizontal} />
                {chart.horizontal ? (
                  <>
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={LABEL_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tickFormatter={(value: string) =>
                        value.length > 16 ? `${value.slice(0, 15)}…` : value
                      }
                    />
                    <XAxis type="number" hide />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                  </>
                )}
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={4}
                  className={href ? "cursor-pointer" : undefined}
                  onClick={(entry: { payload?: { label?: string } }) => {
                    const label = entry.payload?.label;
                    if (label) openRow(label);
                  }}
                />
              </BarChart>
            </ChartContainer>
            {href ? (
              <ul className="sr-only">
                {rows.map((row) => (
                  <li key={row.label}>
                    <a href={href(filters, row.label)}>
                      {row.name}: {row.count}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
