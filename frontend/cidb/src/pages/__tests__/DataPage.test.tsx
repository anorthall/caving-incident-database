import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CITATION, DATA_COLUMNS } from "../data-content";
import { DataPage } from "../DataPage";

describe("DataPage", () => {
  it("documents every export column, citation and licence", () => {
    render(
      <MemoryRouter>
        <DataPage />
      </MemoryRouter>
    );
    expect(DATA_COLUMNS.map((c) => c.name)).toEqual([
      "id",
      "title",
      "date",
      "year",
      "cave",
      "country",
      "state",
      "region",
      "latitude",
      "longitude",
      "tags",
      "summary",
      "url",
    ]);
    for (const column of DATA_COLUMNS) {
      expect(screen.getByText(column.name)).toBeInTheDocument();
    }
    expect(screen.getByText(CITATION)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Licence and use" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to cite" })).toBeInTheDocument();
  });
});
