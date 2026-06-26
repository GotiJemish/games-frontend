"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Monitor, Globe, Shield, Sparkles, Sun, Moon 
} from "lucide-react";

export default function ChessLobby() {
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
      description: "Match your wits against our Minimax Chess engine. Choose from Easy, Medium, or Hard difficulty levels.",
      route: "/chess/ai",
      icon: Shield,
      color: "from-blue-650 to-indigo-650",
      accentColor: "text-blue-500 dark:text-blue-400",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play a classic 2-player game locally on the same device. Completely offline with no internet required.",
      route: "/chess/local",
      icon: Monitor,
      color: "from-purple-500 to-violet-650",
      accentColor: "text-purple-500 dark:text-purple-400",
      bgGradient: "bg-purple-500/10 dark:bg-purple-500/20",
      borderColor: "border-purple-500/20 hover:border-purple-500/50",
      shadow: "shadow-purple-500/10 hover:shadow-purple-500/25",
      badge: "Local 2P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Host or join a real-time game room using WebSockets to play with friends across different devices.",
      route: "/chess/online",
      icon: Globe,
      color: "from-indigo-600 to-violet-600",
      accentColor: "text-indigo-500 dark:text-indigo-400",
      bgGradient: "bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-indigo-500/20 hover:border-indigo-500/50",
      shadow: "shadow-indigo-500/10 hover:shadow-indigo-500/25",
      badge: "Real-time"
    }
  ];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-5xl z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35 mb-2 animate-bounce">
            <span className="font-extrabold text-3xl tracking-tighter">C</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 dark:from-indigo-400 via-purple-500 dark:via-purple-400 to-indigo-600 dark:to-indigo-400 bg-clip-text text-transparent">
            Royal Chess
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
            Select your preferred game mode to begin the battle of strategy and intellect.
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
