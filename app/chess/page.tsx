"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { useGameConfig } from "@/lib/use-game-config";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

export default function ChessLobby() {

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
      description: "Challenge opponent players in real-time. Make smart moves and claim checkmate using standard chess logic.",
      route: "/chess/online",
      icon: Globe,
      color: "from-indigo-500 to-purple-650",
      accentColor: "text-indigo-500 dark:text-indigo-400",
      bgGradient: "bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-indigo-500/20 hover:border-indigo-500/50",
      shadow: "shadow-indigo-500/10 hover:shadow-indigo-500/25",
      badge: "Real-time"
    }
  ];

  const { config, loading } = useGameConfig("chess");

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
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

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
