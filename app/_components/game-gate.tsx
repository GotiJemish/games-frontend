"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "./button";

interface GameGateProps {
  config: { is_public: boolean } | null;
  loading: boolean;
  children: React.ReactNode;
}

export function GameGate({ config, loading, children }: GameGateProps) {
  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-zinc-550 text-sm flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading lobby...
        </div>
      </main>
    );
  }

  if (config && !config.is_public) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2 text-zinc-900 dark:text-white">Game Closed</h1>
          <p className="text-zinc-505 dark:text-zinc-400 text-sm mb-6">
            This game has been temporarily disabled by the administrator.
          </p>
          <Link href="/">
            <Button variant="secondary" size="md">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
