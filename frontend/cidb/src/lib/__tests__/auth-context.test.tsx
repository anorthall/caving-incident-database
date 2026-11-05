import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffUser } from "@/lib/auth-api";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const getCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-api", () => ({
  getCurrentUser,
  staffLogin: vi.fn(),
  staffLogout: vi.fn(),
}));

const STORAGE_KEY = "cidb_staff_user";

const staffUser: StaffUser = {
  id: 1,
  email: "staff@example.com",
  name: "Staff User",
  is_staff: true,
  is_superuser: false,
  is_editor: true,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <AuthProvider>{children}</AuthProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  localStorage.clear();
  getCurrentUser.mockReset();
});

describe("AuthProvider initial check", () => {
  it("loads until the current user resolves when nothing is stored", async () => {
    getCurrentUser.mockResolvedValue(staffUser);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(staffUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(staffUser);
  });

  it("uses the stored user without loading, then refreshes it", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...staffUser, name: "Old Name" }));
    getCurrentUser.mockResolvedValue(staffUser);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.name).toBe("Old Name");

    await waitFor(() => expect(result.current.user?.name).toBe("Staff User"));
  });

  it("clears the user when the check fails", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staffUser));
    getCurrentUser.mockRejectedValue(new Error("401"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.isLoading).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("checks once, including under StrictMode and repeated checkAuth calls", async () => {
    getCurrentUser.mockResolvedValue(staffUser);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.checkAuth();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
