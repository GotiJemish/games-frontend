"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, Sparkles } from "lucide-react";

export default function LudoLobby() {

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Play against 3 computer bots in a fast-paced Ludo match. Roll sixes to escape the yard!",
      route: "/ludo/ai",
      icon: Shield,
      color: "from-red-500 to-amber-500",
      accentColor: "text-red-550 dark:text-red-400",
      bgGradient: "bg-red-500/10 dark:bg-red-500/20",
      borderColor: "border-red-500/20 hover:border-red-500/50",
      shadow: "shadow-red-500/10 hover:shadow-red-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play Ludo offline on a single device. Choose from 2, 3, or 4 players with custom name entries.",
      route: "/ludo/local",
      icon: Monitor,
      color: "from-emerald-500 to-teal-650",
      accentColor: "text-emerald-600 dark:text-emerald-450",
      bgGradient: "bg-emerald-550/10 dark:bg-emerald-550/20",
      borderColor: "border-emerald-500/20 hover:border-emerald-500/50",
      shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/25",
      badge: "Local 2-4P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Host or join a Ludo room code. Play in real-time using WebSockets with friends across different devices.",
      route: "/ludo/online",
      icon: Globe,
      color: "from-blue-600 to-indigo-650",
      accentColor: "text-blue-500 dark:text-blue-450",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
      badge: "Real-time"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-red-900/10 dark:bg-red-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-xl shadow-red-650/35 mb-2 animate-bounce">
            <span className="font-extrabold text-3xl tracking-tighter">L</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-red-550 dark:from-red-400 via-amber-500 dark:via-amber-400 to-blue-500 dark:to-blue-400 bg-clip-text text-transparent">
            Royal Ludo
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
            Roll the dice, race your tokens, and knock out your opponents in this classic arcade board game.
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
