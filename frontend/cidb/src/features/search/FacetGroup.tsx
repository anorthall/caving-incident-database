import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
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
  const visible = expanded
    ? values
    : values.filter(
        (facet, index) => index < COLLAPSED_VISIBLE_COUNT || selected.includes(facet.value)
      );

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <h3 id={labelId} className="mb-1 text-sm font-medium">
        {label}
      </h3>
      {visible.map((facet) => (
        <Toggle
          key={facet.value}
          size="sm"
          className="w-full cursor-pointer justify-between"
          pressed={selected.includes(facet.value)}
          onPressedChange={() => onToggle(facet.value)}
        >
          <span className="truncate" title={facet.value}>
            {facet.value}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {facet.count.toLocaleString()}
          </span>
        </Toggle>
      ))}
      {visible.length < values.length && (
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
