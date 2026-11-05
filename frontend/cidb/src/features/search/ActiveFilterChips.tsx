import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { hasYearFilter, yearRangeLabel } from "./filters";
import { useIncidentFilters } from "./use-incident-filters";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips() {
  const { filters, toggle, setYears, removeQuery, clear } = useIncidentFilters();

  const chips: Chip[] = [];
  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, onRemove: removeQuery });
  }
  for (const dimension of ["tags", "states", "countries"] as const) {
    for (const value of filters[dimension]) {
      chips.push({
        key: `${dimension}:${value}`,
        label: value,
        onRemove: () => toggle(dimension, value),
      });
    }
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
