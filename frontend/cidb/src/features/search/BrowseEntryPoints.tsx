import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import type { FacetValue } from "@/lib/api";

import { decadeRange, EMPTY_FILTERS, filterHref } from "./filters";
import { useFacets } from "./use-facets";

const BROWSE_LIMIT = 12;

interface BrowseItem {
  key: string;
  label: string;
  count: number;
  href: string;
}

function BrowseGroup({ title, items }: { title: string; items: BrowseItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item.key} variant="outline" asChild>
            <Link to={item.href} className="cursor-pointer">
              {item.label}
              <span className="text-muted-foreground tabular-nums">
                {item.count.toLocaleString()}
              </span>
            </Link>
          </Badge>
        ))}
      </div>
    </section>
  );
}

function facetItems(values: FacetValue[], dimension: "states" | "tags"): BrowseItem[] {
  return values.slice(0, BROWSE_LIMIT).map((facet) => ({
    key: facet.value,
    label: facet.value,
    count: facet.count,
    href: filterHref({ [dimension]: [facet.value] }),
  }));
}

export function BrowseEntryPoints() {
  const { data } = useFacets(EMPTY_FILTERS);

  if (!data) return null;

  const decades = data.decades.map((facet) => ({
    key: String(facet.decade),
    label: `${facet.decade}s`,
    count: facet.count,
    href: filterHref(decadeRange(facet.decade)),
  }));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 px-4">
      <BrowseGroup title="Browse by decade" items={decades} />
      <BrowseGroup title="Browse by state" items={facetItems(data.states, "states")} />
      <BrowseGroup title="Browse by tag" items={facetItems(data.tags, "tags")} />
    </div>
  );
}
