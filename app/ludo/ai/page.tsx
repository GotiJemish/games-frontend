"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, Check, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Sun, Moon, Award, Shield
} from "lucide-react";

// Track coordinate points around the Ludo board (0-51)
const TRACK_COORDINATES: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

const YARD_SEAT_OFFSETS = [0, 1, 2, 3];

const HOME_COLUMN_COORDINATES: Record<string, [number, number][]> = {
  RED: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  GREEN: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  YELLOW: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  BLUE: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const STARTING_TRACK_INDICES: Record<string, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39
};

const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_THEMES: Record<string, { bg: string; text: string; border: string; token: string; hover: string }> = {
  RED: { 
    bg: "bg-red-600", 
    text: "text-red-600 dark:text-red-500", 
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
    text: "text-amber-600 dark:text-amber-500", 
    border: "border-amber-500",
    token: "bg-amber-400 text-zinc-950 shadow-amber-400/50 hover:shadow-amber-400/80", 
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

export default function LudoAIPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Setup state
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("RED");
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  // Gameplay state
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRolling, setIsRolling] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API Base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll logs/chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Theme check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.classList.toggle("dark", systemPrefersDark);
    }
  }, []);

  // Theme switch handler
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
      } else if (data.type === "roll") {
        setOnlineGame(data.game);
        setChatMessages(prev => [...prev, {
          type: "roll",
          username: data.username,
          color: data.color,
          message: data.message
        }]);
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
    const myCol = color || "RED";
    
    const colors = ["RED", "GREEN", "YELLOW", "BLUE"];
    const otherColors = colors.filter(c => c !== myCol);

    try {
      const createRes = await api.post(`games/create`, {
        username: uName,
        color: myCol,
        game_type: "ludo"
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      for (const botCol of otherColors) {
        await api.post(`games/${gId}/add_bot`, {
          username: `Computer (Bot) ${botCol}`,
          color: botCol
        });
      }
      
      const startRes = await api.post(`games/${gId}/start`);
      
      setOnlineGame(startRes.data);
      setGameId(gId);
      setIsJoined(true);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start bot match");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleRollDice = () => {
    if (!wsRef.current || !onlineGame) return;
    setIsRolling(true);
    setTimeout(() => {
      wsRef.current?.send(JSON.stringify({ action: "roll_dice" }));
      setIsRolling(false);
    }, 800);
  };

  const handleMoveToken = (tokenIdx: number) => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "move_token",
      token_idx: tokenIdx
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
    setChatMessages([]);
  };

  const game = onlineGame;
  const myPlayer = game?.players?.find(p => p.username === username);
  const myColor = myPlayer?.color;
  const isMyTurn = game?.status === "playing" && game?.current_turn === myColor;

  const getEligibleMoves = (col: string, tokens: number[], roll: number | null): number[] => {
    if (roll === null) return [];
    const eligible: number[] = [];
    tokens.forEach((pos, idx) => {
      if (pos === 56) return;
      if (pos === -1) {
        if (roll === 6) eligible.push(idx);
      } else if (pos + roll <= 56) {
        eligible.push(idx);
      }
    });
    return eligible;
  };

  const eligibleMoves = useMemo(() => {
    if (!game || !myColor || !isMyTurn || !game.has_rolled || game.last_roll === null) return [];
    return getEligibleMoves(myColor, game.board_state[myColor], game.last_roll);
  }, [game, myColor, isMyTurn]);

  const tokensByCell = useMemo(() => {
    const cells: Record<string, { color: string; tokenIdx: number; stepCount: number }[]> = {};
    if (!game || game.status === "waiting") return cells;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      tokens.forEach((stepCount, tokenIdx) => {
        if (stepCount === -1 || stepCount === 56) return;

        let r = -1;
        let c = -1;

        if (stepCount >= 51 && stepCount <= 55) {
          const coord = HOME_COLUMN_COORDINATES[color][stepCount - 51];
          r = coord[0];
          c = coord[1];
        } else if (stepCount >= 0 && stepCount <= 50) {
          const absIdx = (STARTING_TRACK_INDICES[color] + stepCount) % 52;
          const coord = TRACK_COORDINATES[absIdx];
          r = coord[0];
          c = coord[1];
        }

        if (r !== -1 && c !== -1) {
          const key = `${r}_${c}`;
          if (!cells[key]) cells[key] = [];
          cells[key].push({ color, tokenIdx, stepCount });
        }
      });
    });

    return cells;
  }, [game]);

  const tokensAtHome = useMemo(() => {
    const home: Record<string, { tokenIdx: number }[]> = { RED: [], GREEN: [], YELLOW: [], BLUE: [] };
    if (!game || game.status === "waiting") return home;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      tokens.forEach((stepCount, tokenIdx) => {
        if (stepCount === 56) {
          home[color].push({ tokenIdx });
        }
      });
    });
    return home;
  }, [game]);

  const renderDiceDots = (val: number) => {
    const dotClasses = "w-3 h-3 bg-zinc-950 dark:bg-white rounded-full shadow-sm animate-pulse";
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
        return <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">ROLL</div>;
    }
  };

  const Token = ({ 
    color: tokenColor, 
    tokenIdx, 
    isInteractive, 
    onClick 
  }: { 
    color: string; 
    tokenIdx: number; 
    isInteractive: boolean; 
    onClick?: () => void 
  }) => {
    const themeInfo = COLOR_THEMES[tokenColor];
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isInteractive && onClick) onClick();
        }}
        disabled={!isInteractive}
        title={`${tokenColor} Token ${tokenIdx + 1}`}
        className={`w-6 h-6 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center font-bold text-xs select-none transition-all duration-200 z-20 shadow-md
          ${themeInfo.token}
          ${isInteractive ? "ring-4 ring-indigo-500 dark:ring-white animate-pulse scale-110 cursor-pointer" : "cursor-default"}
        `}
      >
        {tokenIdx + 1}
      </button>
    );
  };

  const renderPathCell = (r: number, c: number) => {
    const key = `${r}_${c}`;
    const cellTokens = tokensByCell[key] || [];

    let cellBg = "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400";
    let isStar = false;
    let label = "";

    if (SAFE_TRACK_INDICES.has(TRACK_COORDINATES.findIndex(coord => coord[0] === r && coord[1] === c))) {
      isStar = true;
      cellBg = "bg-slate-200 dark:bg-zinc-800 border border-slate-350 dark:border-zinc-700 text-amber-500 dark:text-amber-400";
    }

    if (r === 6 && c === 1) {
      cellBg = "bg-red-600 dark:bg-red-500 border border-red-700 dark:border-red-600 text-white font-extrabold";
      label = "➔";
    } else if (r === 7 && c >= 1 && c <= 5) {
      cellBg = "bg-red-500/10 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400";
    }
    else if (r === 1 && c === 8) {
      cellBg = "bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-600 text-white font-extrabold";
      label = "➔";
    } else if (c === 7 && r >= 1 && r <= 5) {
      cellBg = "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
    }
    else if (r === 8 && c === 13) {
      cellBg = "bg-amber-500 dark:bg-amber-400 border border-amber-600 dark:border-amber-500 text-zinc-950 font-extrabold";
      label = "➔";
    } else if (r === 7 && c >= 9 && c <= 13) {
      cellBg = "bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-650 dark:text-amber-400";
    }
    else if (r === 13 && c === 6) {
      cellBg = "bg-blue-600 dark:bg-blue-500 border border-blue-700 dark:border-blue-600 text-white font-extrabold";
      label = "➔";
    } else if (c === 7 && r >= 9 && r <= 13) {
      cellBg = "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-650 dark:text-blue-400";
    }

    return (
      <div 
        key={key} 
        style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
        className={`w-full aspect-square flex items-center justify-center relative rounded-md select-none transition-all ${cellBg}`}
      >
        {isStar && !cellTokens.length && <Sparkles className="w-4 h-4 animate-pulse text-amber-500 dark:text-amber-400/60" />}
        {label && !cellTokens.length && <span className="text-[10px] opacity-75">{label}</span>}
        
        {cellTokens.length > 0 && (
          <div className={`grid gap-0.5 justify-center items-center ${cellTokens.length > 1 ? "grid-cols-2 p-0.5" : "grid-cols-1"}`}>
            {cellTokens.map((t) => (
              <Token 
                key={`${t.color}_${t.tokenIdx}`} 
                color={t.color} 
                tokenIdx={t.tokenIdx} 
                isInteractive={!!(isMyTurn && game?.has_rolled && eligibleMoves.includes(t.tokenIdx) && myColor === t.color)}
                onClick={() => handleMoveToken(t.tokenIdx)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderYard = (yardColor: string, colStart: number, rowStart: number) => {
    const themeInfo = COLOR_THEMES[yardColor];
    const isYardOwner = myColor === yardColor;

    return (
      <div 
        style={{ gridColumn: `${colStart} / span 6`, gridRow: `${rowStart} / span 6` }}
        className={`bg-slate-100/90 dark:bg-zinc-950/60 border-2 ${themeInfo.border} rounded-2xl relative flex items-center justify-center p-3 transition-all duration-300 shadow-lg`}
      >
        <div className={`absolute top-2 left-3 text-xs font-bold tracking-widest ${themeInfo.text}`}>
          {yardColor} {isYardOwner && "(ACTIVE)"}
        </div>
        
        <div className={`w-3/4 h-3/4 rounded-xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 grid-rows-2 gap-3 p-3 bg-white dark:bg-zinc-900/90 shadow-inner`}>
          {YARD_SEAT_OFFSETS.map((seatIdx) => {
            const hasToken = game?.board_state[yardColor]?.[seatIdx] === -1;
            return (
              <div 
                key={seatIdx} 
                className="bg-slate-55/60 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-850 border-dashed rounded-full flex items-center justify-center aspect-square shadow-inner"
              >
                {hasToken && (
                  <Token 
                    color={yardColor} 
                    tokenIdx={seatIdx} 
                    isInteractive={!!(isMyTurn && game?.has_rolled && eligibleMoves.includes(seatIdx) && myColor === yardColor)}
                    onClick={() => handleMoveToken(seatIdx)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-red-900/10 dark:bg-red-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none z-0" />

      {!isJoined ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-650 text-white shadow-xl shadow-red-600/35 mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 dark:from-red-300 via-amber-500 dark:via-zinc-400 to-blue-600 dark:to-blue-300 bg-clip-text text-transparent">
              Play vs. Computer
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Single Player Ludo Bot Match</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePlayVsComputer} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-550/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
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
                    className={`py-3 rounded-xl border text-xs font-bold tracking-wider transition-all cursor-pointer
                      ${color === c 
                        ? `${COLOR_THEMES[c].bg} text-white border-transparent scale-105 shadow-lg` 
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-350"
                      }
                    `}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/ludo" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </Link>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Play VS Bot
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Main Board Area */}
          <div className="lg:col-span-8 flex items-center justify-center">
            <div className="w-full max-w-[620px] aspect-square bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xl dark:shadow-2xl relative transition-all">
              <div 
                className="grid w-full h-full gap-0.5 md:gap-1"
                style={{ 
                  gridTemplateColumns: "repeat(15, minmax(0, 1fr))", 
                  gridTemplateRows: "repeat(15, minmax(0, 1fr))" 
                }}
              >
                {/* Yards */}
                {renderYard("RED", 1, 1)}
                {renderYard("GREEN", 10, 1)}
                {renderYard("YELLOW", 10, 10)}
                {renderYard("BLUE", 1, 10)}

                {/* Path mapping */}
                {/* Top path */}
                {Array.from({ length: 6 }).flatMap((_, r) => 
                  Array.from({ length: 3 }).map((__, cIndex) => renderPathCell(r, cIndex + 6))
                )}
                {/* Right path */}
                {Array.from({ length: 3 }).flatMap((_, rIndex) => 
                  Array.from({ length: 6 }).map((__, cIndex) => renderPathCell(rIndex + 6, cIndex + 9))
                )}
                {/* Bottom path */}
                {Array.from({ length: 6 }).flatMap((_, rIndex) => 
                  Array.from({ length: 3 }).map((__, cIndex) => renderPathCell(rIndex + 9, cIndex + 6))
                )}
                {/* Left path */}
                {Array.from({ length: 3 }).flatMap((_, rIndex) => 
                  Array.from({ length: 6 }).map((__, cIndex) => renderPathCell(rIndex + 6, cIndex))
                )}

                {/* Center Home Triangle */}
                <div 
                  style={{ gridColumn: "7 / span 3", gridRow: "7 / span 3" }}
                  className="relative w-full h-full border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 rounded-xl"
                >
                  <div className="absolute inset-0 bg-red-600/15 dark:bg-red-600/35 border-r border-red-500/10" style={{ clipPath: "polygon(0% 0%, 50% 50%, 0% 100%)" }} />
                  <div className="absolute inset-0 bg-emerald-600/15 dark:bg-emerald-600/35 border-b border-emerald-500/10" style={{ clipPath: "polygon(0% 0%, 100% 0%, 50% 50%)" }} />
                  <div className="absolute inset-0 bg-amber-500/15 dark:bg-amber-500/35 border-l border-amber-500/10" style={{ clipPath: "polygon(100% 0%, 100% 100%, 50% 50%)" }} />
                  <div className="absolute inset-0 bg-blue-600/15 dark:bg-blue-600/35 border-t border-blue-500/10" style={{ clipPath: "polygon(0% 100%, 100% 100%, 50% 50%)" }} />

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full z-15 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" />
                  </div>

                  {/* Finished Tokens */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-wrap gap-1 max-w-[32px] justify-center z-10">
                    {tokensAtHome.RED.map((t) => (
                      <Token key={t.tokenIdx} color="RED" tokenIdx={t.tokenIdx} isInteractive={false} />
                    ))}
                  </div>
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-wrap gap-1 max-h-[32px] justify-center z-10">
                    {tokensAtHome.GREEN.map((t) => (
                      <Token key={t.tokenIdx} color="GREEN" tokenIdx={t.tokenIdx} isInteractive={false} />
                    ))}
                  </div>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-wrap gap-1 max-w-[32px] justify-center z-10">
                    {tokensAtHome.YELLOW.map((t) => (
                      <Token key={t.tokenIdx} color="YELLOW" tokenIdx={t.tokenIdx} isInteractive={false} />
                    ))}
                  </div>
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-wrap gap-1 max-h-[32px] justify-center z-10">
                    {tokensAtHome.BLUE.map((t) => (
                      <Token key={t.tokenIdx} color="BLUE" tokenIdx={t.tokenIdx} isInteractive={false} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" /> Ludo Bot Match
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
                  <span className="font-mono font-bold text-zinc-850 dark:text-zinc-250 select-all">{game?.id}</span>
                </div>
                
                {/* Players */}
                <div className="space-y-1.5">
                  {game?.players.map((p) => {
                    const isTurn = game?.status === "playing" && game?.current_turn === p.color;
                    const isMe = p.username === username;
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
                        {isTurn && (
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${COLOR_THEMES[p.color].bg} text-white animate-pulse`}>
                            Turn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl gap-4 mt-4">
                  <div className="flex-1">
                    {game?.status === "finished" ? (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-4 h-4" /> {game?.winner} Wins!
                      </div>
                    ) : isMyTurn ? (
                      <div className="text-red-650 dark:text-red-400 font-bold text-sm">
                        {game?.has_rolled ? "Select token to move" : "Your Turn: Roll!"}
                      </div>
                    ) : (
                      <div className="text-zinc-550 dark:text-zinc-400 text-sm">
                        Waiting for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{game?.current_turn}</span>
                      </div>
                    )}
                  </div>

                  {game?.status === "playing" && (
                    <button
                      disabled={!isMyTurn || !!game?.has_rolled || isRolling}
                      onClick={handleRollDice}
                      className={`w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl flex items-center justify-center select-none active:scale-95 transition-all
                        ${isRolling ? "animate-spin cursor-not-allowed" : ""}
                        ${isMyTurn && !game?.has_rolled ? "hover:scale-105 ring-4 ring-red-500/20 bg-white cursor-pointer" : "opacity-40 cursor-not-allowed"}
                      `}
                    >
                      {renderDiceDots(game?.last_roll || 0)}
                    </button>
                  )}
                </div>

                {isMyTurn && game?.has_rolled && eligibleMoves.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl mt-3">
                    <div className="text-xs font-bold text-red-650 dark:text-red-400 uppercase tracking-wider mb-2">Available Token Moves</div>
                    <div className="flex flex-wrap gap-2">
                      {eligibleMoves.map((tIdx) => {
                        const pos = game?.board_state[myColor || ""][tIdx];
                        return (
                          <button
                            key={tIdx}
                            onClick={() => handleMoveToken(tIdx)}
                            className="bg-red-655 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            Token {tIdx + 1}
                            <span className="text-[10px] font-normal text-red-200">
                              ({pos === -1 ? "Yard ➔ 0" : `${pos} ➔ ${pos + (game?.last_roll || 0)}`})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Move Log */}
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" /> Move Log
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
          </div>
        </div>
      )}
    </main>
  );
}
