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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              <Button variant="outline" size="sm" className="h-9" disabled>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Too many results to download ({total.toLocaleString()}). Narrow the filters to{" "}
            {EXPORT_MAX_ROWS.toLocaleString()} or fewer.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
