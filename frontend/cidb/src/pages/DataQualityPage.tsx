import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getDataQuality, type DataQualitySample } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const sampleLinkClass =
  "inline-block min-h-10 py-2 break-words min-w-0 underline underline-offset-4 cursor-pointer rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function sampleHref(sample: DataQualitySample): string {
  if (sample.kind === "incident") return `/incidents/${sample.id}`;
  return `/admin/incidents/${sample.kind}/${sample.id}/change/`;
}

export function DataQualityPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  usePageMeta("Data quality", "Staff area of the Caving Incident Database.");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["data-quality"],
    queryFn: getDataQuality,
    enabled: isAuthenticated && (user?.is_staff || user?.is_editor),
  });

  if (authLoading) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto w-full">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAuthenticated || (!user?.is_staff && !user?.is_editor)) {
    return <Navigate to="/staff/login" replace />;
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto w-full min-w-0">
      <h1 className="text-3xl font-bold tracking-tight">Data quality</h1>

      {error && (
        <div className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-destructive break-words min-w-0">
            Error loading data quality.{" "}
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="divide-y border-y">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 py-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {data && data.length === 0 && <p className="text-muted-foreground">No checks reported</p>}

      {data && data.length > 0 && (
        <div className="divide-y border-y">
          {data.map((check) => (
            <div
              key={check.key}
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,2fr)_6rem_minmax(0,3fr)] md:gap-6"
            >
              <div className="min-w-0 max-w-prose">
                <div className="font-medium break-words">{check.title}</div>
                <div className="text-sm text-muted-foreground break-words">{check.description}</div>
              </div>
              <div>
                <Badge variant={check.count > 0 ? "destructive" : "secondary"}>{check.count}</Badge>
              </div>
              <div className="min-w-0">
                {check.samples.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <ul>
                    {check.samples.map((sample) => (
                      <li key={`${sample.kind}-${sample.id}-${sample.label}`} className="min-w-0">
                        {sample.kind === "incident" ? (
                          <Link to={sampleHref(sample)} className={sampleLinkClass}>
                            {sample.label}
                          </Link>
                        ) : (
                          <a href={sampleHref(sample)} className={sampleLinkClass}>
                            {sample.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
