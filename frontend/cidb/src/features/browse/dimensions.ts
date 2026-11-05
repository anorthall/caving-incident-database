import { decadeRange, filterHref } from "@/features/search/filters";
import type { BrowseDimension, BrowseValue } from "@/lib/api";

export const BROWSE_DIMENSIONS: {
  dimension: BrowseDimension;
  label: string;
  description: string;
}[] = [
  { dimension: "state", label: "State", description: "Incidents by state or province" },
  { dimension: "country", label: "Country", description: "Incidents by country" },
  { dimension: "tag", label: "Tag", description: "Incidents by tag" },
  { dimension: "cave", label: "Cave", description: "Incidents by cave" },
  { dimension: "decade", label: "Decade", description: "Incidents by decade" },
];

export function isBrowseDimension(value: string | undefined): value is BrowseDimension {
  return BROWSE_DIMENSIONS.some((item) => item.dimension === value);
}

export function browseLabel(dimension: BrowseDimension, value: string): string {
  return dimension === "decade" ? `${value}s` : value;
}

export function browseHref(dimension: BrowseDimension, item: BrowseValue): string {
  switch (dimension) {
    case "state":
      return filterHref({ states: [item.value] });
    case "country":
      return filterHref({ countries: [item.value] });
    case "tag":
      return filterHref({ tags: [item.value] });
    case "cave":
      return filterHref({ q: item.value });
    case "decade":
      return filterHref(decadeRange(Number(item.value)));
  }
}
