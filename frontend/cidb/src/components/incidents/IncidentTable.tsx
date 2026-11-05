import { memo, useMemo } from "react";
import type { MouseEvent } from "react";
import type { ColumnDef, ColumnVisibilityState } from "@tanstack/react-table";
import {
  columnSizingFeature,
  columnVisibilityFeature,
  flexRender,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncidentListItem, SortField, SortOrder } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isIncidentViewed } from "@/lib/viewed-incidents";

const features = tableFeatures({ columnSizingFeature, columnVisibilityFeature });

const TABLE_TAG_LIMIT = 2;
const TITLE_MIN_WIDTH = 220;

interface IncidentTableProps {
  incidents: IncidentListItem[];
  onRowClick: (id: number, index: number) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: (visibility: ColumnVisibilityState) => void;
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown className="h-4 w-4" />;
  return order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export const IncidentTable = memo(function IncidentTable({
  incidents,
  onRowClick,
  sortBy,
  sortOrder,
  onSortChange,
  columnVisibility,
  onColumnVisibilityChange,
}: IncidentTableProps) {
  const columns: ColumnDef<typeof features, IncidentListItem>[] = useMemo(() => {
    const sortHeader = (label: string, field: SortField, align: "start" | "end" = "start") => (
      <Button
        variant="ghost"
        className={cn("h-8 gap-2 px-2", align === "start" ? "-ml-2" : "-mr-2")}
        onClick={() => onSortChange(field)}
      >
        {label}
        <SortIcon active={sortBy === field} order={sortOrder} />
      </Button>
    );

    return [
      {
        accessorKey: "date",
        size: 110,
        header: () => sortHeader("Date", "date"),
        cell: ({ row }) => (row.original.date ? formatShortDate(row.original.date) : "Unknown"),
      },
      {
        accessorKey: "title",
        header: () => sortHeader("Title", "title"),
        cell: ({ row }) => {
          const viewed = isIncidentViewed(row.original.id);
          return (
            <Link
              to={`/incidents/${row.original.id}`}
              title={row.original.title}
              onClick={(event) => {
                if (isModifiedClick(event)) return;
                event.preventDefault();
                onRowClick(row.original.id, row.index);
              }}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                viewed && "text-muted-foreground"
              )}
            >
              <span className="truncate">{row.original.title}</span>
              {viewed && (
                <Check
                  className="h-4 w-4 shrink-0 text-muted-foreground/70"
                  aria-label="Previously viewed"
                />
              )}
            </Link>
          );
        },
      },
      {
        accessorKey: "cave_name",
        size: 150,
        header: () => sortHeader("Cave", "cave_name"),
        cell: ({ row }) => row.original.cave_name || "-",
      },
      {
        accessorKey: "location_summary",
        size: 150,
        header: "Location",
        cell: ({ row }) => row.original.location_summary || "-",
      },
      {
        accessorKey: "view_count",
        size: 90,
        header: () => (
          <div className="flex justify-end">{sortHeader("Views", "popularity", "end")}</div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-muted-foreground">
            {row.original.view_count.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "tags",
        size: 210,
        header: "Tags",
        cell: ({ row }) => {
          const tags = row.original.tags;
          return (
            <div className="flex items-center gap-1">
              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {tags.slice(0, TABLE_TAG_LIMIT).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {tags.length > TABLE_TAG_LIMIT && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  +{tags.length - TABLE_TAG_LIMIT}
                </span>
              )}
            </div>
          );
        },
      },
    ];
  }, [onRowClick, onSortChange, sortBy, sortOrder]);

  const table = useTable({
    features,
    data: incidents,
    columns,
    onColumnVisibilityChange: (updater) => {
      const newState = typeof updater === "function" ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(newState);
    },
    state: {
      columnVisibility,
    },
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const minWidth = visibleColumns.reduce(
    (total, column) => total + (column.id === "title" ? TITLE_MIN_WIDTH : column.getSize()),
    0
  );

  return (
    <div className="rounded-md border">
      <Table className="table-fixed" style={{ minWidth }}>
        <colgroup>
          {visibleColumns.map((column) => (
            <col
              key={column.id}
              style={{ width: column.id === "title" ? undefined : column.getSize() }}
            />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) return;
                  onRowClick(row.original.id, row.index);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No incidents found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
});
