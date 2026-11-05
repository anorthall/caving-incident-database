import { MapPinOff, TriangleAlert } from "lucide-react";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveFilterChips } from "@/features/search/ActiveFilterChips";
import { FilterSheet } from "@/features/search/FilterSheet";
import { FilterSidebar } from "@/features/search/FilterSidebar";
import { useIncidentGeo } from "@/features/map/use-incident-geo";
import { useIncidentFilters } from "@/features/search/use-incident-filters";

import { cn } from "@/lib/utils";

const IncidentMap = lazy(() => import("@/features/map/IncidentMap"));

export default function MapPage() {
  const { filters, clear } = useIncidentFilters();
  const { data, error, isPending, refetch } = useIncidentGeo(filters);
  const total = data?.total ?? 0;
  const isEmpty = !isPending && !error && total === 0;
  const withoutLocation = data?.without_location ?? 0;

  return (
    <div className="@container w-full">
      <div className="flex gap-6">
        <aside
          aria-label="Filters"
          className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 self-start overflow-y-auto @2xl:block"
        >
          <FilterSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSheet resultCount={total} className="max-sm:h-10 @2xl:hidden" />
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isPending ? "Loading map..." : error ? "" : `${total.toLocaleString()} on map`}
            </p>
            {withoutLocation > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPinOff className="h-4 w-4" />
                {withoutLocation.toLocaleString()} without coordinates
              </p>
            )}
          </div>
          <ActiveFilterChips />
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/50 px-4 py-3 text-sm text-destructive"
            >
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Error loading map. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer max-sm:h-10"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          <div
            className={cn(
              "relative z-0 h-[calc(100svh-12rem)] min-h-96 overflow-hidden rounded-md border",
              error && "hidden"
            )}
          >
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <IncidentMap points={data?.points ?? []} />
            </Suspense>
            {isEmpty && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4">
                <div className="flex max-w-sm flex-col items-center gap-3 rounded-md border bg-popover p-4 text-center text-sm text-popover-foreground shadow-md">
                  <MapPinOff className="h-4 w-4 text-muted-foreground" />
                  <p>No incidents with coordinates match these filters</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer max-sm:h-10"
                    onClick={() => clear()}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
