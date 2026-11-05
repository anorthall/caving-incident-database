import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getIncidentRevisions, type FieldChange } from "@/lib/api";

function formatValue(value: string | string[]): string {
  const text = Array.isArray(value) ? value.join(", ") : value;
  return text === "" ? "(empty)" : text;
}

function ChangeRow({ field, change }: { field: string; change: FieldChange }) {
  return (
    <li className="text-sm">
      <span className="font-medium capitalize">{field}</span>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        <p className="line-clamp-3 break-words text-muted-foreground line-through">
          {formatValue(change.before)}
        </p>
        <p className="line-clamp-3 break-words">{formatValue(change.after)}</p>
      </div>
    </li>
  );
}

export function RevisionHistory({ incidentId }: { incidentId: number }) {
  const {
    data: revisions,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["incident-revisions", incidentId],
    queryFn: () => getIncidentRevisions(incidentId),
  });

  return (
    <section aria-labelledby="revision-history-heading" className="mt-12">
      <h2
        id="revision-history-heading"
        className="mb-3 flex items-center gap-1.5 text-sm font-medium tracking-tight text-muted-foreground uppercase"
      >
        <History className="h-4 w-4" />
        Revision history
      </h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {isError && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">Failed to load revision history</p>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}
      {revisions && revisions.length === 0 && (
        <p className="text-sm text-muted-foreground">No edits yet.</p>
      )}
      {revisions && revisions.length > 0 && (
        <ul className="divide-y rounded-md border">
          {revisions.map((revision) => (
            <li key={revision.id} className="grid gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{revision.editor_name ?? "Unknown editor"}</span>
                <time className="text-muted-foreground" dateTime={revision.created_at}>
                  {new Date(revision.created_at).toLocaleString()}
                </time>
              </div>
              <ul className="grid gap-3">
                {Object.entries(revision.changes).map(([field, change]) => (
                  <ChangeRow key={field} field={field} change={change} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
