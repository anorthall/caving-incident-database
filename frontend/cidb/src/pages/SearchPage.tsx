import { useInfiniteQuery } from "@tanstack/react-query";
import type { ColumnVisibilityState } from "@tanstack/react-table";
import { ChevronUp, Table2 } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { IncidentCard } from "@/components/incidents/IncidentCard";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { DidYouMean } from "@/components/search/DidYouMean";
import { NoResultsMessage } from "@/components/search/NoResultsMessage";
import { RecentlyViewed } from "@/components/search/RecentlyViewed";
import { SearchTypeahead } from "@/components/search/SearchTypeahead";
import { SortControls, type ViewMode } from "@/components/search/SortControls";
import { Button } from "@/components/ui/button";
import { ActiveFilterChips } from "@/features/search/ActiveFilterChips";
import { BrowseEntryPoints } from "@/features/search/BrowseEntryPoints";
import { FilterSheet } from "@/features/search/FilterSheet";
import { FilterSidebar } from "@/features/search/FilterSidebar";
import { filterHref, serializeFilters } from "@/features/search/filters";
import { useFacets } from "@/features/search/use-facets";
import { useIncidentFilters } from "@/features/search/use-incident-filters";
import { searchIncidents, trackSearchClick } from "@/lib/api";
import {
  DELETING_SPEED_MS,
  MOBILE_BREAKPOINT,
  SCROLL_THRESHOLD,
  SEARCH_COUNT_STORAGE_KEY,
  TABLE_HINT_DELAY_MS,
  TABLE_HINT_DURATION_MS,
  TABLE_HINT_MIN_SEARCHES,
  TABLE_VIEW_HINT_STORAGE_KEY,
  TABLET_BREAKPOINT,
  TYPING_PAUSE_MS,
  TYPING_SPEED_MS,
  VIEW_MODE_STORAGE_KEY,
} from "@/constants.ts";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useStaffCommands } from "@/hooks/use-staff-commands";

