import type { ColumnVisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, List, Settings2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SortField, SortOrder } from "@/lib/api";

export type ViewMode = "cards" | "table";

const COLUMN_LABELS: Record<string, string> = {
  date: "Date",
  title: "Title",
  cave_name: "Cave",
  location_summary: "Location",
  view_count: "Views",
  tags: "Tags",
};

const ALL_COLUMNS = ["date", "title", "cave_name", "location_summary", "view_count", "tags"];

interface SortControlsProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  hasQuery: boolean;
  onSortByChange: (field: SortField) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onViewModeChange: (mode: ViewMode) => void;
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (visibility: ColumnVisibilityState) => void;
  resultCount?: number;
  searchTime?: number | null;
  actions?: ReactNode;
}

export function SortControls({
  sortBy,
  sortOrder,
  viewMode,
  hasQuery,
  onSortByChange,
  onSortOrderChange,
  onViewModeChange,
  columnVisibility = {},
  onColumnVisibilityChange,
  resultCount,
  searchTime,
  actions,
}: SortControlsProps) {
  const isColumnVisible = (columnId: string) => columnVisibility[columnId] !== false;

  const toggleColumn = (columnId: string) => {
    onColumnVisibilityChange?.({
      ...columnVisibility,
      [columnId]: !isColumnVisible(columnId),
    });
  };

  return (
    <div className="mb-4">
      {resultCount !== undefined && (
        <p className="mb-2 text-sm text-muted-foreground">
          {resultCount.toLocaleString()} incident{resultCount !== 1 ? "s" : ""}
          {searchTime !== null && searchTime !== undefined && (
            <span className="ml-1">({searchTime}ms)</span>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {viewMode === "cards" && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={sortBy}
              onValueChange={(v) => v && onSortByChange(v as SortField)}
              variant="outline"
            >
              <ToggleGroupItem value="date" aria-label="Sort by date">
                Date
              </ToggleGroupItem>
              {hasQuery && (
                <ToggleGroupItem value="relevance" aria-label="Sort by relevance">
                  Relevance
                </ToggleGroupItem>
              )}
            </ToggleGroup>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              aria-label={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? (
                <ArrowUpNarrowWide className="h-4 w-4" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
            variant="outline"
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="cards" aria-label="List view" className="gap-2">
              <List className="h-4 w-4" />
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="gap-2">
              <Table2 className="h-4 w-4" />
              Table
            </ToggleGroupItem>
          </ToggleGroup>

          {viewMode === "table" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((columnId) => (
                  <DropdownMenuCheckboxItem
                    key={columnId}
                    checked={isColumnVisible(columnId)}
                    onCheckedChange={() => toggleColumn(columnId)}
                  >
                    {COLUMN_LABELS[columnId]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
