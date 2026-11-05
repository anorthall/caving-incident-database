import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActiveFilterChips } from "../ActiveFilterChips";
import { renderWithProviders } from "./test-utils";

const location = () => screen.getByTestId("location").textContent;

describe("ActiveFilterChips", () => {
  it("renders nothing when no filter or query is active", () => {
    const { container } = renderWithProviders(<ActiveFilterChips />);
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });

  it("formats chip labels", () => {
    renderWithProviders(
      <ActiveFilterChips />,
      "/?q=rope+failure&tags=Flooding&states=Tennessee&countries=Mexico&year_from=1990&year_to=1999"
    );
    for (const label of ["“rope failure”", "Flooding", "Tennessee", "Mexico", "1990–1999"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("formats open-ended year ranges", () => {
    renderWithProviders(<ActiveFilterChips />, "/?year_from=1990");
    expect(screen.getByText("From 1990")).toBeInTheDocument();
  });

  it("formats upper-bound-only year ranges", () => {
    renderWithProviders(<ActiveFilterChips />, "/?year_to=2000");
    expect(screen.getByText("Until 2000")).toBeInTheDocument();
  });

  it("removes a single chip", async () => {
    renderWithProviders(<ActiveFilterChips />, "/?tags=Flooding&states=Tennessee");
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Flooding" }));
    expect(location()).toBe("/?states=Tennessee");
  });

  it("removes the query chip and the year chip", async () => {
    renderWithProviders(<ActiveFilterChips />, "/?q=rope&year_from=1990&year_to=1999");
    await userEvent.click(screen.getByRole("button", { name: "Remove filter 1990–1999" }));
    expect(location()).toBe("/?q=rope");
    await userEvent.click(screen.getByRole("button", { name: "Remove filter “rope”" }));
    expect(location()).toBe("/");
  });

  it("clears everything", async () => {
    renderWithProviders(<ActiveFilterChips />, "/?q=rope&tags=Flooding&year_from=1990");
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(location()).toBe("/");
  });
});
