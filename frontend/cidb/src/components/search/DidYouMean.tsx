import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { parseFilters, parseSort, serializeFilters } from "@/features/search/filters";
import { getDidYouMean } from "@/lib/api";

export function DidYouMean({ query }: { query: string }) {
  const [params] = useSearchParams();
  const { data } = useQuery({
    queryKey: ["did-you-mean", query],
    queryFn: () => getDidYouMean(query),
    enabled: query.length >= 2,
  });

  if (!data?.suggestion) return null;

  const filters = { ...parseFilters(params), q: data.suggestion };
  const search = serializeFilters(filters, parseSort(params, filters.q)).toString();

  return (
    <p className="text-center text-muted-foreground">
      Did you mean{" "}
      <Link
        to={search ? `/?${search}` : "/"}
        className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
      >
        {data.suggestion}
      </Link>
      ?
    </p>
  );
}
