import { vi } from "vitest";

type Listener = () => void;

export interface MatchMediaController {
  setMatches: (query: string, matches: boolean) => void;
  listenerCount: (query: string) => number;
}

export function installMatchMedia(initial: Record<string, boolean> = {}): MatchMediaController {
  const matches = new Map(Object.entries(initial));
  const listeners = new Map<string, Set<Listener>>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return matches.get(query) ?? false;
      },
      addEventListener: (_: string, listener: Listener) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)?.add(listener);
      },
      removeEventListener: (_: string, listener: Listener) => {
        listeners.get(query)?.delete(listener);
      },
    }))
  );

  return {
    setMatches: (query, value) => {
      matches.set(query, value);
      listeners.get(query)?.forEach((listener) => listener());
    },
    listenerCount: (query) => listeners.get(query)?.size ?? 0,
  };
}
