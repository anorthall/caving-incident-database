import { MapPinOff } from "lucide-react";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ActiveFilterChips } from "@/features/search/ActiveFilterChips";
import { FilterSheet } from "@/features/search/FilterSheet";
import { FilterSidebar } from "@/features/search/FilterSidebar";
import { useIncidentGeo } from "@/features/map/use-incident-geo";
import { useIncidentFilters } from "@/features/search/use-incident-filters";

const IncidentMap = lazy(() => import("@/features/map/IncidentMap"));

export default function MapPage() {
  const { filters } = useIncidentFilters();
  const { data, error, isPending } = useIncidentGeo(filters);
  const total = data?.total ?? 0;
  const withoutLocation = data?.without_location ?? 0;

  return (
    <div className="@container w-full">
      <div className="flex gap-6">
        <aside
          aria-label="Filters"
          className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 self-start overflow-y-auto @4xl:block"
        >
          <FilterSidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSheet resultCount={total} className="max-sm:h-10 @4xl:hidden" />
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isPending ? "Loading map..." : `${total.toLocaleString()} on map`}
            </p>
            {withoutLocation > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPinOff className="h-4 w-4" />
                {withoutLocation.toLocaleString()} without coordinates
              </p>
            )}
          </div>
          <ActiveFilterChips />
          {error && <p className="text-destructive">Error loading map. Please try again.</p>}
          <div className="relative z-0 h-[calc(100svh-12rem)] min-h-96 overflow-hidden rounded-md border">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <IncidentMap points={data?.points ?? []} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
