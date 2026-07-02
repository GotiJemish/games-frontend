"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import { useGameConfig } from "@/lib/use-game-config";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

export default function CheckersLobby() {

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Challenge our minimax AI engine at Easy, Medium, or Hard difficulty. Can you outsmart the machine?",
      route: "/checkers/ai",
      icon: Shield,
      color: "from-red-600 to-orange-550",
      accentColor: "text-red-500 dark:text-red-400",
      bgGradient: "bg-red-500/10 dark:bg-red-500/20",
      borderColor: "border-red-500/20 hover:border-red-500/50",
      shadow: "shadow-red-500/10 hover:shadow-red-500/25",
      badge: "Single Player"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play Checkers offline with a friend on the same device. Take turns jumping and capturing pieces.",
      route: "/checkers/local",
      icon: Monitor,
      color: "from-amber-600 to-yellow-500",
      accentColor: "text-amber-500 dark:text-amber-400",
      bgGradient: "bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-amber-500/20 hover:border-amber-500/50",
      shadow: "shadow-amber-500/10 hover:shadow-amber-500/25",
      badge: "Local 2P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Host or join online rooms. Compete against friends in real-time checkers battles over WebSockets.",
      route: "/checkers/online",
      icon: Globe,
      color: "from-rose-500 to-pink-600",
      accentColor: "text-rose-500 dark:text-rose-400",
      bgGradient: "bg-rose-500/10 dark:bg-rose-500/20",
      borderColor: "border-rose-500/20 hover:border-rose-500/50",
      shadow: "shadow-rose-500/10 hover:shadow-rose-500/25",
      badge: "Real-time"
    }
  ];

  const { config, loading } = useGameConfig("checkers");

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
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-red-900/10 dark:bg-red-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xl shadow-red-500/20 mb-2 animate-pulse">
              <span className="font-black text-2xl">♔</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 dark:from-red-400 via-orange-500 dark:via-orange-400 to-amber-500 dark:to-amber-400 bg-clip-text text-transparent">
              Classic Checkers
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
              Jump, capture, and king your pieces. Eliminate all opponent pieces or block their moves to win!
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
