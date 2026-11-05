import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NoResultsMessage } from "../NoResultsMessage";

describe("NoResultsMessage", () => {
  it("hides the clear button without a handler", () => {
    render(<NoResultsMessage />);
    expect(screen.queryByRole("button", { name: "Clear all filters" })).not.toBeInTheDocument();
  });

  it("calls the handler when filters are active", async () => {
    const onClearFilters = vi.fn();
    render(<NoResultsMessage onClearFilters={onClearFilters} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
