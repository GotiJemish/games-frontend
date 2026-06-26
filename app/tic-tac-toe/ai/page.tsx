"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, LogOut, Sparkles, Sun, Moon, Award, Shield, MessageSquare, Send
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

export default function TicTacToeAI() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Form input states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("X"); // X or O
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  // Match states
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

  // WS Connect
  const connectWebSocket = (gId: string, uName: string) => {
    if (wsRef.current) wsRef.current.close();

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const cleanHost = httpUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const wsUrl = `${wsProto}//${cleanHost}/games/${gId}/ws?username=${encodeURIComponent(uName)}`;

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

  const handlePlayVsComputer = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player";
    const myCol = color === "O" ? "O" : "X";
    const botCol = myCol === "X" ? "O" : "X";
    
    try {
      const createRes = await axios.post(`${httpUrl}games/create`, {
        username: uName,
        color: myCol,
        game_type: "tic-tac-toe",
        difficulty: difficulty
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      await axios.post(`${httpUrl}games/${gId}/add_bot`, {
        username: `Computer (Bot) ${botCol}`,
        color: botCol
      });
      
      const startRes = await axios.post(`${httpUrl}games/${gId}/start`);
      
      setOnlineGame(startRes.data);
      setGameId(gId);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start bot match");
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
    setOnlineGame(null);
  };

  // Find opponent player info
  const botPlayer = onlineGame?.players.find(p => p.username.startsWith("Computer (Bot)"));
  const humanPlayer = onlineGame?.players.find(p => !p.username.startsWith("Computer (Bot)"));

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-fuchsia-900/10 dark:bg-fuchsia-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        {!isJoined ? (
          <Link href="/tic-tac-toe" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Link>
        ) : (
          <button onClick={handleLeaveGame} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <LogOut className="w-4 h-4" /> Leave Game
          </button>
        )}
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
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
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Play vs. Computer</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Configure your mark and match parameters.</p>
            </div>
            <form onSubmit={handlePlayVsComputer} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-indigo-500" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Your Mark</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setColor("X")}
                    className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                      color === "X" 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-md" 
                        : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    X (Plays First)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColor("O")}
                    className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                      color === "O" 
                        ? "bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-500 shadow-md" 
                        : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    O (Computer First)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                        difficulty === diff 
                          ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 border-indigo-500 text-white shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-indigo-650 to-fuchsia-600 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Play Game
              </button>
            </form>
          </div>
        ) : (
          /* Main Gameplay Panel */
          <>
            <div className="flex-1 flex flex-col items-center gap-6">
              {/* Score / Players Status Header */}
              <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-lg flex justify-between items-center px-6">
                <div className="text-left">
                  <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold truncate max-w-32">{humanPlayer?.username}</p>
                  <p className="text-sm font-extrabold text-indigo-500 mt-0.5">{humanPlayer?.color}</p>
                </div>
                <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-850">
                  <span className="text-xs font-black text-zinc-450 dark:text-zinc-500 tracking-wider uppercase">{difficulty}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold truncate max-w-32">{botPlayer?.username}</p>
                  <p className="text-sm font-extrabold text-fuchsia-500 mt-0.5">{botPlayer?.color}</p>
                </div>
              </div>

              {/* Status Header */}
              <div className="text-center">
                {onlineGame?.status === "finished" ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-lg font-bold shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>
                      {onlineGame.winner === "DRAW" ? "It's a Draw!" : `${onlineGame.winner === humanPlayer?.color ? "You Won!" : "Bot Won!"}`}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                    {onlineGame?.current_turn === botPlayer?.color ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-550"></span>
                        </span>
                        <span>
                          Computer is calculating move...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-550"></span>
                        </span>
                        <span>
                          Your Turn! Place your mark.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tic Tac Toe Grid */}
              <div className="relative w-full max-w-sm aspect-square bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xl backdrop-blur-md flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-3">
                  {onlineGame?.board_state.board.map((cell, idx) => {
                    const isMyTurn = onlineGame.status === "playing" && onlineGame.current_turn === humanPlayer?.color;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleCellClick(idx)}
                        disabled={!!cell || onlineGame.status === "finished" || !isMyTurn}
                        className={`w-full h-full rounded-2xl border transition-all relative flex items-center justify-center text-4xl font-extrabold focus:outline-none cursor-pointer active:scale-95
                          ${cell === null ? "bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50" : ""}
                          ${cell === "X" ? "border-indigo-500/20 text-indigo-500 bg-indigo-500/5" : ""}
                          ${cell === "O" ? "border-fuchsia-500/20 text-fuchsia-500 bg-fuchsia-500/5" : ""}
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
                            {humanPlayer?.color === "X" ? (
                              <svg className="w-10 h-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            ) : (
                              <svg className="w-9 h-9 text-fuchsia-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

            {/* Right Column: Game Log and Chat */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" /> Game Feed
              </h3>
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 text-xs font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-zinc-400 italic">Game has started.</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-2.5 rounded-xl border break-words
                        ${msg.type === "move" 
                          ? "bg-indigo-500/5 text-indigo-755 dark:text-indigo-300 border-indigo-500/10" 
                          : msg.type === "system" 
                            ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400"
                            : "bg-fuchsia-500/5 text-fuchsia-755 dark:text-fuchsia-300 border-fuchsia-500/10"
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
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 transition-all text-zinc-850 dark:text-zinc-100"
                />
                <button type="submit" className="p-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl active:scale-95 transition-all cursor-pointer">
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
