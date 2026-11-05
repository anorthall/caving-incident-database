import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { markIncidentViewed } from "@/lib/viewed-incidents";
import { installMatchMedia } from "@/test/match-media";

vi.mock("@/lib/auth-context.tsx", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

vi.mock("@/lib/theme.tsx", () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

vi.mock("@/lib/feedback-context.tsx", () => ({
  default: () => ({ openFeedback: vi.fn() }),
}));

vi.mock("@/lib/api.ts", () => ({
  getRandomIncidentId: vi.fn(),
}));

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => setOpen(!open)}>
        Toggle harness
      </button>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>
  );
}

function recentItem(title: string) {
  const item = screen.getByText(title).closest("li")?.parentElement;
  if (!item) throw new Error(`No recently viewed item for ${title}`);
  return item;
}

beforeEach(() => {
  localStorage.clear();
  installMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppSidebar recently viewed", () => {
  it("does not animate incidents already viewed on mount", () => {
    markIncidentViewed(1, "Existing incident");
    render(<Harness />);

    expect(recentItem("Existing incident").style.opacity).not.toBe("0");
  });

  it("fades in a newly viewed incident only once", async () => {
    markIncidentViewed(1, "Existing incident");
    render(<Harness />);

    act(() => markIncidentViewed(2, "New incident"));
    expect(recentItem("New incident").style.opacity).toBe("0");
    await waitFor(() => expect(recentItem("New incident").style.opacity).toBe("1"));

    fireEvent.click(screen.getByText("Toggle harness"));
    expect(screen.queryByText("New incident")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Toggle harness"));

    expect(recentItem("New incident").style.opacity).not.toBe("0");
  });
});
