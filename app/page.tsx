"use client";

import React from "react";
import Link from "next/link";
import { Gamepad2, ArrowRight, Sparkles, Trophy } from "lucide-react";

export default function GameLobby() {

  const games = [
    {
      id: "ludo",
      name: "Classic Ludo",
      description: "Roll 6s, navigate the path, capture opponent tokens, and race home in this classic 2-4 player board game.",
      route: "/ludo",
      color: "from-rose-500 to-orange-500",
      accentColor: "text-rose-500 dark:text-rose-400",
      bgGradient: "bg-rose-500/10 dark:bg-rose-500/20",
      borderColor: "border-rose-500/20 hover:border-rose-500/50",
      shadow: "shadow-rose-500/10 hover:shadow-rose-500/25",
      badge: "Fast Matches"
    },
    {
      id: "snake-ladder",
      name: "Snakes & Ladders",
      description: "Climb mighty ladders to speed ahead, but beware of slithering snakes that drop you back down in this exciting race to 100.",
      route: "/snake-ladder",
      color: "from-emerald-500 to-teal-500",
      accentColor: "text-emerald-500 dark:text-emerald-400",
      bgGradient: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-500/20 hover:border-emerald-500/50",
      shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/25",
      badge: "Popular Game"
    },
    {
      id: "go",
      name: "Go (Weiqi)",
      description: "Place stones to capture territory, encircle opponent groups, and dominate the board in the ancient 2-player game of strategy.",
      route: "/go",
      color: "from-slate-700 to-zinc-900",
      accentColor: "text-slate-700 dark:text-zinc-300",
      bgGradient: "bg-slate-500/10 dark:bg-slate-500/20",
      borderColor: "border-slate-500/20 hover:border-slate-500/50",
      shadow: "shadow-slate-500/10 hover:shadow-slate-500/25",
      badge: "Pure Strategy"
    },
    {
      id: "chess",
      name: "Royal Chess",
      description: "Command your army, control the center, execute tactics, and checkmate the enemy king in the ultimate battle of wits.",
      route: "/chess",
      color: "from-indigo-500 to-violet-650",
      accentColor: "text-indigo-500 dark:text-indigo-400",
      bgGradient: "bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-indigo-500/20 hover:border-indigo-500/50",
      shadow: "shadow-indigo-500/10 hover:shadow-indigo-500/25",
      badge: "Timeless Classic"
    },
    {
      id: "tic-tac-toe",
      name: "Tic-Tac-Toe",
      description: "Get three marks in a row (X or O) to win this classic retro quick-fire arcade grid game.",
      route: "/tic-tac-toe",
      color: "from-fuchsia-550 to-cyan-500",
      accentColor: "text-fuchsia-500 dark:text-fuchsia-400",
      bgGradient: "bg-fuchsia-500/10 dark:bg-fuchsia-500/20",
      borderColor: "border-fuchsia-500/20 hover:border-fuchsia-500/50",
      shadow: "shadow-fuchsia-500/10 hover:shadow-fuchsia-500/25",
      badge: "Quick Play"
    },
    {
      id: "bingo",
      name: "Royal Bingo",
      description: "Cross out numbers randomly generated on a 5x5 grid, complete lines, and light up B-I-N-G-O to win.",
      route: "/bingo",
      color: "from-blue-600 to-purple-650",
      accentColor: "text-blue-500 dark:text-blue-400",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
      badge: "Grid Battle"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-7xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35 mb-2 animate-pulse">
            <Gamepad2 className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 dark:from-indigo-400 via-purple-500 dark:via-purple-400 to-indigo-600 dark:to-indigo-400 bg-clip-text text-transparent">
            Web Board Arcade
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg max-w-lg mx-auto">
            Experience classic board games online with real-time multiplayer lobbies or local pass & play on a single device.
          </p>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {games.map((game) => (
            <div
              key={game.id}
              className={`bg-white dark:bg-zinc-900/60 backdrop-blur-md border ${game.borderColor} rounded-3xl p-8 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between shadow-lg ${game.shadow}`}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${game.bgGradient} ${game.accentColor}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {game.badge}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold mb-3 text-zinc-900 dark:text-white">
                  {game.name}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
                  {game.description}
                </p>
              </div>

              <Link href={game.route} className="block">
                <button className={`w-full bg-gradient-to-r ${game.color} hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 group`}>
                  <span>Play Game</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-center items-center gap-6 text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-900 pt-8 select-none">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboards Coming Soon</span>
          </div>
          <span>•</span>
          <span>Fast, Light, & Offline-First Mode Enabled</span>
        </div>
      </div>
    </main>
  );
}
