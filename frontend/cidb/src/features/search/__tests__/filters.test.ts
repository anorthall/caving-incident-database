import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  decadeRange,
  EMPTY_FILTERS,
  filterHref,
  isFacetGroupVisible,
  parseFilters,
  parseSort,
  serializeFilters,
  toggleValue,
  yearRangeLabel,
} from "../filters";

const params = (query: string) => new URLSearchParams(query);

describe("parseFilters", () => {
  it("returns empty filters for an empty query string", () => {
    expect(parseFilters(params(""))).toEqual(EMPTY_FILTERS);
  });

  it("reads repeated params and years", () => {
    const filters = parseFilters(
      params(
        "q=rope&tags=Flooding&tags=Rope+%26+anchor&states=Tennessee&year_from=1990&year_to=1999"
      )
    );
    expect(filters).toEqual({
      q: "rope",
      tags: ["Flooding", "Rope & anchor"],
      states: ["Tennessee"],
      countries: [],
      regions: [],
      injuries: [],
      caves: [],
      publications: [],
      has_location: undefined,
      year_from: 1990,
      year_to: 1999,
    });
  });

  it("drops invalid years, blanks and duplicates", () => {
    const filters = parseFilters(
      params("year_from=0&year_to=10000&tags=A&tags=A&tags=&countries=%20")
    );
    expect(filters.year_from).toBeUndefined();
    expect(filters.year_to).toBeUndefined();
    expect(filters.tags).toEqual(["A"]);
    expect(filters.countries).toEqual([]);
  });

  it("rejects non-numeric years", () => {
    expect(parseFilters(params("year_from=abc&year_to=19x0")).year_from).toBeUndefined();
    expect(parseFilters(params("year_to=19x0")).year_to).toBeUndefined();
  });

  it("caps each list at 20 values", () => {
    const query = Array.from({ length: 25 }, (_, i) => `tags=t${i}`).join("&");
    expect(parseFilters(params(query)).tags).toHaveLength(20);
  });
});

describe("serializeFilters", () => {
  it("round-trips names with spaces and ampersands", () => {
    const filters = {
      q: "a & b",
      tags: ["Rope & anchor", "Bad air"],
      states: ["New Mexico"],
      countries: ["United States"],
      regions: ["Upper Cumberland"],
      injuries: ["Broken leg"],
      caves: ["12"],
      publications: ["3"],
      has_location: true,
      year_from: 1990,
      year_to: 1999,
    };
    const query = serializeFilters(filters).toString();
    expect(parseFilters(params(query))).toEqual(filters);
  });

  it("omits default sort values", () => {
    expect(
      serializeFilters(
        { ...EMPTY_FILTERS, q: "x" },
        { sortBy: "relevance", sortOrder: "desc" }
      ).toString()
    ).toBe("q=x");
    expect(serializeFilters(EMPTY_FILTERS, { sortBy: "date", sortOrder: "desc" }).toString()).toBe(
      ""
    );
  });

  it("writes non-default sort values", () => {
    expect(
      serializeFilters(
        { ...EMPTY_FILTERS, q: "x" },
        { sortBy: "date", sortOrder: "asc" }
      ).toString()
    ).toBe("q=x&sort_by=date&sort_order=asc");
  });

  it("drops relevance sort when there is no query", () => {
    expect(
      serializeFilters(EMPTY_FILTERS, { sortBy: "relevance", sortOrder: "desc" }).toString()
    ).toBe("");
  });
});

describe("parseSort", () => {
  it("defaults to relevance with a query and date without", () => {
    expect(parseSort(params(""), "x")).toEqual({ sortBy: "relevance", sortOrder: "desc" });
    expect(parseSort(params(""))).toEqual({ sortBy: "date", sortOrder: "desc" });
  });

  it("falls back to defaults for invalid values", () => {
    expect(parseSort(params("sort_by=bogus&sort_order=sideways"), "x")).toEqual({
      sortBy: "relevance",
      sortOrder: "desc",
    });
  });

  it("ignores relevance without a query", () => {
    expect(parseSort(params("sort_by=relevance")).sortBy).toBe("date");
  });

  it("reads valid values", () => {
    expect(parseSort(params("sort_by=title&sort_order=asc"))).toEqual({
      sortBy: "title",
      sortOrder: "asc",
    });
  });
});

describe("filterHref", () => {
  it("builds links to pre-filtered search", () => {
    expect(filterHref({ states: ["Tennessee"] })).toBe("/?states=Tennessee");
    expect(filterHref({ tags: ["Bad air"] })).toBe("/?tags=Bad+air");
    expect(filterHref(decadeRange(1990))).toBe("/?year_from=1990&year_to=1999");
  });

  it("links to the root when nothing is set", () => {
    expect(filterHref({})).toBe("/");
  });
});

describe("activeFilterCount", () => {
  it("counts values and treats the year range as one filter", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        q: "x",
        tags: ["a", "b"],
        states: ["c"],
        countries: [],
        regions: [],
        injuries: [],
        caves: [],
        publications: [],
        year_from: 1990,
        year_to: 1999,
      })
    ).toBe(4);
  });
});

describe("toggleValue", () => {
  it("adds and removes values", () => {
    const added = toggleValue(EMPTY_FILTERS, "tags", "Flooding");
    expect(added.tags).toEqual(["Flooding"]);
    expect(toggleValue(added, "tags", "Flooding").tags).toEqual([]);
  });

  it("does not exceed the value cap", () => {
    const full = { ...EMPTY_FILTERS, tags: Array.from({ length: 20 }, (_, i) => `t${i}`) };
    expect(toggleValue(full, "tags", "extra")).toBe(full);
  });
});

describe("yearRangeLabel", () => {
  it("formats ranges", () => {
    expect(yearRangeLabel(1990, 1999)).toBe("1990–1999");
    expect(yearRangeLabel(1990, undefined)).toBe("From 1990");
    expect(yearRangeLabel(undefined, 2000)).toBe("Until 2000");
    expect(yearRangeLabel(1995, 1995)).toBe("1995");
  });
});

describe("people and entity filters", () => {
  it("parses new dimensions and ignores non-numeric ids", () => {
    const parsed = parseFilters(
      params("injuries=Broken+leg&caves=4&caves=x&publications=2&has_location=false")
    );
    expect(parsed.injuries).toEqual(["Broken leg"]);
    expect(parsed.caves).toEqual(["4"]);
    expect(parsed.publications).toEqual(["2"]);
    expect(parsed.has_location).toBe(false);
  });

  it("counts has_location as one active filter", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, has_location: true, caves: ["1"] })).toBe(2);
  });
});

describe("isFacetGroupVisible", () => {
  const one = [{ value: "a", count: 3 }];

  it("hides a single value that matches every result", () => {
    expect(isFacetGroupVisible(one, [], 3)).toBe(false);
  });

  it("shows a single value that narrows the results", () => {
    expect(isFacetGroupVisible(one, [], 10)).toBe(true);
  });

  it("shows a group with a selection", () => {
    expect(isFacetGroupVisible(one, ["a"], 3)).toBe(true);
  });
});
