import { Download } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXPORT_MAX_ROWS } from "@/constants";
import { usePageMeta } from "@/hooks/use-page-meta";
import { CITATION, DATA_COLUMNS } from "@/pages/data-content";

export function DataPage() {
  usePageMeta("Data", "Download caving incident records as CSV or JSON, with column definitions.");

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data</h1>
        <p className="text-muted-foreground">
          Download the incident records behind any search as CSV or JSON.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-semibold tracking-tight">About the dataset</h2>
        <p className="leading-7">
          The dataset contains one row per incident. Exports contain the incident summary and
          location metadata, not the full report text. To export, search or filter on the search
          page and use the Download menu above the results. Exports are limited to{" "}
          {EXPORT_MAX_ROWS.toLocaleString()} incidents; narrow the filters if you exceed it.
        </p>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link to="/">
            <Download className="h-4 w-4" />
            Find incidents to download
          </Link>
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-semibold tracking-tight">Columns</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DATA_COLUMNS.map((column) => (
                <TableRow key={column.name}>
                  <TableCell className="font-mono">{column.name}</TableCell>
                  <TableCell className="whitespace-normal">{column.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-semibold tracking-tight">Licence and use</h2>
        <p className="leading-7">
          Incident records are compiled from published accident reports and remain the property of
          their original publishers. The dataset is provided for research, safety and educational
          use. Verify details against the original sources before relying on them, and do not
          present the data as an official record.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-semibold tracking-tight">How to cite</h2>
        <p className="leading-7">
          When you use this data, cite the database and state the date you downloaded it, along with
          the filters you applied.
        </p>
        <blockquote className="border-l-2 pl-6 italic text-muted-foreground">{CITATION}</blockquote>
      </section>
    </article>
  );
}
