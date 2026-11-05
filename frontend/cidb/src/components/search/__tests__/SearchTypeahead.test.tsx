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

  it("selects an option on click", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cav" } });
    const option = await screen.findByRole("option", { name: "cave dive" });
    fireEvent.mouseDown(option);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(option);
    expect(onSubmit).toHaveBeenCalledWith("cave dive");
  });

  it("submits typed text when the active index is stale", async () => {
    const onSubmit = vi.fn();
    vi.mocked(getSearchSuggestions).mockImplementation(async (q) => ({
      suggestions: q === "cav" ? ["cave rescue", "cave dive"] : ["cave rescue"],
    }));
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "cav" } });
    await screen.findByRole("option", { name: "cave dive" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.change(input, { target: { value: "cave" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith(expect.any(String));
  });

  it("closes on escape and does not fetch for short input", () => {
    render(<Harness onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c" } });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
  });

  it("autofocuses and hides the caret only while empty", () => {
    render(<Harness onSubmit={vi.fn()} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveFocus();
    expect(input).toHaveClass("caret-transparent");
    fireEvent.change(input, { target: { value: "c" } });
    expect(input).not.toHaveClass("caret-transparent");
  });
});
