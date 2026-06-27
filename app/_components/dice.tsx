"use client";

import React, { useState, useEffect } from "react";

interface DiceProps {
  val: number;
  isRolling: boolean;
  onClick: () => void;
  disabled: boolean;
  color?: string; // RED, GREEN, YELLOW, BLUE
}

const dotMap: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  RED: {
    border: "border-red-500/80 dark:border-red-500/60",
    bg: "bg-red-500",
    text: "text-red-500",
    ring: "ring-red-500/40"
  },
  GREEN: {
    border: "border-emerald-500/80 dark:border-emerald-500/60",
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    ring: "ring-emerald-500/40"
  },
  YELLOW: {
    border: "border-amber-500/80 dark:border-amber-500/60",
    bg: "bg-amber-500",
    text: "text-amber-500",
    ring: "ring-amber-500/40"
  },
  BLUE: {
    border: "border-blue-500/80 dark:border-blue-500/60",
    bg: "bg-blue-500",
    text: "text-blue-500",
    ring: "ring-blue-500/40"
  }
};

export function Dice({ val, isRolling, onClick, disabled, color = "RED" }: DiceProps) {
  const [displayVal, setDisplayVal] = useState(val || 1);

  // Rapidly cycle values during rolling state to mimic rolling numbers
  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayVal(Math.floor(Math.random() * 6) + 1);
      }, 70);
      return () => clearInterval(interval);
    } else {
      setDisplayVal(val || 1);
    }
  }, [isRolling, val]);

  const activeTheme = COLOR_MAP[color.toUpperCase()] || COLOR_MAP.RED;
  const dots = dotMap[displayVal] || [4];

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-14 h-14 bg-card border-2 shadow-none transition-all duration-200 outline-none flex items-center justify-center p-2.5 rounded-none active:scale-95
        ${isRolling ? "animate-dice-roll cursor-not-allowed" : ""}
        ${!disabled ? `cursor-pointer ring-4 ${activeTheme.ring} ${activeTheme.border} hover:scale-105` : "border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"}
      `}
    >
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-1 justify-items-center items-center">
        {Array(9)
          .fill(null)
          .map((_, i) => {
            const hasDot = dots.includes(i);
            return (
              <div key={i} className="w-2.5 h-2.5 flex items-center justify-center">
                {hasDot && (
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${activeTheme.bg}`}
                  />
                )}
              </div>
            );
          })}
      </div>
    </button>
  );
}
