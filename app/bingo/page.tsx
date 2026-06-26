"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Monitor, Globe, Shield, Sparkles, Sun, Moon 
} from "lucide-react";

export default function BingoLobby() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.classList.toggle("dark", systemPrefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  };

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Play Bingo against our intelligent bot engine. Choose your difficulty level and compete to spell B-I-N-G-O first.",
      route: "/bingo/ai",
      icon: Shield,
      color: "from-blue-600 to-indigo-650",
      accentColor: "text-blue-500 dark:text-blue-400",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play locally with a friend on the same device. Boards are displayed side-by-side with automatic line trackers.",
      route: "/bingo/local",
      icon: Monitor,
      color: "from-emerald-600 to-teal-550",
      accentColor: "text-emerald-500 dark:text-emerald-455",
      bgGradient: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-500/20 hover:border-emerald-500/50",
      shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/25",
      badge: "Local 2P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Create or join a private room to play Bingo in real-time using WebSockets. Complete rows/cols to win.",
      route: "/bingo/online",
      icon: Globe,
      color: "from-purple-600 to-fuchsia-650",
      accentColor: "text-purple-500 dark:text-purple-455",
      bgGradient: "bg-purple-500/10 dark:bg-purple-500/20",
      borderColor: "border-purple-500/20 hover:border-purple-500/50",
      shadow: "shadow-purple-500/10 hover:shadow-purple-500/25",
      badge: "Real-time"
    }
  ];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Arcade
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-5xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-550 text-white shadow-xl shadow-blue-500/20 mb-2 animate-bounce">
            <span className="font-black text-3xl tracking-tighter">B</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-550 dark:from-blue-400 via-indigo-550 dark:via-indigo-400 to-purple-550 dark:to-purple-400 bg-clip-text text-transparent">
            Royal Bingo
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
            Choose a number, cross your grid, and light up the letters to declare Bingo!
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
