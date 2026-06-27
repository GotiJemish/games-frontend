"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "@/lib/use-theme";

interface NavbarProps {
  /** Where the left "Back" link points. Defaults to using context config. */
  backHref?: string;
  /** Label shown inside the back pill. Defaults to using context config. */
  backLabel?: string;
  /** Set to false to hide the back link. Defaults to using context config. */
  showBack?: boolean;
  /** Custom back button click handler. */
  onBackClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

/**
 * Sticky top bar with a left "Back" pill and a right theme toggle.
 *
 * Reads layout configuration dynamically from the ThemeContext, allowing
 * pages to dynamically customize back actions, labels, or suppress back links.
 */
export function Navbar({
  backHref,
  backLabel,
  showBack,
  onBackClick,
}: NavbarProps) {
  let context;
  try {
    context = useTheme();
  } catch (e) {
    // Fail-safe if rendered outside ThemeProvider
  }

  const activeShowBack = showBack !== undefined ? showBack : (context?.navbarConfig.showBack ?? true);
  const activeBackHref = backHref !== undefined ? backHref : (context?.navbarConfig.backHref ?? "/");
  const activeBackLabel = backLabel !== undefined ? backLabel : (context?.navbarConfig.backLabel ?? "Back");
  const activeOnBackClick = onBackClick !== undefined ? onBackClick : (context?.navbarConfig.onBackClick ?? null);

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/60 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-900">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
        {activeShowBack ? (
          activeOnBackClick ? (
            <button
              onClick={activeOnBackClick}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> {activeBackLabel}
            </button>
          ) : (
            <Link
              href={activeBackHref ?? "/"}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> {activeBackLabel}
            </Link>
          )
        ) : (
          <span className="w-9 h-9" aria-hidden />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
