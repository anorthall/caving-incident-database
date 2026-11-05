import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Mountain } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { getRelatedIncidents } from "@/lib/api";

const RELATED_TAG_LIMIT = 3;

export function RelatedIncidents({ incidentId }: { incidentId: number }) {
  const { data } = useQuery({
    queryKey: ["related-incidents", incidentId],
    queryFn: () => getRelatedIncidents(incidentId),
  });

  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="related-incidents-heading" className="mt-12">
      <h2 id="related-incidents-heading" className="mb-2 text-xl font-semibold tracking-tight">
        Related incidents
      </h2>
      <ul className="divide-y border-y">
        {data.map((incident) => (
          <li key={incident.id}>
            <Link
              to={`/incidents/${incident.id}`}
              className="flex cursor-pointer flex-col gap-1 rounded-sm px-1 py-3 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="font-medium">{incident.title}</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {incident.date && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {incident.date.display}
                  </span>
                )}
                {incident.cave_name && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <Mountain className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{incident.cave_name}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4 shrink-0" />
                  {incident.view_count.toLocaleString()}
                </span>
                {incident.tags.slice(0, RELATED_TAG_LIMIT).map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
