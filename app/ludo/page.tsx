"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft, Settings } from "lucide-react";
import { useGameConfig } from "@/lib/use-game-config";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

export default function LudoLobby() {

  const modes = [
    {
      id: "ai",
      name: "Play vs. Computer",
      description: "Match your wits against 1-3 computer bots. Choose colors and select custom rule variations before rolling.",
      route: "/ludo/ai",
      icon: Shield,
      color: "from-amber-500 to-orange-550",
      accentColor: "text-amber-550 dark:text-amber-400",
      bgGradient: "bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-amber-500/20 hover:border-amber-500/50",
      shadow: "shadow-amber-500/10 hover:shadow-amber-500/25",
      badge: "VS Computer"
    },
    {
      id: "local",
      name: "Pass & Play",
      description: "Play offline on a single device. Features turn-based rolling, active coin selections, and home tracks.",
      route: "/ludo/local",
      icon: Monitor,
      color: "from-red-500 to-rose-600",
      accentColor: "text-red-550 dark:text-red-400",
      bgGradient: "bg-red-500/10 dark:bg-red-550/20",
      borderColor: "border-red-500/20 hover:border-red-500/50",
      shadow: "shadow-red-500/10 hover:shadow-red-500/25",
      badge: "Local 2-4P"
    },
    {
      id: "online",
      name: "Online Multiplayer",
      description: "Create or join online rooms. Roll dice and capture opponent coins in real-time over active socket lines.",
      route: "/ludo/online",
      icon: Globe,
      color: "from-blue-500 to-indigo-650",
      accentColor: "text-blue-500 dark:text-blue-400",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
    },
    {
      id: "custom",
      name: "Custom Game",
      description: "Play with up to 20 players and 4-10 pawns on a dynamically generated scalable Ludo board.",
      route: "/ludo/custom",
      icon: Settings,
      color: "from-emerald-500 to-teal-600",
      accentColor: "text-emerald-550 dark:text-emerald-400",
      bgGradient: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-500/20 hover:border-emerald-500/50",
      shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/25",
      badge: "Up to 20P"
    }
  ];

  const { config, loading } = useGameConfig("ludo");

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
