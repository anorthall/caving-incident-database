import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { IncidentLayoutFlat } from "@/components/incidents/IncidentLayoutFlat";
import { EditIncidentSheet } from "@/components/staff/EditIncidentSheet";
import { RevisionHistory } from "@/components/staff/RevisionHistory";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatedIncidents } from "@/features/browse/RelatedIncidents";
import { getIncident } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePageMeta } from "@/hooks/use-page-meta";
import { markIncidentViewed } from "@/lib/viewed-incidents";

export function IncidentPage() {
  const { id } = useParams<{ id: string }>();
  const incidentId = parseInt(id!, 10);
  const { user } = useAuth();
  const canEdit = !!user && (user.is_editor || user.is_staff);

  const {
    data: incident,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => getIncident(incidentId),
    enabled: !isNaN(incidentId),
  });

  usePageMeta(incident?.title ?? null, incident?.summary || "Caving incident report.");

  useEffect(() => {
    if (incident) {
      markIncidentViewed(incident.id, incident.title);
    }
  }, [incident]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-8 h-28 w-full" />
        <Skeleton className="mt-8 h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-destructive">Incident not found</p>
        <Button variant="ghost" asChild>
          <Link to="/">Back to search</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <EditIncidentSheet key={incident.updated_at} incident={incident} />
        </div>
      )}
      <IncidentLayoutFlat incident={incident} />
      <RelatedIncidents incidentId={incident.id} />
      {canEdit && <RevisionHistory incidentId={incident.id} />}
    </>
  );
}
