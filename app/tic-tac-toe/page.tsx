"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, Sparkles } from "lucide-react";

export default function TicTacToeLobby() {

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Match your wits against our AI engine. Choose from Easy, Medium, or unbeatable Hard difficulties.",
      route: "/tic-tac-toe/ai",
      icon: Shield,
      color: "from-fuchsia-600 to-indigo-650",
      accentColor: "text-fuchsia-500 dark:text-fuchsia-455",
      bgGradient: "bg-fuchsia-500/10 dark:bg-fuchsia-500/20",
      borderColor: "border-fuchsia-500/20 hover:border-fuchsia-500/50",
      shadow: "shadow-fuchsia-500/10 hover:shadow-fuchsia-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play Tic-Tac-Toe offline with a friend on the same device. Completely serverless and instant.",
      route: "/tic-tac-toe/local",
      icon: Monitor,
      color: "from-cyan-600 to-teal-550",
      accentColor: "text-cyan-500 dark:text-cyan-455",
      bgGradient: "bg-cyan-500/10 dark:bg-cyan-500/20",
      borderColor: "border-cyan-500/20 hover:border-cyan-500/50",
      shadow: "shadow-cyan-500/10 hover:shadow-cyan-500/25",
      badge: "Local 2P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Create or join a real-time multiplayer room with WebSocket state sync. Battle players across different devices.",
      route: "/tic-tac-toe/online",
      icon: Globe,
      color: "from-violet-600 to-purple-650",
      accentColor: "text-violet-500 dark:text-violet-455",
      bgGradient: "bg-violet-500/10 dark:bg-violet-500/20",
      borderColor: "border-violet-500/20 hover:border-violet-500/50",
      shadow: "shadow-violet-500/10 hover:shadow-violet-500/25",
      badge: "Real-time"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-fuchsia-900/10 dark:bg-fuchsia-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-cyan-900/10 dark:bg-cyan-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white shadow-xl shadow-fuchsia-500/20 mb-2 animate-pulse">
            <span className="font-black text-3xl tracking-tighter">X / O</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-550 dark:from-fuchsia-400 via-purple-550 dark:via-purple-400 to-cyan-550 dark:to-cyan-400 bg-clip-text text-transparent">
            Retro Tic-Tac-Toe
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
            Enjoy the classic game of alignment. Get three marks in a row to claim victory!
          </p>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {modes.map((mode) => {
            const IconComponent = mode.icon;
            return (
              <div
                key={mode.id}
                className={`bg-white dark:bg-zinc-900/60 backdrop-blur-md border ${mode.borderColor} rounded-3xl p-8 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between shadow-lg ${mode.shadow}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${mode.bgGradient} ${mode.accentColor}`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      {mode.badge}
                    </span>
                    <IconComponent className={`w-8 h-8 ${mode.accentColor}`} />
                  </div>

                  <h2 className="text-2xl font-extrabold mb-3 text-zinc-900 dark:text-white">
                    {mode.name}
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
                    {mode.description}
                  </p>
                </div>

                <Link href={mode.route} className="block">
                  <button className={`w-full bg-gradient-to-r ${mode.color} hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 group`}>
                    <span>Play Mode</span>
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
