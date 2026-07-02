"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { useGameConfig } from "@/lib/use-game-config";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

export default function BingoLobby() {

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
      description: "Host or join online bingo rooms. Match grids and cover rows to declare BINGO! in real-time.",
      route: "/bingo/online",
      icon: Globe,
      color: "from-purple-500 to-purple-650",
      accentColor: "text-purple-500 dark:text-purple-400",
      bgGradient: "bg-purple-500/10 dark:bg-purple-500/20",
      borderColor: "border-purple-500/20 hover:border-purple-500/50",
      shadow: "shadow-purple-500/10 hover:shadow-purple-500/25",
      badge: "Real-time"
    }
  ];

  const { config, loading } = useGameConfig("bingo");

  const visibleModes = modes.filter(mode => {
    if (!config) return true;
    return config.modes_enabled.includes(mode.id);
  });

  return (
    <GameGate config={config} loading={loading}>
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Link href="/">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          </Link>
        </div>

        {/* Background Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-550 text-white shadow-xl shadow-blue-500/20 mb-2 animate-bounce">
              <span className="font-black text-3xl tracking-tighter">B</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-550 dark:from-blue-400 via-indigo-550 dark:via-indigo-400 to-purple-550 dark:to-purple-400 bg-clip-text text-transparent">
              Royal Bingo
            </h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-base max-w-md mx-auto">
              Choose a number, cross your grid, and light up the letters to declare Bingo!
            </p>
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {visibleModes.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">No Modes Available</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">All play modes are currently offline. Please check back later.</p>
              </div>
            ) : (
              visibleModes.map((mode) => (
                <Card
                  key={mode.id}
                  name={mode.name}
                  description={mode.description}
                  route={mode.route}
                  color={mode.color}
                  accentColor={mode.accentColor}
                  bgGradient={mode.bgGradient}
                  borderColor={mode.borderColor}
                  shadow={mode.shadow}
                  badge={mode.badge}
                  icon={mode.icon}
                  buttonText="Play Mode"
                />
              ))
            )}
          </div>
        </div>
      </main>
    </GameGate>
  );
}
