import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { FILTER_DIMENSIONS, hasYearFilter, yearRangeLabel } from "./filters";
import { useFacets } from "./use-facets";
import { useIncidentFilters } from "./use-incident-filters";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips() {
  const { filters, toggle, setYears, setHasLocation, removeQuery, clear } = useIncidentFilters();
  const { data } = useFacets(filters);
  const names = new Map<string, string>([
    ...(data?.caves ?? []).map((cave): [string, string] => [`caves:${cave.id}`, cave.name]),
    ...(data?.publications ?? []).map((pub): [string, string] => [
      `publications:${pub.id}`,
      pub.name,
    ]),
  ]);

  const chips: Chip[] = [];
  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, onRemove: removeQuery });
  }
  for (const dimension of FILTER_DIMENSIONS) {
    for (const value of filters[dimension]) {
      chips.push({
        key: `${dimension}:${value}`,
        label: names.get(`${dimension}:${value}`) ?? value,
        onRemove: () => toggle(dimension, value),
      });
    }
  }
  if (filters.has_location !== undefined) {
    chips.push({
      key: "has_location",
      label: filters.has_location ? "Has location" : "No location",
      onRemove: () => setHasLocation(undefined),
    });
  }
  if (hasYearFilter(filters)) {
    chips.push({
      key: "years",
      label: yearRangeLabel(filters.year_from, filters.year_to),
      onRemove: () => setYears(undefined, undefined),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 overflow-visible pr-1">
          {chip.label}
          <Button
            variant="ghost"
            size="icon"
            className="-my-1 -mr-1 size-6 cursor-pointer rounded-full"
            aria-label={`Remove filter ${chip.label}`}
            onClick={chip.onRemove}
          >
            <X className="size-3" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer max-sm:h-10"
        onClick={() => clear()}
      >
        Clear all
      </Button>
    </div>
  );
}
