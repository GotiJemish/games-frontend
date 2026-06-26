"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, Check, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Sun, Moon, Award, Globe, Copy, Users, Plus
} from "lucide-react";

// Board size definitions
const BOARD_ROWS = 10;
const BOARD_COLS = 10;

// Snakes mapping: start cell -> end cell (head -> tail)
const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79
};

// Ladders mapping: start cell -> end cell (bottom -> top)
const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};

const COLOR_THEMES: Record<string, { bg: string; text: string; border: string; token: string; hover: string }> = {
  RED: { 
    bg: "bg-red-600", 
    text: "text-red-655 dark:text-red-500", 
    border: "border-red-500",
    token: "bg-red-500 shadow-red-500/50 hover:shadow-red-500/80", 
    hover: "hover:bg-red-600" 
  },
  GREEN: { 
    bg: "bg-emerald-600", 
    text: "text-emerald-650 dark:text-emerald-500", 
    border: "border-emerald-500",
    token: "bg-emerald-500 shadow-emerald-500/50 hover:shadow-emerald-500/80", 
    hover: "hover:bg-emerald-600" 
  },
  YELLOW: { 
    bg: "bg-amber-500", 
    text: "text-amber-600 dark:text-amber-550", 
    border: "border-amber-500",
    token: "bg-amber-400 text-zinc-955 shadow-amber-400/50 hover:shadow-amber-400/80", 
    hover: "hover:bg-amber-500" 
  },
  BLUE: { 
    bg: "bg-blue-600", 
    text: "text-blue-600 dark:text-blue-500", 
    border: "border-blue-500",
    token: "bg-blue-500 shadow-blue-500/50 hover:shadow-blue-500/80", 
    hover: "hover:bg-blue-600" 
  }
};

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
  board_state: Record<string, number[]>;
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "roll" | "move";
  username?: string;
  color?: string;
  message: string;
}

// Converts cell number (1 to 100) to grid coordinates { col, row } where row 0 is top
const getCellCoords = (cellNum: number): { col: number; row: number } => {
  const adjusted = cellNum - 1;
  const rowFromBottom = Math.floor(adjusted / 10);
  const row = 9 - rowFromBottom;
  const isRowEvenFromBottom = rowFromBottom % 2 === 1;
  const col = isRowEvenFromBottom ? 9 - (adjusted % 10) : adjusted % 10;
  return { col, row };
};

