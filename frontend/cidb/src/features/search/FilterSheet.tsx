import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { FilterSidebar } from "./FilterSidebar";
import { useIncidentFilters } from "./use-incident-filters";

interface FilterSheetProps {
  resultCount: number;
  className?: string;
}

export function FilterSheet({ resultCount, className }: FilterSheetProps) {
  const { activeCount } = useIncidentFilters();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("cursor-pointer", className)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Narrow incidents by tag, state, country and year.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3">
          <FilterSidebar />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button className="cursor-pointer">
              Show {resultCount.toLocaleString()} {resultCount === 1 ? "result" : "results"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
