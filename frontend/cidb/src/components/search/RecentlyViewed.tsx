import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getViewedIncidents, onViewedIncidentsChange } from "@/lib/viewed-incidents";

const MAX_SHOWN = 5;

export function RecentlyViewed() {
  const [viewed, setViewed] = useState(getViewedIncidents);

  useEffect(() => onViewedIncidentsChange(() => setViewed(getViewedIncidents())), []);

  if (viewed.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className="w-full max-w-2xl px-4 pb-8">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Recently viewed
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {viewed.slice(0, MAX_SHOWN).map((incident) => (
          <li key={incident.id}>
            <Link
              to={`/incidents/${incident.id}`}
              className="block cursor-pointer truncate py-3 text-sm hover:text-primary"
            >
              {incident.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
