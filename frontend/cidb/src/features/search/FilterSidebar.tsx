import { MapPin } from "lucide-react";
import { Fragment, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";

import { FacetGroup } from "./FacetGroup";
import { isFacetGroupVisible, parseYear } from "./filters";
import { useFacets } from "./use-facets";
import { useIncidentFilters } from "./use-incident-filters";

const SKELETON_ROWS = 6;

function resolveYear(draft: string, current?: number): number | undefined {
  if (draft.trim() === "") return undefined;
  return parseYear(draft) ?? current;
}

interface YearGroupProps {
  yearMin: number | null;
  yearMax: number | null;
}

function YearGroup({ yearMin, yearMax }: YearGroupProps) {
  const { filters, setYears } = useIncidentFilters();
  const labelId = useId();
  const fromId = useId();
  const toId = useId();
  const [fromDraft, setFromDraft] = useState<string | null>(null);
  const [toDraft, setToDraft] = useState<string | null>(null);
  const from = fromDraft ?? filters.year_from?.toString() ?? "";
  const to = toDraft ?? filters.year_to?.toString() ?? "";

  const commit = () => {
    const nextFrom = resolveYear(from, filters.year_from);
    const nextTo = resolveYear(to, filters.year_to);
    setFromDraft(null);
    setToDraft(null);
    if (nextFrom !== filters.year_from || nextTo !== filters.year_to) {
      setYears(nextFrom, nextTo);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
  };

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <h3 id={labelId} className="text-sm font-medium">
        Year
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fromId} className="text-muted-foreground">
            From
          </Label>
          <Input
            id={fromId}
            inputMode="numeric"
            maxLength={4}
            placeholder={yearMin?.toString() ?? ""}
            value={from}
            onChange={(event) => setFromDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={toId} className="text-muted-foreground">
            To
          </Label>
          <Input
            id={toId}
            inputMode="numeric"
            maxLength={4}
            placeholder={yearMax?.toString() ?? ""}
            value={to}
            onChange={(event) => setToDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}

function LocationToggle() {
  const { filters, setHasLocation } = useIncidentFilters();
  return (
    <Toggle
      size="sm"
      className="w-full cursor-pointer justify-start"
      pressed={filters.has_location === true}
      onPressedChange={(pressed) => setHasLocation(pressed ? true : undefined)}
    >
      <MapPin className="h-4 w-4" />
      Has map location
    </Toggle>
  );
}

export function FilterSidebar() {
  const { filters, toggle } = useIncidentFilters();
  const { data, isError } = useFacets(filters);

  if (!data) {
    if (isError) return <p className="text-sm text-destructive">Failed to load filters</p>;
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const groups = [
    { dimension: "tags", label: "Tag", values: data.tags, selected: filters.tags },
    { dimension: "states", label: "State", values: data.states, selected: filters.states },
    { dimension: "regions", label: "Region", values: data.regions, selected: filters.regions },
    { dimension: "injuries", label: "Injury", values: data.injuries, selected: filters.injuries },
    {
      dimension: "caves",
      label: "Cave",
      values: data.caves.map((c) => ({ value: String(c.id), label: c.name, count: c.count })),
      selected: filters.caves,
    },
    {
      dimension: "publications",
      label: "Publication",
      values: data.publications.map((p) => ({
        value: String(p.id),
        label: p.name,
        count: p.count,
      })),
      selected: filters.publications,
    },
    {
      dimension: "countries",
      label: "Country",
      values: data.countries,
      selected: filters.countries,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4 p-1">
      {groups
        .filter((group) => isFacetGroupVisible(group.values, group.selected, data.total))
        .map((group) => (
          <Fragment key={group.dimension}>
            <FacetGroup
              label={group.label}
              values={group.values}
              selected={group.selected}
              onToggle={(value) => toggle(group.dimension, value)}
            />
            <Separator />
          </Fragment>
        ))}
      <LocationToggle />
      <Separator />
      <YearGroup yearMin={data.year_min} yearMax={data.year_max} />
    </div>
  );
}
