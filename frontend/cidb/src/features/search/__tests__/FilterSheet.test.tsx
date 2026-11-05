import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacets } from "@/lib/api";

import { FilterSheet } from "../FilterSheet";
import { FACETS } from "./facets-fixture";
import { renderWithProviders } from "./test-utils";

vi.mock("@/lib/api", () => ({ getFacets: vi.fn() }));

beforeEach(() => {
  vi.mocked(getFacets).mockResolvedValue(FACETS);
});

describe("FilterSheet", () => {
  it("moves focus into the sheet without focusing a search input", async () => {
    renderWithProviders(<FilterSheet resultCount={3} />, "/?q=rope");
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(document.activeElement?.tagName).not.toBe("INPUT");
  });
});
