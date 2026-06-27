"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
    >
      {/* Defer the icon until mounted so SSR markup matches the very first
          client render (avoids the "hydration mismatch" warning). */}
      {mounted ? (
        theme === "dark" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )
      ) : (
        <span className="w-5 h-5 inline-block" aria-hidden />
      )}
    </button>
  );
}
