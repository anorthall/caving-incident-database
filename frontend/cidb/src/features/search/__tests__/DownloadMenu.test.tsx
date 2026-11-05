import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EXPORT_MAX_ROWS } from "@/constants";
import { exportUrl } from "@/lib/api";

import { DownloadMenu } from "../DownloadMenu";

const FILTERS = { q: "rope", tags: ["Rescue"], states: [], countries: ["Mexico"], year_from: 1990 };

describe("exportUrl", () => {
  it("includes filters and format", () => {
    const url = exportUrl(FILTERS, "csv");
    expect(url).toContain("/incidents/export?");
    expect(url).toContain("q=rope");
    expect(url).toContain("tags=Rescue");
    expect(url).toContain("countries=Mexico");
    expect(url).toContain("year_from=1990");
    expect(url).toContain("format=csv");
  });
});

describe("DownloadMenu", () => {
  it("offers CSV and JSON links for the current filters", async () => {
    render(<DownloadMenu filters={FILTERS} total={12} />);
    await userEvent.click(screen.getByRole("button", { name: /download/i }));
    expect(screen.getByRole("menuitem", { name: "CSV" })).toHaveAttribute(
      "href",
      exportUrl(FILTERS, "csv")
    );
    expect(screen.getByRole("menuitem", { name: "JSON" })).toHaveAttribute(
      "href",
      exportUrl(FILTERS, "json")
    );
  });

  it("is disabled above the cap", () => {
    render(<DownloadMenu filters={FILTERS} total={EXPORT_MAX_ROWS + 1} />);
    expect(screen.getByRole("button", { name: /download/i })).toBeDisabled();
    expect(screen.getByText(/limited to 5,000 results/i)).toBeVisible();
  });

  it("is enabled at the cap", () => {
    render(<DownloadMenu filters={FILTERS} total={EXPORT_MAX_ROWS} />);
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });
});
