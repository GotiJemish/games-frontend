"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, Sparkles } from "lucide-react";

export default function GoLobby() {

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Play Go against our specialized bot engine. Perfect for practice and developing tactics.",
      route: "/go/ai",
      icon: Shield,
      color: "from-slate-700 to-slate-900",
      accentColor: "text-slate-500 dark:text-slate-400",
      bgGradient: "bg-slate-500/10 dark:bg-slate-500/20",
      borderColor: "border-slate-500/20 hover:border-slate-500/50",
      shadow: "shadow-slate-500/10 hover:shadow-slate-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play Go offline on a single device. Features local group capturing, Ko checking, and area score calculation.",
      route: "/go/local",
      icon: Monitor,
      color: "from-[#dfaf70] to-[#c99553]",
      accentColor: "text-amber-600 dark:text-amber-500",
      bgGradient: "bg-amber-550/10 dark:bg-amber-550/20",
      borderColor: "border-amber-500/20 hover:border-amber-500/50",
      shadow: "shadow-amber-500/10 hover:shadow-amber-500/25",
      badge: "Local 2P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Create or join a real-time lobby using WebSockets. Play with friends online and track captured stones.",
      route: "/go/online",
      icon: Globe,
      color: "from-indigo-600 to-slate-800",
      accentColor: "text-indigo-500 dark:text-indigo-400",
      bgGradient: "bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-indigo-500/20 hover:border-indigo-500/50",
      shadow: "shadow-indigo-500/10 hover:shadow-indigo-500/25",
      badge: "Real-time"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/10 dark:bg-slate-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-850 text-white shadow-xl shadow-slate-850/35 mb-2 animate-bounce">
            <span className="font-extrabold text-3xl tracking-tighter">G</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-700 dark:from-slate-400 via-amber-650 dark:via-amber-500 to-slate-800 dark:to-slate-400 bg-clip-text text-transparent">
            Royal Go (Weiqi)
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
            Experience the ancient game of surrounding territory. Select your game mode to begin.
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
