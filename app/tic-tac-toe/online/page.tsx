"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import api from "@/lib/axios";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, LogOut, Sparkles, Sun, Moon, Award, Globe, Users, Copy, Send
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // waiting, playing, finished
  current_turn: string | null;
  winner: string | null;
  board_state: {
    board: (string | null)[];
    difficulty: string;
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "move";
  username?: string;
  color?: string;
  message: string;
}

export default function TicTacToeOnline() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Room config / Join states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("X"); // X or O
  const [roomCodeInput, setRoomCodeInput] = useState("");
  
  const [isLobbyCreator, setIsLobbyCreator] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Gameplay State
  const [gameId, setGameId] = useState("");
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API URLs
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll chats
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load theme
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

  // WebSocket Connection
  const connectWebSocket = (gId: string, uName: string) => {
    if (wsRef.current) wsRef.current.close();

    const wsProto = httpUrl.startsWith("https") ? "wss:" : "ws:";
    const cleanHost = httpUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const wsUrl = `${wsProto}//${cleanHost}/tic-tac-toe/${gId}/ws?username=${encodeURIComponent(uName)}`;

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
    const uName = username.trim() || "Host";
    const myCol = color === "O" ? "O" : "X";

    try {
      const createRes = await api.post(`tic-tac-toe/createLobby`, {
        username: uName,
        color: myCol,
        game_type: "tic-tac-toe"
      });
      const lobby = createRes.data;
      setGameId(lobby.id);
      setOnlineGame(lobby);
      setIsLobbyCreator(true);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(lobby.id, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const joinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player";
    const code = roomCodeInput.trim().toUpperCase();

    if (!code) {
      setErrorMsg("Please enter a room code");
      return;
    }

    try {
      let joinCol = color === "O" ? "O" : "X";
      
      let joinRes;
      try {
        joinRes = await api.post(`tic-tac-toe/${code}/joinLobby`, {
          username: uName,
          color: joinCol
        });
      } catch (joinErr: any) {
        // If color is taken, swap it
        joinCol = joinCol === "X" ? "O" : "X";
        joinRes = await api.post(`tic-tac-toe/${code}/joinLobby`, {
          username: uName,
          color: joinCol
        });
      }

      const lobby = joinRes.data;
      setGameId(lobby.id);
      setOnlineGame(lobby);
      setIsLobbyCreator(false);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(lobby.id, uName);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.detail || "Failed to join room. Verify code or username.");
      } else {
        setErrorMsg("Failed to join room. Verify code or username.");
      }
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      await api.post(`tic-tac-toe/${gameId}/start`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.detail || "Failed to start game");
      } else {
        setErrorMsg("Failed to start game");
      }
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleCellClick = (position: number) => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "place_mark",
      position
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
    setIsLobbyCreator(false);
    setOnlineGame(null);
  };

  const copyRoomCode = () => {
    if (typeof navigator !== "undefined" && gameId) {
      navigator.clipboard.writeText(gameId);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Find self and opponent player info
  const myPlayer = onlineGame?.players.find(p => p.username === username);
  const opponentPlayer = onlineGame?.players.find(p => p.username !== username);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-violet-900/10 dark:bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        {!isJoined ? (
          <Link href="/tic-tac-toe" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-violet-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Link>
        ) : (
          <button onClick={handleLeaveGame} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <LogOut className="w-4 h-4" /> Leave Room
          </button>
        )}
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-violet-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {!isJoined ? (
          /* Lobby Configuration Form */
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            {/* Create Room Box */}
            <div className="space-y-4 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 pb-6 md:pb-0">
              <div className="text-center md:text-left space-y-1.5 mb-4">
                <span className="text-xs font-black uppercase text-violet-550 dark:text-violet-400 tracking-wider">Host Game</span>
                <h2 className="text-2xl font-black">Create a Room</h2>
              </div>
              <form onSubmit={createLobby} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Host Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-violet-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Choose Mark</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setColor("X")}
                      className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                        color === "X" 
                          ? "bg-violet-500/10 border-violet-500 text-violet-500 shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      onClick={() => setColor("O")}
                      className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                        color === "O" 
                          ? "bg-purple-500/10 border-purple-500 text-purple-500 shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      O
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-violet-650 to-purple-600 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                  <Play className="w-5 h-5" /> Host Match
                </button>
              </form>
            </div>

            {/* Join Room Box */}
            <div className="space-y-4 pl-0 md:pl-6">
              <div className="text-center md:text-left space-y-1.5 mb-4">
                <span className="text-xs font-black uppercase text-purple-550 dark:text-purple-400 tracking-wider">Join Friend</span>
                <h2 className="text-2xl font-black">Join a Room</h2>
              </div>
              <form onSubmit={joinLobby} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Guest Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-purple-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Room Code (8 Chars)</label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Enter Code (e.g. A1B2C3D4)"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-bold tracking-widest outline-none focus:border-purple-500 transition-all text-zinc-850 dark:text-zinc-100 uppercase placeholder:tracking-normal placeholder:font-semibold"
                  />
                </div>
                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-650 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                  <Globe className="w-5 h-5" /> Join Match
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Main Room Layout */
          <>
            <div className="flex-1 flex flex-col items-center gap-6">
              {/* Waiting Lobby state vs Playing state */}
              {onlineGame?.status === "waiting" ? (
                <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl space-y-6">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-500/10 text-violet-500 text-xs font-black rounded-full uppercase tracking-wider">
                      Lobby Waiting
                    </span>
                    <h2 className="text-xl font-black">Room Lobby</h2>
                  </div>

                  <div className="p-4 bg-zinc-100 dark:bg-zinc-950/80 rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col items-center gap-2">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Share Room Code</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black tracking-widest text-violet-500">{gameId}</span>
                      <button onClick={copyRoomCode} className="p-2 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl active:scale-90 transition-all cursor-pointer">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copiedText && <span className="text-[10px] text-green-500 font-bold">Copied code to clipboard!</span>}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider text-left flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-violet-500" /> Players ({onlineGame.players.length}/2)
                    </h4>
                    <div className="space-y-2">
                      {onlineGame.players.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-850/50 rounded-xl">
                          <span className="text-sm font-bold">{p.username}</span>
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                            p.color === "X" 
                              ? "bg-violet-500/10 border-violet-500/20 text-violet-500" 
                              : "bg-purple-500/10 border-purple-500/20 text-purple-500"
                          }`}>{p.color}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isLobbyCreator && (
                    <button
                      onClick={handleStartGame}
                      disabled={onlineGame.players.length < 2}
                      className="w-full bg-gradient-to-r from-violet-650 to-purple-650 hover:opacity-95 text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play className="w-5 h-5" /> Start Match
                    </button>
                  )}
                  {!isLobbyCreator && (
                    <p className="text-xs text-zinc-400 italic">Waiting for host to start the match...</p>
                  )}
                </div>
              ) : (
                /* Active Game Board */
                <div className="flex-1 flex flex-col items-center gap-6">
                  {/* Players Panel */}
                  <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-lg flex justify-between items-center px-6">
                    <div className="text-left">
                      <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold truncate max-w-32">{myPlayer?.username || username}</p>
                      <p className="text-sm font-extrabold text-violet-500 mt-0.5">{myPlayer?.color}</p>
                    </div>
                    <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850">
                      <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">VS</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold truncate max-w-32">{opponentPlayer?.username || "Waiting..."}</p>
                      <p className="text-sm font-extrabold text-purple-500 mt-0.5">{opponentPlayer?.color || "-"}</p>
                    </div>
                  </div>

                  {/* Turn Status */}
                  <div className="text-center">
                    {onlineGame?.status === "finished" ? (
                      <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-lg font-bold shadow-md animate-bounce">
                        <Award className="w-5 h-5 text-amber-500" />
                        <span>
                          {onlineGame.winner === "DRAW" ? "It's a Draw!" : `${onlineGame.winner === myPlayer?.color ? "You Won!" : "Opponent Won!"}`}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                        {onlineGame?.current_turn === myPlayer?.color ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-550"></span>
                            </span>
                            <span>Your Turn! Place your mark.</span>
                          </>
                        ) : (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-550"></span>
                            </span>
                            <span>Waiting for opponent's move...</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Board Grid */}
                  <div className="relative w-full max-w-sm aspect-square bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xl backdrop-blur-md flex items-center justify-center">
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-3">
                      {onlineGame?.board_state.board.map((cell, idx) => {
                        const isMyTurn = onlineGame.status === "playing" && onlineGame.current_turn === myPlayer?.color;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleCellClick(idx)}
                            disabled={!!cell || onlineGame.status === "finished" || !isMyTurn}
                            className={`w-full h-full rounded-2xl border transition-all relative flex items-center justify-center text-4xl font-extrabold focus:outline-none cursor-pointer active:scale-95
                              ${cell === null ? "bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50" : ""}
                              ${cell === "X" ? "border-violet-500/20 text-violet-500 bg-violet-500/5" : ""}
                              ${cell === "O" ? "border-purple-500/20 text-purple-500 bg-purple-500/5" : ""}
                            `}
                          >
                            {cell === "X" && (
                              <svg className="w-14 h-14 animate-draw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                            {cell === "O" && (
                              <svg className="w-12 h-12 animate-draw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="12" cy="12" r="9" />
                              </svg>
                            )}
                            {/* Hover Preview Ghost Mark */}
                            {!cell && isMyTurn && (
                              <div className="opacity-0 hover:opacity-20 absolute inset-0 flex items-center justify-center transition-opacity">
                                {myPlayer?.color === "X" ? (
                                  <svg className="w-10 h-10 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                ) : (
                                  <svg className="w-9 h-9 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <circle cx="12" cy="12" r="9" />
                                  </svg>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Game Feed and Chat Room */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" /> Room Feed
              </h3>
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 text-xs font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-zinc-400 italic">Welcome to the lobby feed.</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-2.5 rounded-xl border break-words
                        ${msg.type === "move" 
                          ? "bg-violet-500/5 text-violet-755 dark:text-violet-300 border-violet-500/10" 
                          : msg.type === "system" 
                            ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400"
                            : "bg-purple-500/5 text-purple-755 dark:text-purple-300 border-purple-500/10"
                        }
                      `}
                    >
                      {msg.type === "chat" && <strong>{msg.username}: </strong>}
                      {msg.message}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Send a chat message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-violet-500 transition-all text-zinc-850 dark:text-zinc-100"
                />
                <button type="submit" className="p-2 bg-violet-500 hover:bg-violet-650 text-white rounded-xl active:scale-95 transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
