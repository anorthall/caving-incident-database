import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useStaffCommands } from "@/hooks/use-staff-commands";

import { AppSidebar } from "@/components/layout/AppSidebar.tsx";
import { FeedbackModal } from "@/components/forms/FeedbackModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCookie } from "@/lib/cookies";
import { type Theme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { MOBILE_BREAKPOINT, SIDEBAR_COOKIE_KEY } from "@/constants.ts";

function getSidebarStateFromCookie(): boolean {
  if (typeof document === "undefined") return true;
  return getCookie(SIDEBAR_COOKIE_KEY) === "true";
}

export function RootLayout() {
  const sidebarOpen = getSidebarStateFromCookie();
  const navigate = useNavigate();
  const isSearchRoute = useLocation().pathname === "/";
  const [searchParams] = useSearchParams();
  const isLanding = isSearchRoute && searchParams.size === 0;
  const urlQuery = isSearchRoute ? (searchParams.get("q") ?? "") : "";
  const { handleStaffCommand } = useStaffCommands();
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        const handled = await handleStaffCommand(query);
        if (handled) {
          setQuery("");
          return;
        }
        navigate(`/?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, navigate, handleStaffCommand]
  );

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen flex flex-col">
          <header className="border-b sm:sticky sm:top-0 bg-background z-10 px-4">
            <div className="h-16 flex justify-between items-center">
              <SidebarTrigger className="cursor-pointer" />

              <form
                onSubmit={handleSearch}
                aria-hidden={isLanding}
                className={cn(
                  "max-w-3xl w-full px-4 transition-all duration-300 ease-in-out",
                  isLanding && "invisible"
                )}
              >
                <Input
                  type="text"
                  placeholder={isMobile ? "Search" : "Search incidents..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  aria-label="Search incidents"
                  className="h-10 text-base w-full"
                />
              </form>

              <div
                className={`flex items-center shrink-0 justify-self-end transition-all duration-200 ease-out ${isSearchFocused ? "max-w-0 opacity-0 scale-90 sm:max-w-none sm:opacity-100 sm:scale-100" : "opacity-100 scale-100"}`}
                style={{ overflow: "hidden" }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Change theme">
                      <ThemeIcon className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value) => setTheme(value as Theme)}
                    >
                      <DropdownMenuRadioItem value="light">
                        <Sun className="h-4 w-4" />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <Moon className="h-4 w-4" />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <Monitor className="h-4 w-4" />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "mx-auto px-4 py-6 grow w-full",
              isSearchRoute ? "max-w-6xl" : "max-w-3xl"
            )}
          >
            <Outlet />
          </main>
        </div>
      </SidebarInset>
      <FeedbackModal />
    </SidebarProvider>
  );
}
