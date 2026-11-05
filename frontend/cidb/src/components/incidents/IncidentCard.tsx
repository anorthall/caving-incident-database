import { Check, Eye } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import type { IncidentListItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isIncidentViewed } from "@/lib/viewed-incidents";

const CARD_TAG_LIMIT = 5;

interface IncidentCardProps {
  incident: IncidentListItem;
  onClick?: () => void;
}

export const IncidentCard = memo(function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const viewed = isIncidentViewed(incident.id);
  const meta = [incident.date?.display, incident.cave_name, incident.location_summary].filter(
    (part): part is string => !!part
  );

  return (
    <article className="py-4 border-b last:border-b-0">
      <h2 className="mb-1 text-lg font-medium">
        <Link
          to={`/incidents/${incident.id}`}
          onClick={(event) => {
            if (!onClick || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            onClick();
          }}
          className={cn(
            "rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
            viewed && "text-muted-foreground"
          )}
        >
          {incident.title}
          {viewed && (
            <Check
              className="ml-2 inline-block h-4 w-4 align-[-0.125em] text-muted-foreground/70"
              aria-label="Previously viewed"
            />
          )}
        </Link>
      </h2>

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {meta.map((part, index) => (
          <span key={index} className="inline-flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">·</span>}
            {part}
          </span>
        ))}
        {incident.view_count > 0 && (
          <span className="inline-flex items-center gap-2">
            {meta.length > 0 && <span aria-hidden="true">·</span>}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" aria-label="Views" />
              {incident.view_count.toLocaleString()}
            </span>
          </span>
        )}
      </div>

      {incident.summary && <p className="text-sm text-muted-foreground">{incident.summary}</p>}

      {incident.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {incident.tags.slice(0, CARD_TAG_LIMIT).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {incident.tags.length > CARD_TAG_LIMIT && (
            <span className="text-xs text-muted-foreground">
              +{incident.tags.length - CARD_TAG_LIMIT}
            </span>
          )}
        </div>
      )}
    </article>
  );
});
