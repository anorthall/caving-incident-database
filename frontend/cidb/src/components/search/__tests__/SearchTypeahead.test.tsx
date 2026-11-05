import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchTypeahead } from "@/components/search/SearchTypeahead";
import { getSearchSuggestions } from "@/lib/api";

vi.mock("@/lib/api", () => ({ getSearchSuggestions: vi.fn() }));

function Harness({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SearchTypeahead value={value} onValueChange={setValue} onSubmit={onSubmit} placeholder="" />
    </QueryClientProvider>
  );
}

describe("SearchTypeahead", () => {
  beforeEach(() => {
    vi.mocked(getSearchSuggestions).mockResolvedValue({
      suggestions: ["cave rescue", "cave dive"],
    });
  });

  it("shows debounced suggestions and supports keyboard selection", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cav" } });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
    expect(await screen.findByRole("option", { name: "cave rescue" })).toBeInTheDocument();
    expect(getSearchSuggestions).toHaveBeenCalledWith("cav");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("cave dive");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  });

  it("closes on escape and does not fetch for short input", () => {
    render(<Harness onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c" } });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
  });
});