export default function SnakeLadderOnlinePage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [actionType, setActionType] = useState<"select" | "create" | "join">("select");

  // Form input states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("RED");
  const [gameIdInput, setGameIdInput] = useState("");

  // Game states
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API Base URL
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
      } else if (data.type === "roll" || data.type === "move") {
        setOnlineGame(data.game);
        setChatMessages(prev => [...prev, {
          type: data.type,
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 1";
    
    try {
      const createRes = await api.post(`games/create`, {
        username: uName,
        color,
        game_type: "snake-ladder"
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

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 2";
    const gId = gameIdInput.trim();
    if (!gId) {
      setErrorMsg("Please enter a room code");
      return;
    }

    try {
      const joinRes = await api.post(`games/${gId}/join`, {
        username: uName,
        color
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
      const startRes = await api.post(`games/${gameId}/start`);
      setOnlineGame(startRes.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start match");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleAddBot = async () => {
    if (!gameId) return;
    const takenColors = game?.players.map(p => p.color) || [];
    const availableColors = ["RED", "GREEN", "YELLOW", "BLUE"].filter(c => !takenColors.includes(c));
    if (availableColors.length === 0) return;
    const botCol = availableColors[0];
    
    try {
      const res = await api.post(`games/${gameId}/add_bot`, {
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

  const handleRollDice = () => {
    if (!wsRef.current || !onlineGame) return;
    setIsRolling(true);
    setTimeout(() => {
      wsRef.current?.send(JSON.stringify({ action: "roll_dice" }));
      setIsRolling(false);
    }, 800);
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

  const tokensByCell = useMemo(() => {
    const cells: Record<number, { color: string; username: string }[]> = {};
    if (!game || game.status === "waiting") return cells;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      const pos = tokens[0];
      if (pos > 0 && pos <= 100) {
        if (!cells[pos]) cells[pos] = [];
        const playerObj = game.players.find(p => p.color === color);
        cells[pos].push({ color, username: playerObj?.username || color });
      }
    });
    return cells;
  }, [game]);

  const offBoardPlayers = useMemo(() => {
    const list: { color: string; username: string }[] = [];
    if (!game || game.status === "waiting") return list;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      if (tokens[0] === 0) {
        const playerObj = game.players.find(p => p.color === color);
        list.push({ color, username: playerObj?.username || color });
      }
    });
    return list;
  }, [game]);

  const inviteUrl = useMemo(() => {
    if (typeof window !== "undefined" && game) {
      return `${window.location.origin}/snake-ladder/online?join=${game.id}`;
    }
    return "";
  }, [game]);

  const renderDiceDots = (val: number) => {
    const dotClasses = "w-3 h-3 bg-zinc-955 dark:bg-white rounded-full shadow-sm animate-pulse";
    switch (val) {
      case 1:
        return <div className="flex items-center justify-center w-full h-full"><div className={dotClasses} /></div>;
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2 flex-col">
            <div className="flex justify-start"><div className={dotClasses} /></div>
            <div className="flex justify-end"><div className={dotClasses} /></div>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2 flex-col">
            <div className="flex justify-start"><div className={dotClasses} /></div>
            <div className="flex justify-center"><div className={dotClasses} /></div>
            <div className="flex justify-end"><div className={dotClasses} /></div>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full p-2 gap-2">
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-1.5 justify-items-center items-center">
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 w-full h-full p-2 gap-x-2 gap-y-1 justify-items-center">
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
          </div>
        );
      default:
        return <div className="text-zinc-550 dark:text-zinc-400 font-semibold text-xs md:text-sm">ROLL</div>;
    }
  };

  const renderGridCells = () => {
    const cells = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      const rowNum = 9 - r;
      const isRowEvenFromBottom = rowNum % 2 === 1;

      for (let c = 0; c < BOARD_COLS; c++) {
        const colNum = isRowEvenFromBottom ? 9 - c : c;
        const cellNum = rowNum * 10 + colNum + 1;
        const cellTokens = tokensByCell[cellNum] || [];
        const isAlternate = (r + c) % 2 === 1;

        let cellBg = isAlternate 
          ? "bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50" 
          : "bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50";

        if (cellNum === 100) {
          cellBg = "bg-amber-500/20 dark:bg-amber-400/25 border-2 border-amber-500/50";
        } else if (cellNum === 1) {
          cellBg = "bg-indigo-650/15 dark:bg-indigo-500/20 border-2 border-indigo-500/50";
        }

        cells.push(
          <div key={cellNum} className={`w-full aspect-square relative flex flex-col justify-between p-1 rounded-sm select-none transition-all ${cellBg}`}>
            <span className={`text-[9px] md:text-xs font-bold leading-none ${
              cellNum === 100 ? "text-amber-600 dark:text-amber-400" :
              cellNum === 1 ? "text-indigo-600 dark:text-indigo-400" :
              "text-zinc-400 dark:text-zinc-650"
            }`}>
              {cellNum}
            </span>

            <div className="flex-1 flex items-center justify-center">
              {cellTokens.length > 0 && (
                <div className={`grid gap-0.5 justify-center items-center ${cellTokens.length > 1 ? "grid-cols-2 p-0.5" : "grid-cols-1"}`}>
                  {cellTokens.map((t, idx) => (
                    <div 
                      key={idx}
                      title={t.username}
                      className={`w-4 h-4 md:w-6 md:h-6 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center font-extrabold text-[8px] md:text-[10px] select-none shadow-md ${COLOR_THEMES[t.color].token}`}
                    >
                      {t.username.substring(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  const renderSVGOverlay = () => {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <linearGradient id="ladderGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Ladders */}
        {Object.entries(LADDERS).map(([startStr, endVal]) => {
          const start = parseInt(startStr);
          const end = endVal;
          const c1 = getCellCoords(start);
          const c2 = getCellCoords(end);

          const x1 = c1.col * 10 + 5;
          const y1 = c1.row * 10 + 5;
          const x2 = c2.col * 10 + 5;
          const y2 = c2.row * 10 + 5;

          const angle = Math.atan2(y2 - y1, x2 - x1);
          const dx = Math.sin(angle) * 1.5;
          const dy = -Math.cos(angle) * 1.5;

          return (
            <g key={`ladder-${start}`}>
              <line x1={x1 + dx} y1={y1 + dy} x2={x2 + dx} y2={y2 + dy} stroke="url(#ladderGrad)" strokeWidth="1.2" />
              <line x1={x1 - dx} y1={y1 - dy} x2={x2 - dx} y2={y2 - dy} stroke="url(#ladderGrad)" strokeWidth="1.2" />
              {Array.from({ length: 6 }).map((_, i) => {
                const t = (i + 1) / 7;
                const rx = x1 + (x2 - x1) * t;
                const ry = y1 + (y2 - y1) * t;
                return (
                  <line key={i} x1={rx + dx} y1={ry + dy} x2={rx - dx} y2={ry - dy} stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.8" />
                );
              })}
            </g>
          );
        })}

        {/* Snakes */}
        {Object.entries(SNAKES).map(([startStr, endVal]) => {
          const start = parseInt(startStr);
          const end = endVal;
          const c1 = getCellCoords(start);
          const c2 = getCellCoords(end);

          const x1 = c1.col * 10 + 5;
          const y1 = c1.row * 10 + 5;
          const x2 = c2.col * 10 + 5;
          const y2 = c2.row * 10 + 5;

          const midX1 = (x1 + x2) / 2 + (y2 - y1) * 0.12;
          const midY1 = (y1 + y2) / 2 - (x2 - x1) * 0.12;
          const midX2 = (x1 + x2) / 2 - (y2 - y1) * 0.12;
          const midY2 = (y1 + y2) / 2 + (x2 - x1) * 0.12;

          const pathD = `M ${x1} ${y1} C ${midX1} ${midY1}, ${midX2} ${midY2}, ${x2} ${y2}`;

          return (
            <g key={`snake-${start}`}>
              <path d={pathD} fill="none" stroke="url(#snakeGrad)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx={x1} cy={y1} r="1.4" fill="#ef4444" />
              <circle cx={x1 - 0.4} cy={y1 - 0.4} r="0.3" fill="white" />
              <circle cx={x1 + 0.4} cy={y1 - 0.4} r="0.3" fill="white" />
              <circle cx={x2} cy={y2} r="0.5" fill="#dc2626" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-955 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none z-0" />

      {/* Toggle Theme */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={toggleTheme} 
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {!isJoined ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-655 text-white shadow-xl shadow-indigo-600/35 mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 dark:from-indigo-300 via-purple-500 dark:via-zinc-400 to-indigo-600 dark:to-indigo-300 bg-clip-text text-transparent">
              Online Lobby
            </h1>
            <p className="text-zinc-500 dark:text-zinc-405 text-sm mt-1">Real-time multiplayer race</p>
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
                className="w-full bg-gradient-to-r from-indigo-650 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Create Room
              </button>
              <button
                onClick={() => setActionType("join")}
                className="w-full bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-850 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                Join with Room Code
              </button>
              <Link href="/snake-ladder" className="block text-center mt-6">
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-350 cursor-pointer underline flex items-center gap-1.5 mx-auto font-bold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Lobby
                </button>
              </Link>
            </div>
          )}

          {actionType === "create" && (
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Your Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(COLOR_THEMES).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-wider transition-all cursor-pointer
                        ${color === c 
                          ? `${COLOR_THEMES[c].bg} text-white border-transparent scale-105 shadow-lg` 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-805 text-zinc-550 dark:text-zinc-400 hover:border-zinc-350"
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
                  className="flex-[2] bg-gradient-to-r from-indigo-650 to-purple-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                >
                  Create & Wait
                </button>
              </div>
            </form>
          )}

          {actionType === "join" && (
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2">Room Code / Game ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter game ID"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-mono tracking-wider text-center uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-400 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2">Color Choice</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(COLOR_THEMES).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-wider transition-all cursor-pointer
                        ${color === c 
                          ? `${COLOR_THEMES[c].bg} text-white border-transparent scale-105 shadow-lg` 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-550 dark:text-zinc-400 hover:border-zinc-350"
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
                  className="flex-1 bg-zinc-855 hover:bg-zinc-755 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-indigo-650 to-purple-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                >
                  Join Room
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
                <span className="font-mono text-lg font-bold tracking-wider text-indigo-500 select-all overflow-hidden text-ellipsis whitespace-nowrap">{gameId}</span>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 justify-center">
                  <Users className="w-4 h-4 text-indigo-500" /> Players Joined ({game.players.length}/4)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {game.players.map((p, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 p-4 rounded-2xl flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${COLOR_THEMES[p.color].bg} shadow-sm`} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{p.username}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize mt-1">{p.color.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                  {game.players.length < 4 && (
                    <div className="bg-zinc-50/40 dark:bg-zinc-950/20 border border-dashed border-zinc-300 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-center text-zinc-400 text-sm">
                      <button
                        onClick={handleAddBot}
                        className="bg-indigo-600/10 hover:bg-indigo-650/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Bot
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-655 dark:text-red-400 p-4 rounded-xl text-xs flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-500" />
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
                    className="flex-[2] bg-gradient-to-r from-indigo-650 to-purple-650 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
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
                <div className="w-full max-w-[560px] aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-3xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative">
                  <div 
                    className="grid w-full h-full gap-0.5"
                    style={{ 
                      gridTemplateColumns: "repeat(10, minmax(0, 1fr))", 
                      gridTemplateRows: "repeat(10, minmax(0, 1fr))" 
                    }}
                  >
                    {renderGridCells()}
                  </div>
                  {renderSVGOverlay()}
                </div>

                {/* Offboard List */}
                {offBoardPlayers.length > 0 && (
                  <div className="w-full max-w-[560px] bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Lobby (At Start):</span>
                    {offBoardPlayers.map((p, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${COLOR_THEMES[p.color].border} bg-${p.color.toLowerCase()}-500/10 ${COLOR_THEMES[p.color].text}`}>
                        <span className={`w-2 h-2 rounded-full ${COLOR_THEMES[p.color].bg}`} />
                        {p.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Panel */}
              <div className="lg:col-span-4 flex flex-col space-y-6">
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-indigo-500" /> Online Match
                    </h2>
                    <button
                      onClick={handleLeaveGame}
                      className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-xl cursor-pointer transition-colors active:scale-95 flex items-center gap-1 text-xs font-bold"
                    >
                      <LogOut className="w-4 h-4" /> Exit
                    </button>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span className="text-zinc-400">Match ID:</span>
                      <span className="font-mono font-bold text-zinc-855 dark:text-zinc-250 select-all">{game?.id}</span>
                    </div>

                    {/* Players list */}
                    <div className="space-y-1.5">
                      {game?.players.map((p) => {
                        const isTurn = game?.status === "playing" && game?.current_turn === p.color;
                        const isMe = p.username === username;
                        const pos = game.board_state[p.color]?.[0] || 0;
                        return (
                          <div 
                            key={p.username} 
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200
                              ${isTurn 
                                ? `${COLOR_THEMES[p.color].border} bg-${p.color.toLowerCase()}-500/5 ring-1 ring-${p.color.toLowerCase()}-500/10` 
                                : "bg-zinc-50/60 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-850"
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${COLOR_THEMES[p.color].bg} shadow-sm`} />
                              <span className={`text-xs font-medium ${isMe ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-650 dark:text-zinc-300"}`}>
                                {p.username} {isMe && "(You)"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-400">Pos: {pos}</span>
                              {isTurn && (
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${COLOR_THEMES[p.color].bg} text-white animate-pulse`}>
                                  Turn
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl gap-4 mt-4">
                      <div className="flex-1">
                        {game?.status === "finished" ? (
                          <div className="text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center gap-1.5 animate-pulse">
                            <Sparkles className="w-4 h-4" /> Winner: {game.winner}
                          </div>
                        ) : isMyTurn ? (
                          <div className="text-indigo-650 dark:text-indigo-400 font-bold text-sm">
                            Your Turn: Roll!
                          </div>
                        ) : (
                          <div className="text-zinc-550 dark:text-zinc-400 text-sm">
                            Waiting for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{game?.current_turn}</span>
                          </div>
                        )}
                      </div>

                      {game?.status === "playing" && (
                        <button
                          disabled={!isMyTurn || isRolling}
                          onClick={handleRollDice}
                          className={`w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl flex items-center justify-center select-none active:scale-95 transition-all
                            ${isRolling ? "animate-spin cursor-not-allowed" : ""}
                            ${isMyTurn ? "hover:scale-105 ring-4 ring-indigo-500/20 bg-white cursor-pointer" : "opacity-40 cursor-not-allowed"}
                          `}
                        >
                          {renderDiceDots(game?.last_roll || 0)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Move Log */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Move Log
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                    {chatMessages.filter(m => m.type === "roll" || m.type === "move" || m.type === "system").length === 0 ? (
                      <div className="text-zinc-500 text-center py-8">Game started. Good luck!</div>
                    ) : (
                      chatMessages.filter(m => m.type === "roll" || m.type === "move" || m.type === "system").map((log, idx) => (
                        <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans" : ""}`}>
                          {log.type === "system" ? log.message : `${log.color ? `${log.color}: ` : ""}${log.message}`}
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </div>

                {/* Chat Room */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex flex-col h-[280px]">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Chat Room
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 text-xs">
                    {chatMessages.filter(m => m.type === "chat").length === 0 ? (
                      <div className="text-zinc-500 text-center py-8">No messages yet. Send a note!</div>
                    ) : (
                      chatMessages.filter(m => m.type === "chat").map((chat, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${COLOR_THEMES[chat.color || "RED"].bg}`} />
                            <span className="font-bold text-zinc-700 dark:text-zinc-350">{chat.username}</span>
                          </div>
                          <p className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-2xl rounded-tl-none border border-zinc-150 dark:border-zinc-855/50 text-zinc-800 dark:text-zinc-200 font-sans">
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
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-805 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button type="submit" className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer active:scale-95">
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
