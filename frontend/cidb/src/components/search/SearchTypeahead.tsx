import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useId, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getSearchSuggestions } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

interface SearchTypeaheadProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchTypeahead({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  className,
}: SearchTypeaheadProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebouncedValue(value.trim(), DEBOUNCE_MS);

  const { data } = useQuery({
    queryKey: ["suggestions", debounced],
    queryFn: () => getSearchSuggestions(debounced),
    enabled: debounced.length >= MIN_CHARS,
    staleTime: 60_000,
  });

  const suggestions = value.trim().length >= MIN_CHARS ? (data?.suggestions ?? []) : [];
  const expanded = open && suggestions.length > 0;

  const choose = (suggestion: string) => {
    setOpen(false);
    setActive(-1);
    onValueChange(suggestion);
    onSubmit(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        role="combobox"
        aria-label="Search incidents"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className="w-full h-16 text-lg sm:text-2xl px-4 sm:px-8 rounded-md bg-background text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <ul
        id={listId}
        role="listbox"
        hidden={!expanded}
        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
      >
        {suggestions.map((s, i) => (
          <li
            key={s}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(s);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-4 py-3 text-base",
              i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
