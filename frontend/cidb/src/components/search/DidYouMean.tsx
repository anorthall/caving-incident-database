import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { filterHref } from "@/features/search/filters";
import { getDidYouMean } from "@/lib/api";

export function DidYouMean({ query }: { query: string }) {
  const { data } = useQuery({
    queryKey: ["did-you-mean", query],
    queryFn: () => getDidYouMean(query),
    enabled: query.length >= 2,
  });

  if (!data?.suggestion) return null;

  return (
    <p className="text-center text-muted-foreground">
      Did you mean{" "}
      <Link
        to={filterHref({ q: data.suggestion })}
        className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
      >
        {data.suggestion}
      </Link>
      ?
    </p>
  );
}
