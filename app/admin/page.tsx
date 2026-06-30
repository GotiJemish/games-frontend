"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { Button } from "../_components/button";
import { Input } from "../_components/input";
import { Table } from "../_components/table";
import { 
  Shield, Key, Lock, ArrowLeft, Sparkles, Check, AlertCircle, Save, LayoutGrid, List 
} from "lucide-react";

interface GameConfig {
  id: string;
  is_public: boolean;
  modes_enabled: string[];
}

const GAME_NAMES: Record<string, string> = {
  "ludo": "Classic Ludo",
  "snake-ladder": "Snakes & Ladders",
  "go": "Go (Weiqi)",
  "chess": "Royal Chess",
  "tic-tac-toe": "Tic-Tac-Toe",
  "bingo": "Royal Bingo",
  "monopoly": "Monopoly Royale",
  "checkers": "Classic Checkers"
};

export default function AdminPanel() {
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "admin123") {
      setIsAuthorized(true);
      setAuthError("");
      localStorage.setItem("admin_auth", "true");
    } else {
      setAuthError("Incorrect Admin Passcode. Please try again.");
    }
  };

  useEffect(() => {
    const isAuthed = localStorage.getItem("admin_auth") === "true";
    if (isAuthed) {
      setIsAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchConfigs();
    }
  }, [isAuthorized]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/configs");
      setConfigs(res.data);
    } catch (err) {
      console.error("Failed to fetch game configs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = (id: string) => {
    setConfigs(prev => prev.map(cfg => {
      if (cfg.id === id) {
        return { ...cfg, is_public: !cfg.is_public };
      }
      return cfg;
    }));
  };

  const handleToggleMode = (id: string, mode: string) => {
    setConfigs(prev => prev.map(cfg => {
      if (cfg.id === id) {
        const modes = [...cfg.modes_enabled];
        if (modes.includes(mode)) {
          return { ...cfg, modes_enabled: modes.filter(m => m !== mode) };
        } else {
          return { ...cfg, modes_enabled: [...modes, mode] };
        }
      }
      return cfg;
    }));
  };

  const handleSaveConfigs = async () => {
    try {
      setSaveStatus("saving");
      for (const cfg of configs) {
        await api.put(`/admin/configs/${cfg.id}`, {
          is_public: cfg.is_public,
          modes_enabled: cfg.modes_enabled
        });
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      console.error("Failed to save configs:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-zinc-955 text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Glow Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 text-indigo-400 border border-zinc-700/60 shadow-xl mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Admin Settings Locked
            </h1>
            <p className="text-zinc-400 text-xs mt-1">Please authenticate with the admin passcode to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              type="password"
              required
              label="Admin Passcode"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              leftIcon={<Key className="w-4 h-4 text-zinc-550" />}
              error={authError}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
            >
              Unlock Dashboard
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto z-10 space-y-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-7 h-7 text-indigo-455 fill-none" /> Arcade Admin Console
            </h1>
            <p className="text-zinc-400 text-xs">Configure game availability and enabled gameplay modes dynamically.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link href="/" className="flex-1 md:flex-initial">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="w-full md:w-auto"
              >
                Exit Console
              </Button>
            </Link>
            <Button
              onClick={handleSaveConfigs}
              isLoading={saveStatus === "saving"}
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
              className="flex-1 md:flex-initial"
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex justify-between items-center bg-zinc-900/30 p-2 border border-zinc-850 rounded-2xl max-w-xs select-none">
          <button
            onClick={() => setViewMode("card")}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer
              ${viewMode === "card" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}
            `}
          >
            <LayoutGrid className="w-4 h-4" /> Grid Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer
              ${viewMode === "table" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}
            `}
          >
            <List className="w-4 h-4" /> Detailed Table
          </button>
        </div>

        {saveStatus === "success" && (
          <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl max-w-md mx-auto animate-pulse">
            <Check className="w-4 h-4" /> Configurations updated and saved successfully!
          </div>
        )}

        {saveStatus === "error" && (
          <div className="text-red-400 text-xs font-semibold flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl max-w-md mx-auto">
            <AlertCircle className="w-4 h-4" /> Error saving configurations. Check backend connection.
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-zinc-550 text-sm">Loading configurations...</div>
        ) : viewMode === "card" ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((config) => {
              const name = GAME_NAMES[config.id] || config.id;
              const hasAI = config.id !== "monopoly";

              return (
                <div 
                  key={config.id}
                  className={`bg-zinc-900/60 border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300
                    ${config.is_public ? "border-zinc-800 hover:border-zinc-700/60 shadow-lg hover:shadow-indigo-500/5" : "border-zinc-900 opacity-60"}
                  `}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-850">
                      <div>
                        <h2 className="text-lg font-extrabold text-white">{name}</h2>
                        <span className="text-[10px] text-zinc-500 font-mono select-all">{config.id}</span>
                      </div>
                      
                      {/* Public Toggle Switch */}
                      <button
                        onClick={() => handleTogglePublic(config.id)}
                        className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-205 cursor-pointer outline-none border border-transparent
                          ${config.is_public ? "bg-emerald-600" : "bg-zinc-800"}
                        `}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-205 shadow-sm
                          ${config.is_public ? "translate-x-5.5" : "translate-x-0"}
                        `} />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Enabled Game Modes</div>
                      
                      <div className="space-y-2">
                        {/* Local Pass & Play Mode */}
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={config.modes_enabled.includes("local")}
                            onChange={() => handleToggleMode(config.id, "local")}
                            className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950 focus:ring-indigo-500 focus:ring-offset-zinc-900 focus:ring-1"
                          />
                          <span className={config.modes_enabled.includes("local") ? "text-zinc-200" : "text-zinc-500"}>
                            Local Pass & Play
                          </span>
                        </label>

                        {/* Online WebSocket Mode */}
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={config.modes_enabled.includes("online")}
                            onChange={() => handleToggleMode(config.id, "online")}
                            className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950 focus:ring-indigo-500 focus:ring-offset-zinc-900 focus:ring-1"
                          />
                          <span className={config.modes_enabled.includes("online") ? "text-zinc-200" : "text-zinc-500"}>
                            Online Multiplayer
                          </span>
                        </label>

                        {/* VS Computer / AI Mode */}
                        {hasAI ? (
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={config.modes_enabled.includes("ai")}
                              onChange={() => handleToggleMode(config.id, "ai")}
                              className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950 focus:ring-indigo-500 focus:ring-offset-zinc-900 focus:ring-1"
                            />
                            <span className={config.modes_enabled.includes("ai") ? "text-zinc-200" : "text-zinc-500"}>
                              VS Computer (AI)
                            </span>
                          </label>
                        ) : (
                          <div className="flex items-center gap-2.5 text-zinc-650 text-xs select-none">
                            <input
                              type="checkbox"
                              disabled
                              checked={false}
                              className="w-4 h-4 rounded border-zinc-850 bg-zinc-950 opacity-40"
                            />
                            <span className="italic opacity-50">VS Computer (Not Supported)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-850 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 font-medium">Status:</span>
                    {config.is_public ? (
                      <span className="text-emerald-450 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-current" /> Public
                      </span>
                    ) : (
                      <span className="text-zinc-650 font-bold uppercase tracking-wider">Hidden / Disabled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View using Reusable Table Component */
          <Table
            headers={["Game Name", "Identifier Key", "Public Status", "Enabled Modes Config", "Visibility Status"]}
            data={configs}
            renderRow={(config: GameConfig) => {
              const name = GAME_NAMES[config.id] || config.id;
              const hasAI = config.id !== "monopoly";

              return (
                <tr key={config.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-5 py-4 font-bold text-white text-xs md:text-sm">{name}</td>
                  <td className="px-5 py-4 text-[10px] text-zinc-500 font-mono">{config.id}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleTogglePublic(config.id)}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-205 cursor-pointer outline-none border border-transparent
                        ${config.is_public ? "bg-emerald-600" : "bg-zinc-800"}
                      `}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-205 shadow-sm
                        ${config.is_public ? "translate-x-5.5" : "translate-x-0"}
                      `} />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <div className="flex flex-wrap gap-4 items-center">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.modes_enabled.includes("local")}
                          onChange={() => handleToggleMode(config.id, "local")}
                          className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950"
                        />
                        <span className={config.modes_enabled.includes("local") ? "text-zinc-200 font-semibold" : "text-zinc-550"}>Local</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.modes_enabled.includes("online")}
                          onChange={() => handleToggleMode(config.id, "online")}
                          className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950"
                        />
                        <span className={config.modes_enabled.includes("online") ? "text-zinc-200 font-semibold" : "text-zinc-550"}>Online</span>
                      </label>
                      {hasAI ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.modes_enabled.includes("ai")}
                            onChange={() => handleToggleMode(config.id, "ai")}
                            className="w-4 h-4 rounded border-zinc-700 text-indigo-650 bg-zinc-950"
                          />
                          <span className={config.modes_enabled.includes("ai") ? "text-zinc-200 font-semibold" : "text-zinc-550"}>AI</span>
                        </label>
                      ) : (
                        <span className="text-[10px] italic text-zinc-650">AI Not Supported</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[10px]">
                    {config.is_public ? (
                      <span className="text-emerald-450 font-bold uppercase tracking-wider">Public</span>
                    ) : (
                      <span className="text-zinc-650 font-bold uppercase tracking-wider">Hidden</span>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>
    </main>
  );
}