export function SearchPage() {
  const { filters, sortBy, sortOrder, hasFilters, clear, setSort } = useIncidentFilters();
  const urlQuery = filters.q ?? "";
  const filtersKey = serializeFilters(filters).toString();
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const { handleStaffCommand } = useStaffCommands();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
    if (urlQuery) {
      setSearchTime(null);
    }
  }

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      // Force cards view on mobile
      if (window.innerWidth < MOBILE_BREAKPOINT) return "cards";
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "cards" || saved === "table") return saved;
    }
    return "cards";
  });

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({
    tags: false,
    view_count: false,
  });
  const tableHintShownRef = useRef(false);

  // Force cards view on mobile resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT && viewMode === "table") {
        setViewMode("cards");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  const searchStartRef = useRef<number>(0);
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasSearched = urlQuery.length > 0 || hasFilters;
  usePageMeta(
    urlQuery ? `Search: ${urlQuery}` : hasFilters ? "Filtered incidents" : null,
    urlQuery
      ? `Caving incidents matching "${urlQuery}".`
      : "Search and explore documented caving incidents and accidents."
  );

  // Track search start time and scroll to top on new search
  useEffect(() => {
    if (filtersKey) {
      searchStartRef.current = performance.now();
      window.scrollTo(0, 0);
    }
  }, [filtersKey]);

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["incidents", filters, sortBy, sortOrder],
    queryFn: ({ pageParam = 1 }) =>
      searchIncidents({
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: hasSearched,
  });

  const { data: facets } = useFacets(filters);

  useEffect(() => {
    if (data?.pages[0] && searchStartRef.current > 0 && searchTime === null) {
      setSearchTime(Math.round(performance.now() - searchStartRef.current));
    }
  }, [data, searchTime]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Back to top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track search count for table hint
  useEffect(() => {
    if (!urlQuery) return;
    const currentCount = parseInt(localStorage.getItem(SEARCH_COUNT_STORAGE_KEY) || "0", 10);
    localStorage.setItem(SEARCH_COUNT_STORAGE_KEY, String(currentCount + 1));
  }, [urlQuery]);

  // Table view hint toast for desktop visitors on 3rd+ search
  useEffect(() => {
    if (tableHintShownRef.current) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth < TABLET_BREAKPOINT) return; // Desktop only
    if (localStorage.getItem(TABLE_VIEW_HINT_STORAGE_KEY)) return; // Already shown
    if (viewMode !== "cards") return; // Only show when in list view
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    if (!data || items.length === 0) return; // Need results

    const searchCount = parseInt(localStorage.getItem(SEARCH_COUNT_STORAGE_KEY) || "0", 10);
    if (searchCount < TABLE_HINT_MIN_SEARCHES) return; // Only show on 3rd+ search

    tableHintShownRef.current = true;
    localStorage.setItem(TABLE_VIEW_HINT_STORAGE_KEY, "true");

    const timer = setTimeout(() => {
      toast(
        <div className="flex items-start gap-3">
          <Table2 className="h-5 w-5 mt-0.5 text-primary" />
          <div>
            <p className="font-medium">Try Table View</p>
            <p className="text-sm text-muted-foreground mt-1">
              Switch to table view for easier scanning and sorting of incidents.
            </p>
          </div>
        </div>,
        {
          duration: TABLE_HINT_DURATION_MS,
          action: {
            label: "Try it",
            onClick: () => handleViewModeChange("table"),
          },
        }
      );
    }, TABLE_HINT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [data, viewMode, handleViewModeChange]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSearch = useCallback(
    async (e: React.FormEvent | string) => {
      if (typeof e !== "string") e.preventDefault();
      const text = typeof e === "string" ? e : query;
      if (text.trim()) {
        const handled = await handleStaffCommand(text);
        if (handled) {
          setQuery("");
          return;
        }
        navigate(filterHref({ q: text.trim() }));
      }
    },
    [query, navigate, handleStaffCommand]
  );

  const handleIncidentClick = useCallback(
    (incidentId: number, position: number) => {
      if (urlQuery) {
        void trackSearchClick(urlQuery, incidentId, position);
      }
      navigate(`/incidents/${incidentId}`);
    },
    [urlQuery, navigate]
  );

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
  const searchTotal = data?.pages[0]?.total ?? 0;
  const totalCount = facets?.total ?? 0;

  const [exampleQueries] = useState(() =>
    [
      "rope failure",
      "flooding incidents",
      "hypothermia rescue",
      "vertical caving",
      "equipment failure",
      "lost cavers",
      "rock fall",
      "cave diving",
      "squeeze passage",
      "medical emergencies",
      "airplane crash",
      "collapsed passage",
      "anchor failure",
      "bad air",
      "sump rescue",
      "rappel accidents",
      "ladder climb",
      "solo caving",
    ].sort(() => Math.random() - 0.5)
  );

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearAnimationTimeout = () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };

    if (query) {
      clearAnimationTimeout();
      return;
    }

    const currentQuery = exampleQueries[placeholderIndex];
    let charIndex = 0;

    if (isTyping) {
      const typeChar = () => {
        if (charIndex <= currentQuery.length) {
          setAnimatedPlaceholder(currentQuery.slice(0, charIndex));
          charIndex++;
          animationTimeoutRef.current = setTimeout(typeChar, TYPING_SPEED_MS);
        } else {
          animationTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_PAUSE_MS);
        }
      };
      typeChar();
    } else {
      charIndex = currentQuery.length;
      const deleteChar = () => {
        if (charIndex >= 0) {
          setAnimatedPlaceholder(currentQuery.slice(0, charIndex));
          charIndex--;
          animationTimeoutRef.current = setTimeout(deleteChar, DELETING_SPEED_MS);
        } else {
          setPlaceholderIndex((i) => (i + 1) % exampleQueries.length);
          setIsTyping(true);
        }
      };
      deleteChar();
    }

    return clearAnimationTimeout;
  }, [exampleQueries, placeholderIndex, isTyping, query]);

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center pt-[8vh] sm:pt-[15vh]">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">
            Caving Incident Database
          </h1>
          <p
            className={`mt-4 text-2xl font-light text-muted-foreground transition-opacity duration-700 ease-out ${totalCount > 0 ? "opacity-100" : "opacity-0"}`}
          >
            <span className="text-primary font-medium">
              {totalCount > 0 ? totalCount.toLocaleString() : "0"}
            </span>{" "}
            incidents documented
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full max-w-2xl px-4 py-12">
          <div
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`relative rounded-lg p-0.5 transition-colors ${isFocused ? "bg-linear-to-r from-red-500 via-yellow-500 to-purple-500 bg-size-[200%_100%] animate-gradient-x" : "bg-border"}`}
          >
            <SearchTypeahead
              value={query}
              onValueChange={setQuery}
              onSubmit={(v) => void handleSearch(v)}
              placeholder={animatedPlaceholder}
            />
          </div>
        </form>

        <RecentlyViewed />
        <BrowseEntryPoints />
      </div>
    );
  }

  const isTable = viewMode === "table";

  return (
    <>
      <div className="@container w-full">
        <div className="flex justify-center gap-8">
          {!isTable && (
            <aside
              aria-label="Filters"
              className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 self-start overflow-y-auto @4xl:block"
            >
              <FilterSidebar />
            </aside>
          )}

          <div className={`min-w-0 flex-1 ${isTable ? "max-w-[1400px]" : "max-w-3xl"}`}>
            {error && (
              <p className="text-destructive">Error loading incidents. Please try again.</p>
            )}

            <div className="mb-4 flex flex-col items-start gap-3">
              <FilterSheet
                resultCount={searchTotal}
                className={`max-sm:h-10 ${isTable ? "" : "@4xl:hidden"}`}
              />
              <ActiveFilterChips />
            </div>

            {data && allItems.length > 0 && (
              <SortControls
                sortBy={sortBy}
                sortOrder={sortOrder}
                viewMode={viewMode}
                hasQuery={!!urlQuery}
                onSortByChange={(field) => setSort(field, sortOrder)}
                onSortOrderChange={(order) => setSort(sortBy, order)}
                onViewModeChange={handleViewModeChange}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                resultCount={searchTotal}
                searchTime={searchTime}
              />
            )}

            {data && allItems.length === 0 && (
              <>
                <NoResultsMessage onClearFilters={hasFilters ? () => clear(true) : undefined} />
                {urlQuery && <DidYouMean query={urlQuery} />}
              </>
            )}

            {data && allItems.length > 0 && (
              <>
                {viewMode === "cards" ? (
                  <div>
                    {allItems.map((incident, index) => (
                      <IncidentCard
                        key={incident.id}
                        incident={incident}
                        onClick={() => handleIncidentClick(incident.id, index + 1)}
                      />
                    ))}
                  </div>
                ) : (
                  <IncidentTable
                    incidents={allItems}
                    onRowClick={(id, index) => handleIncidentClick(id, index + 1)}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={(field) => {
                      if (sortBy === field) {
                        setSort(field, sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSort(field, "desc");
                      }
                    }}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                  />
                )}

                <div ref={loadMoreRef} className="py-8 text-center">
                  {isFetchingNextPage && <p className="text-muted-foreground">Loading more...</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={scrollToTop}
        size="icon"
        className={`fixed bottom-4 right-4 rounded-full shadow-lg transition-opacity duration-300 cursor-pointer ${showBackToTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    </>
  );
}
