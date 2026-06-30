"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Monitor, Globe, Sparkles, Building2, AlertCircle, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

export default function MonopolyLobby() {
  const modes = [
    {
      id: "local",
      name: "Pass & Play",
      description: "Play Monopoly offline on a single device. Choose from 2, 3, or 4 players with custom name entries.",
      route: "/monopoly/local",
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
      description: "Host or join a Monopoly lobby. Play in real-time using WebSockets with friends across different devices.",
      route: "/monopoly/online",
      icon: Globe,
      color: "from-blue-600 to-indigo-650",
      accentColor: "text-blue-500 dark:text-blue-455",
      bgGradient: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/20 hover:border-blue-500/50",
      shadow: "shadow-blue-500/10 hover:shadow-blue-500/25",
      badge: "Real-time"
    }
  ];

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/configs/monopoly")
      .then(res => setConfig(res.data))
      .catch(err => console.error("Error loading monopoly config:", err))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-red-900/10 dark:bg-red-900/20 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-4xl z-10 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-550/35 mb-2 animate-bounce">
              <Building2 className="w-9 h-9" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-555 dark:from-amber-400 via-orange-500 dark:via-orange-400 to-red-500 dark:to-red-455 bg-clip-text text-transparent">
              Monopoly Royale
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-md mx-auto">
              Roll the dice, acquire valuable properties, build houses and hotels, and bankrupt your friends in the ultimate board game experience.
            </p>
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-2xl mx-auto">
            {visibleModes.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 w-full">
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
