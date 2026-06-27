"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

interface NavbarConfig {
  backHref: string | null;
  backLabel: string | null;
  showBack: boolean;
  onBackClick: ((e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void) | null;
}

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  mounted: boolean;
  navbarConfig: NavbarConfig;
  setNavbarConfig: (config: Partial<NavbarConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDocumentTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const getDefaultNavbarConfig = useCallback((path: string): NavbarConfig => {
    if (path === "/") {
      return {
        backHref: "/",
        backLabel: "Back",
        showBack: false,
        onBackClick: null,
      };
    }

    const parts = path.split("/").filter(Boolean);
    if (parts.length === 1) {
      return {
        backHref: "/",
        backLabel: "Back to Arcade",
        showBack: true,
        onBackClick: null,
      };
    }

    const game = parts[0];
    const gameNames: Record<string, string> = {
      ludo: "Ludo",
      chess: "Chess",
      go: "Go",
      "snake-ladder": "Snakes & Ladders",
      "tic-tac-toe": "Tic-Tac-Toe",
      bingo: "Bingo",
    };
    const gameName = gameNames[game] || game.charAt(0).toUpperCase() + game.slice(1);

    return {
      backHref: `/${game}`,
      backLabel: `Back to ${gameName} Lobby`,
      showBack: true,
      onBackClick: null,
    };
  }, []);

  const [navbarConfig, setNavbarConfigState] = useState<NavbarConfig>({
    backHref: "/",
    backLabel: "Back",
    showBack: true,
    onBackClick: null,
  });

  // Track page navigation to automatically compute/reset the Navbar config
  useEffect(() => {
    setNavbarConfigState(getDefaultNavbarConfig(pathname));
  }, [pathname, getDefaultNavbarConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = stored === "light" || stored === "dark"
      ? (stored as Theme)
      : (systemPrefersDark ? "dark" : "light");

    setThemeState(initialTheme);
    applyDocumentTheme(initialTheme);
    setMounted(true);

    if (!stored) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const next: Theme = e.matches ? "dark" : "light";
        setThemeState(next);
        applyDocumentTheme(next);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      applyDocumentTheme(next);
      return next;
    });
  }, []);

  const setNavbarConfig = useCallback((config: Partial<NavbarConfig>) => {
    setNavbarConfigState((prev) => ({
      ...prev,
      ...config,
    }));
  }, []);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, toggle, mounted, navbarConfig, setNavbarConfig } },
    children
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

