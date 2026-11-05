import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_MAX_ROWS } from "@/constants";
import { type ExportFormat, exportUrl, type IncidentFilters } from "@/lib/api";

interface DownloadMenuProps {
  filters: IncidentFilters;
  total: number;
}

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "json", label: "JSON" },
];

export function DownloadMenu({ filters, total }: DownloadMenuProps) {
  if (total > EXPORT_MAX_ROWS) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" className="h-9" disabled>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <p className="text-xs text-muted-foreground text-right">
          Downloads are limited to {EXPORT_MAX_ROWS.toLocaleString()} results. Narrow the filters (
          {total.toLocaleString()} found).
        </p>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>
          {total.toLocaleString()} incident{total === 1 ? "" : "s"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map(({ format, label }) => (
          <DropdownMenuItem key={format} asChild className="cursor-pointer">
            <a href={exportUrl(filters, format)} download>
              {label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
