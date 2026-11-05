import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BROWSE_DIMENSIONS,
  browseHref,
  browseLabel,
  isBrowseDimension,
} from "@/features/browse/dimensions";
import { usePageMeta } from "@/hooks/use-page-meta";
import { type BrowseDimension, getBrowseValues } from "@/lib/api";

function BrowseIndex() {
  return (
    <ul className="divide-y border-y">
      {BROWSE_DIMENSIONS.map((item) => (
        <li key={item.dimension}>
          <Link
            to={`/browse/${item.dimension}`}
            className="flex cursor-pointer items-center justify-between gap-4 -mx-2 rounded-sm px-2 py-3 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex flex-col">
              <span className="font-medium">By {item.label.toLowerCase()}</span>
              <span className="text-sm text-muted-foreground">{item.description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BrowseValues({ dimension }: { dimension: BrowseDimension }) {
  const [filter, setFilter] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["browse", dimension],
    queryFn: () => getBrowseValues(dimension),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9 w-full" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">Failed to load values</p>;
  }

  const needle = filter.trim().toLowerCase();
  const visible = data.filter((item) =>
    browseLabel(dimension, item.value).toLowerCase().includes(needle)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter list"
          aria-label="Filter list"
          className="pl-9"
        />
      </div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground">No matches</p>
      ) : (
        <ul className="divide-y border-y">
          {visible.map((item) => (
            <li key={`${item.id ?? ""}:${item.value}`}>
              <Link
                to={browseHref(dimension, item)}
                className="flex cursor-pointer items-center justify-between gap-4 -mx-2 rounded-sm px-2 py-2 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="min-w-0 truncate font-medium">
                  {browseLabel(dimension, item.value)}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {item.count.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BrowsePage() {
  const { dimension } = useParams<{ dimension: string }>();
  const active = isBrowseDimension(dimension)
    ? BROWSE_DIMENSIONS.find((item) => item.dimension === dimension)
    : undefined;
  const title = active ? `Browse by ${active.label.toLowerCase()}` : "Browse";
  usePageMeta(title, "Browse caving incidents by state, country, tag, cave or decade.");

  if (dimension !== undefined && !active) {
    return <Navigate to="/browse" replace />;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {active && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/browse">Browse</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{active.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {active ? (
        <BrowseValues key={active.dimension} dimension={active.dimension} />
      ) : (
        <BrowseIndex />
      )}
    </div>
  );
}
