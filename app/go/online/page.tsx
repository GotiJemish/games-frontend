"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { useTheme } from "@/lib/use-theme";
import { 
  User, ArrowLeft, Play, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Award, Globe, Copy, Check, Users, Plus
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // waiting, playing, finished
  current_turn: string | null;
  last_roll: number | null;
  has_rolled: boolean;
  winner: string | null;
  board_state: {
    size: number;
    stones: Record<string, string>; // "r_c" -> "BLACK" or "WHITE"
    captured: Record<string, number>;
    consecutive_passes: number;
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "move" | "roll";
  username?: string;
  color?: string;
  message: string;
}

export default function GoOnlinePage() {
  const { theme } = useTheme();
  const [actionType, setActionType] = useState<"select" | "create" | "join">("select");
  const [lobbyBoardSize, setLobbyBoardSize] = useState<9 | 13 | 19>(9);

  // Form input states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("BLACK"); // BLACK or WHITE
  const [gameIdInput, setGameIdInput] = useState("");

  // Game states
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API URLs
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll chats
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);



  const copyToClipboard = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // WS Connect
  const connectWebSocket = (gId: string, uName: string) => {
    if (wsRef.current) wsRef.current.close();

    const wsProto = httpUrl.startsWith("https") ? "wss:" : "ws:";
    const cleanHost = httpUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const wsUrl = `${wsProto}//${cleanHost}/go/${gId}/ws?username=${encodeURIComponent(uName)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setErrorMsg("");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "state") {
        setOnlineGame(data.game);
      } else if (data.type === "move") {
        setOnlineGame(data.game);
        setChatMessages(prev => [...prev, {
          type: "move",
          username: data.username,
          color: data.color,
          message: data.message
        }]);
      } else if (data.type === "chat") {
        setChatMessages(prev => [...prev, {
          type: "chat",
          username: data.username,
          color: data.color,
          message: data.message
        }]);
      } else if (data.type === "system") {
        setChatMessages(prev => [...prev, {
          type: "system",
          message: data.message
        }]);
      } else if (data.type === "error") {
        setErrorMsg(data.message);
        setTimeout(() => setErrorMsg(""), 4000);
      }
    };

    ws.onclose = () => {
      setIsJoined(false);
      setOnlineGame(null);
    };
  };

  const createLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 1";
    const myCol = color === "BLACK" ? "BLACK" : "WHITE";
    
    try {
      const createRes = await api.post(`go/createLobby`, {
        username: uName,
        color: myCol,
        game_type: "go",
        board_size: lobbyBoardSize
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      setOnlineGame(lobby);
      setGameId(gId);
      setIsJoined(true);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const joinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 2";
    const gId = gameIdInput.trim();
    if (!gId) {
      setErrorMsg("Please enter a room code");
      return;
    }
    const myCol = color === "BLACK" ? "BLACK" : "WHITE";

    try {
      const joinRes = await api.post(`go/${gId}/joinLobby`, {
        username: uName,
        color: myCol
      });
      
      setOnlineGame(joinRes.data);
      setGameId(gId);
      setIsJoined(true);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to join room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      const startRes = await api.post(`go/${gameId}/start`);
      setOnlineGame(startRes.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start match");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleAddBot = async () => {
    if (!gameId) return;
    const takenColors = game?.players.map(p => p.color) || [];
    const availableColors = ["BLACK", "WHITE"].filter(c => !takenColors.includes(c));
    if (availableColors.length === 0) return;
    const botCol = availableColors[0];
    
    try {
      const res = await api.post(`go/${gameId}/add_bot`, {
        username: `Computer (Bot) ${botCol}`,
        color: botCol
      });
      setOnlineGame(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to add bot");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const game = onlineGame;
  const myPlayer = game?.players?.find(p => p.username === username);
  const myColor = myPlayer?.color;
  const isMyTurn = game?.status === "playing" && game?.current_turn === myColor;

  const handlePlaceStone = (row: number, col: number) => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "place_stone",
      row,
      col
    }));
  };

  const handlePass = () => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "place_stone",
      pass_turn: true
    }));
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsRef.current || !chatInput.trim()) return;

    wsRef.current.send(JSON.stringify({
      action: "chat",
      message: chatInput.trim()
    }));
    setChatInput("");
  };

  const handleLeaveGame = () => {
    if (wsRef.current) wsRef.current.close();
    setIsJoined(false);
    setActionType("select");
    setOnlineGame(null);
    setChatMessages([]);
  };

  const isHost = useMemo(() => {
    if (!game || game.players.length === 0) return false;
    return game.players[0].username === username;
  }, [game, username]);

  // Board dimensions for SVG rendering
  const activeBoardSize = game?.board_state?.size || 9;
  const boardSizeMargin = 5;
  const gridRange = 100 - (boardSizeMargin * 2);
  const cellDistance = gridRange / (activeBoardSize - 1);

  // Star Points (Hoshi) coordinates mapping
  const starPoints = useMemo(() => {
    const points: [number, number][] = [];
    if (activeBoardSize === 9) {
      const idxs = [2, 4, 6];
      for (const r of idxs) {
        for (const c of idxs) points.push([r, c]);
      }
    } else if (activeBoardSize === 13) {
      const idxs = [3, 6, 9];
      for (const r of idxs) {
        for (const c of idxs) points.push([r, c]);
      }
    } else if (activeBoardSize === 19) {
      const idxs = [3, 9, 15];
      for (const r of idxs) {
        for (const c of idxs) points.push([r, c]);
      }
    }
    return points;
  }, [activeBoardSize]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/10 dark:bg-slate-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none z-0" />

      {!isJoined ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 text-white shadow-xl shadow-slate-800/35 mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-855 dark:from-slate-300 via-slate-650 dark:via-zinc-400 to-slate-855 dark:to-slate-300 bg-clip-text text-transparent">
              Online Go
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Real-time multiplayer lobbies</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {actionType === "select" && (
            <div className="space-y-4">
              <button
                onClick={() => setActionType("create")}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:opacity-95 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Create Room
              </button>
              <button
                onClick={() => setActionType("join")}
                className="w-full bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-850 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                Join with Room Code
              </button>
              <Link href="/go" className="block text-center mt-6">
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-350 cursor-pointer underline flex items-center gap-1.5 mx-auto font-bold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Go Lobby
                </button>
              </Link>
            </div>
          )}

          {actionType === "create" && (
            <form onSubmit={createLobby} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Board Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {[9, 13, 19].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLobbyBoardSize(s as any)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer
                        ${lobbyBoardSize === s 
                          ? "bg-slate-800 text-white border-transparent shadow-md" 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:border-zinc-300"
                        }
                      `}
                    >
                      {s}x{s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Stone Color</label>
                <div className="grid grid-cols-2 gap-3">
                  {["BLACK", "WHITE"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3 rounded-xl border text-xs font-bold tracking-widest transition-all cursor-pointer
                        ${color === c 
                          ? "bg-slate-800 text-white border-transparent scale-105 shadow-lg" 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:border-zinc-350"
                        }
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-slate-700 to-slate-900 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                >
                  Create Lobby
                </button>
              </div>
            </form>
          )}

          {actionType === "join" && (
            <form onSubmit={joinLobby} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Room Code / Game ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter game ID"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-mono tracking-wider text-center uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Stone Color</label>
                <div className="grid grid-cols-2 gap-3">
                  {["BLACK", "WHITE"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3 rounded-xl border text-xs font-bold tracking-widest transition-all cursor-pointer
                        ${color === c 
                          ? "bg-slate-800 text-white border-transparent scale-105 shadow-lg" 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:border-zinc-350"
                        }
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-slate-700 to-slate-900 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                >
                  Join Lobby
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full max-w-6xl relative z-10">
          {game?.status === "waiting" ? (
            <div className="w-full max-w-xl mx-auto bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-8 animate-fade-in">
              <div>
                <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">Waiting Lobby</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Share the code below with your opponent to play</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                <span className="font-mono text-lg font-bold tracking-wider text-slate-800 dark:text-slate-350 select-all overflow-hidden text-ellipsis whitespace-nowrap">{gameId}</span>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 justify-center">
                  <Users className="w-4 h-4 text-slate-500" /> Players Joined ({game.players.length}/2)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {game.players.map((p, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 p-4 rounded-2xl flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-800 ${p.color === "BLACK" ? "bg-black" : "bg-white"}`} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{p.username}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize mt-1">{p.color.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                  {game.players.length < 2 && (
                    <div className="bg-zinc-50/40 dark:bg-zinc-950/20 border border-dashed border-zinc-300 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-center text-zinc-400 text-sm">
                      <button
                        onClick={handleAddBot}
                        className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Bot Player
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-4 rounded-xl text-xs flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-650" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={handleLeaveGame}
                  className="flex-1 bg-zinc-855 hover:bg-zinc-755 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  Leave Lobby
                </button>
                {isHost && (
                  <button
                    disabled={game.players.length < 2}
                    onClick={handleStartGame}
                    className="flex-[2] bg-gradient-to-r from-slate-750 to-slate-900 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                  >
                    Start Match
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Board Area */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-4">
                
                {/* Board */}
                <div className="w-full max-w-[560px] aspect-square bg-[#dfaf70] dark:bg-[#c99553] border-8 border-amber-950/60 rounded-3xl p-4 md:p-6 shadow-2xl relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                    {/* Grid Lines */}
                    {Array.from({ length: activeBoardSize }).map((_, i) => {
                      const coord = boardSizeMargin + i * cellDistance;
                      return (
                        <React.Fragment key={i}>
                          <line x1={boardSizeMargin} y1={coord} x2={100 - boardSizeMargin} y2={coord} stroke="#452a0a" strokeWidth="0.3" />
                          <line x1={coord} y1={boardSizeMargin} x2={coord} y2={100 - boardSizeMargin} stroke="#452a0a" strokeWidth="0.3" />
                        </React.Fragment>
                      );
                    })}

                    {/* Star Points */}
                    {starPoints.map(([sr, sc], idx) => {
                      const cx = boardSizeMargin + sc * cellDistance;
                      const cy = boardSizeMargin + sr * cellDistance;
                      return <circle key={idx} cx={cx} cy={cy} r="0.8" fill="#3b2005" />;
                    })}

                    {/* Stones & Intersections */}
                    {Array.from({ length: activeBoardSize }).map((_, r) => 
                      Array.from({ length: activeBoardSize }).map((__, c) => {
                        const cx = boardSizeMargin + c * cellDistance;
                        const cy = boardSizeMargin + r * cellDistance;
                        const key = `${r}_${c}`;
                        const stoneColor = game?.board_state?.stones?.[key];
                        const hitRadius = cellDistance / 2;

                        if (stoneColor) {
                          const isBlack = stoneColor === "BLACK";
                          return (
                            <circle 
                              key={key}
                              cx={cx} 
                              cy={cy} 
                              r={cellDistance * 0.46} 
                              fill={isBlack ? "url(#blackStoneGrad)" : "url(#whiteStoneGrad)"}
                              filter="url(#stoneShadow)"
                            />
                          );
                        }

                        if (isMyTurn && game?.status === "playing") {
                          const isBlack = myColor === "BLACK";
                          return (
                            <g key={key} className="group cursor-pointer" onClick={() => handlePlaceStone(r, c)}>
                              <circle cx={cx} cy={cy} r={hitRadius} fill="transparent" />
                              <circle cx={cx} cy={cy} r={cellDistance * 0.42} fill={isBlack ? "black" : "white"} opacity="0" className="group-hover:opacity-40 transition-opacity" />
                            </g>
                          );
                        }

                        return null;
                      })
                    )}

                    <defs>
                      <filter id="stoneShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0.5" dy="1.0" stdDeviation="0.6" floodOpacity="0.45" />
                      </filter>
                      <radialGradient id="blackStoneGrad" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#555" />
                        <stop offset="25%" stopColor="#222" />
                        <stop offset="100%" stopColor="#050505" />
                      </radialGradient>
                      <radialGradient id="whiteStoneGrad" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="45%" stopColor="#e8e8e8" />
                        <stop offset="100%" stopColor="#bcbcbc" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                
                <div className="w-full max-w-[560px] flex items-center justify-between px-2 text-xs text-zinc-500">
                  <span>Online Multiplayer Go Room.</span>
                  {isMyTurn && <span className="text-emerald-500 font-bold animate-pulse">Your Turn</span>}
                </div>
              </div>

              {/* Right Panel */}
              <div className="lg:col-span-4 flex flex-col space-y-6">
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-slate-500" /> Go Online Match
                    </h2>
                    <button
                      onClick={handleLeaveGame}
                      className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-xl cursor-pointer transition-colors active:scale-95 flex items-center gap-1 text-xs font-bold"
                    >
                      <LogOut className="w-4 h-4" /> Exit
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span className="text-zinc-400">Match ID:</span>
                      <span className="font-mono font-bold text-zinc-850 dark:text-zinc-250 select-all">{game?.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span className="text-zinc-400">Status:</span>
                      <span className="capitalize font-bold text-slate-500">{game?.status}</span>
                    </div>
                    
                    {/* Captured counts */}
                    {game?.players.map((p) => (
                      <div key={p.color} className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full border border-zinc-300 dark:border-zinc-800 ${p.color === "BLACK" ? "bg-black" : "bg-white"}`} />
                          {p.username}:
                        </span>
                        <span className="font-bold">{game.board_state.captured?.[p.color] || 0} Captured</span>
                      </div>
                    ))}

                    {game?.status === "playing" && (
                      <button
                        disabled={!isMyTurn}
                        onClick={handlePass}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all cursor-pointer mt-2"
                      >
                        Pass Turn
                      </button>
                    )}

                    {game?.winner && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 font-bold text-center justify-center animate-bounce">
                        <Award className="w-5 h-5" />
                        <span>Winner: {game.winner}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Move Log */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-500" /> Move Log
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                    {chatMessages.filter(m => m.type === "move" || m.type === "system").length === 0 ? (
                      <div className="text-zinc-500 text-center py-8">Game started. Good luck!</div>
                    ) : (
                      chatMessages.filter(m => m.type === "move" || m.type === "system").map((log, idx) => (
                        <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans" : ""}`}>
                          {log.type === "system" ? log.message : `${log.color === "BLACK" ? "Black" : "White"}: ${log.message}`}
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </div>

                {/* Chat Room */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex flex-col h-[280px]">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-500" /> Chat Room
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 text-xs">
                    {chatMessages.filter(m => m.type === "chat").length === 0 ? (
                      <div className="text-zinc-500 text-center py-8">No messages yet. Send a note!</div>
                    ) : (
                      chatMessages.filter(m => m.type === "chat").map((chat, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${chat.color === "BLACK" ? "bg-black" : "bg-white"}`} />
                            <span className="font-bold text-zinc-700 dark:text-zinc-350">{chat.username}</span>
                          </div>
                          <p className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-2xl rounded-tl-none border border-zinc-150 dark:border-zinc-850/50 text-zinc-800 dark:text-zinc-200 font-sans">
                            {chat.message}
                          </p>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-805 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                    <button type="submit" className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer active:scale-95">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
