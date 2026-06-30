"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Monitor, Globe, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { Button } from "../_components/button";
import { Card } from "../_components/card";
import { GameGate } from "../_components/game-gate";

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
      description: "Host or join Go tables. Take turns placing black and white stones to control territory in real-time.",
      route: "/go/online",
      icon: Globe,
      color: "from-zinc-700 to-zinc-950",
      accentColor: "text-zinc-500 dark:text-zinc-300",
      bgGradient: "bg-zinc-500/10 dark:bg-zinc-500/20",
      borderColor: "border-zinc-500/20 hover:border-zinc-500/50",
      shadow: "shadow-zinc-500/10 hover:shadow-zinc-500/25",
      badge: "Real-time"
    }
  ];

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/configs/go")
      .then(res => setConfig(res.data))
      .catch(err => console.error("Error loading go config:", err))
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
