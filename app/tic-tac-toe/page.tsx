"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { useGameConfig } from "@/lib/use-game-config";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

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
      description: "Host or join online boards. Align three of your X or O marks dynamically to beat friends in real-time.",
      route: "/tic-tac-toe/online",
      icon: Globe,
      color: "from-violet-500 to-indigo-650",
      accentColor: "text-violet-500 dark:text-indigo-400",
      bgGradient: "bg-violet-500/10 dark:bg-violet-500/20",
      borderColor: "border-violet-500/20 hover:border-violet-500/50",
      shadow: "shadow-violet-500/10 hover:shadow-violet-500/25",
      badge: "Real-time"
    }
  ];

  const { config, loading } = useGameConfig("tic-tac-toe");

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
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-fuchsia-900/10 dark:bg-fuchsia-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-cyan-900/10 dark:bg-cyan-900/20 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white shadow-xl shadow-fuchsia-500/20 mb-2 animate-pulse">
              <span className="font-black text-3xl tracking-tighter">X / O</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-550 dark:from-fuchsia-400 via-purple-550 dark:via-purple-400 to-cyan-555 dark:to-cyan-400 bg-clip-text text-transparent">
              Retro Tic-Tac-Toe
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
              Enjoy the classic game of alignment. Get three marks in a row to claim victory!
            </p>
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {visibleModes.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">No Modes Available</h3>
                <p className="text-zinc-550 dark:text-zinc-400 text-xs">All play modes are currently offline. Please check back later.</p>
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
