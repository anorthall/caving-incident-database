import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditIncidentSheet } from "@/components/staff/EditIncidentSheet";
import { RevisionHistory } from "@/components/staff/RevisionHistory";
import type { IncidentDetail } from "@/lib/api";
import { IncidentPage } from "@/pages/IncidentPage";

const api = vi.hoisted(() => ({
  getIncident: vi.fn(),
  updateIncident: vi.fn(),
  getIncidentRevisions: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: null as null | Record<string, boolean> }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/api", () => api);
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("sonner", () => ({ toast: toasts }));
vi.mock("@/components/incidents/IncidentLayoutFlat", () => ({
  IncidentLayoutFlat: () => <div>layout</div>,
}));

const incident = {
  id: 7,
  title: "Flooded cave",
  date: { raw: "2020-05" },
  summary: "Sum",
  analysis: "Ana",
  tags: [{ id: 1, name: "Flood" }],
  updated_at: "now",
} as unknown as IncidentDetail;

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/incidents/7"]}>
        <Routes>
          <Route path="/incidents/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  api.getIncident.mockResolvedValue(incident);
  api.getIncidentRevisions.mockResolvedValue([]);
});

describe("IncidentPage staff controls", () => {
  it("hides edit and history from the public", async () => {
    wrap(<IncidentPage />);
    await screen.findByText("layout");
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByText("Revision history")).toBeNull();
    expect(api.getIncidentRevisions).not.toHaveBeenCalled();
  });

  it("hides them from non-editor users", async () => {
    auth.user = { is_editor: false, is_staff: false };
    wrap(<IncidentPage />);
    await screen.findByText("layout");
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("shows them to editors", async () => {
    auth.user = { is_editor: true, is_staff: false };
    wrap(<IncidentPage />);
    expect(await screen.findByRole("button", { name: /edit/i })).toBeTruthy();
    expect(await screen.findByText("No edits yet.")).toBeTruthy();
  });
});

describe("EditIncidentSheet", () => {
  it("submits the form and toasts success", async () => {
    api.updateIncident.mockResolvedValue(incident);
    wrap(<EditIncidentSheet incident={incident} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Rope, Flood" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith("Incident updated"));
    expect(api.updateIncident).toHaveBeenCalledWith(7, {
      title: "New",
      summary: "Sum",
      date: "2020-05",
      tags: ["Rope", "Flood"],
      analysis: "Ana",
    });
  });

  it("toasts the error message on failure", async () => {
    api.updateIncident.mockRejectedValue(new Error("Invalid date"));
    wrap(<EditIncidentSheet incident={incident} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Invalid date"));
  });
});

describe("RevisionHistory", () => {
  it("renders revisions with before and after", async () => {
    api.getIncidentRevisions.mockResolvedValue([
      {
        id: 1,
        editor_name: "Ed",
        created_at: "2026-01-01T00:00:00Z",
        changes: { title: { before: "Old", after: "New" } },
      },
    ]);
    wrap(<RevisionHistory incidentId={7} />);
    expect(await screen.findByText("Ed")).toBeTruthy();
    expect(screen.getByText("Old")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
  });
});
