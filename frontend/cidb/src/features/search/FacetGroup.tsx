import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import type { FacetValue } from "@/lib/api";

const COLLAPSED_VISIBLE_COUNT = 8;

interface FacetGroupProps {
  label: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetGroup({ label, values, selected, onToggle }: FacetGroupProps) {
  const labelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const searchable = values.length > COLLAPSED_VISIBLE_COUNT || search !== "";
  const needle = search.trim().toLowerCase();
  const matching = needle
    ? values.filter((facet) => (facet.label ?? facet.value).toLowerCase().includes(needle))
    : values;
  const visible =
    expanded || needle
      ? matching
      : matching.filter(
          (facet, index) => index < COLLAPSED_VISIBLE_COUNT || selected.includes(facet.value)
        );

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <h3 id={labelId} className="mb-1 text-sm font-medium">
        {label}
      </h3>
      {searchable && (
        <Input
          type="search"
          aria-label={`Search ${label}`}
          placeholder={`Search ${label.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      {visible.map((facet) => (
        <Toggle
          key={facet.value}
          size="sm"
          className="w-full cursor-pointer justify-between"
          pressed={selected.includes(facet.value)}
          onPressedChange={() => onToggle(facet.value)}
        >
          <span className="truncate" title={facet.label ?? facet.value}>
            {facet.label ?? facet.value}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {facet.count.toLocaleString()}
          </span>
        </Toggle>
      ))}
      {!needle && visible.length < values.length && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer justify-start"
          onClick={() => setExpanded(true)}
        >
          Show all ({values.length})
        </Button>
      )}
    </div>
  );
}
