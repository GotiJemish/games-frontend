"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, Check, LogOut, Sparkles, Monitor, Sun, Moon, Users
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
  status: string; // playing, finished
  current_turn: string | null;
  last_roll: number | null;
  winner: string | null;
  board_state: Record<string, number[]>;
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "roll" | "move";
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

// Local Mode gameplay move execution
const executeLocalMove = (
  boardState: Record<string, number[]>,
  color: string,
  roll: number
): { boardState: Record<string, number[]>; message: string } => {
  const nextBoardState = { ...boardState };
  const currPos = boardState[color][0];
  let newPos = currPos + roll;

  if (newPos > 100) {
    return {
      boardState,
      message: `rolled a ${roll} but needs exact roll to reach 100 (stays at ${currPos}).`
    };
  }

  let msg = `rolled a ${roll} and moved from ${currPos} to ${newPos}.`;

  if (LADDERS[newPos]) {
    const landPos = LADDERS[newPos];
    msg += ` Climbed a ladder to ${landPos}!`;
    newPos = landPos;
  } else if (SNAKES[newPos]) {
    const landPos = SNAKES[newPos];
    msg += ` Was bitten by a snake and slid down to ${landPos}.`;
    newPos = landPos;
  }

  nextBoardState[color] = [newPos];
  return { boardState: nextBoardState, message: msg };
};

const getLocalNextTurn = (current: string, activeColors: string[]): string => {
  const ORDER = ["RED", "GREEN", "YELLOW", "BLUE"];
  const filtered = ORDER.filter(c => activeColors.includes(c));
  if (!filtered.length) return current;
  const idx = filtered.indexOf(current);
  return filtered[(idx + 1) % filtered.length];
};

export default function SnakeLadderLocalPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isStarted, setIsStarted] = useState(false);

  // Setup state
  const [localPlayerCount, setLocalPlayerCount] = useState<2 | 3 | 4>(2);
  const [localPlayerNames, setLocalPlayerNames] = useState<Record<string, string>>({
    RED: "Player 1",
    GREEN: "Player 2",
    YELLOW: "Player 3",
    BLUE: "Player 4"
  });

  // Game state
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [localLogs, setLocalLogs] = useState<ChatMessage[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const logBottomRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll logs
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localLogs]);

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

  const handleStartLocalGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    let colors: string[] = [];
    if (localPlayerCount === 2) colors = ["RED", "YELLOW"];
    else if (localPlayerCount === 3) colors = ["RED", "GREEN", "YELLOW"];
    else colors = ["RED", "GREEN", "YELLOW", "BLUE"];

    const board: Record<string, number[]> = {};
    colors.forEach(col => {
      board[col] = [0]; // Position 0 represents off the board
    });

    const playersList = colors.map((col) => ({
      username: localPlayerNames[col] || `${col} Player`,
      color: col
    }));

    setLocalGame({
      id: "LOCAL",
      status: "playing",
      current_turn: "RED",
      last_roll: null,
      winner: null,
      board_state: board,
      players: playersList
    });
    setLocalLogs([{ type: "system", message: "Local Pass & Play Match Started!" }]);
    setIsStarted(true);
  };

  const handleRollDice = () => {
    if (!localGame || localGame.status !== "playing") return;
    setIsRolling(true);
    
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const turnColor = localGame.current_turn!;
      const activePlayer = localGame.players.find(p => p.color === turnColor)!;

      const { boardState: nextBoardState, message } = executeLocalMove(
        localGame.board_state,
        turnColor,
        roll
      );

      let updatedGame: GameState = {
        ...localGame,
        board_state: nextBoardState,
        last_roll: roll
      };

      let logMsg = `${activePlayer.username} (${turnColor}) ${message}`;

      // Check Winner
      const hasWon = nextBoardState[turnColor][0] === 100;
      if (hasWon) {
        updatedGame.status = "finished";
        updatedGame.winner = turnColor;
        updatedGame.current_turn = null;
        logMsg += ` ${activePlayer.username} HAS WON THE GAME!`;
      } else {
        if (roll === 6) {
          logMsg += ` gets another roll!`;
        } else {
          const activeColors = localGame.players.map(p => p.color);
          const nextColor = getLocalNextTurn(turnColor, activeColors);
          updatedGame.current_turn = nextColor;
        }
      }

      setLocalGame(updatedGame);
      setLocalLogs(prev => [...prev, {
        type: "move",
        username: activePlayer.username,
        color: turnColor,
        message: logMsg
      }]);
      setIsRolling(false);
    }, 800);
  };

  const handleLeaveGame = () => {
    setIsStarted(false);
    setLocalGame(null);
    setLocalLogs([]);
  };

  const game = localGame;
  const myColor = game?.current_turn;
  const isMyTurn = game?.status === "playing";

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
        return <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs md:text-sm">ROLL</div>;
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
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/10 dark:bg-slate-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none z-0" />

      {!isStarted ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-805 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-600/35 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 dark:from-amber-300 via-amber-500 dark:via-zinc-400 to-amber-600 dark:to-amber-300 bg-clip-text text-transparent">
              Pass & Play
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Local Offline Snakes & Ladders Match</p>
          </div>

          <form onSubmit={handleStartLocalGame} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2">Total Players</label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLocalPlayerCount(num as 2 | 3 | 4)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer
                      ${localPlayerCount === num 
                        ? "bg-amber-500 text-white border-transparent scale-105 shadow-md" 
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-505 dark:text-zinc-400 hover:border-zinc-350"
                      }
                    `}
                  >
                    {num} Players
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Player Names</label>
              
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Player 1 (RED)</span>
                  <input
                    type="text"
                    required
                    value={localPlayerNames.RED}
                    onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, RED: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {localPlayerCount >= 3 ? (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Player 2 (GREEN)</span>
                    <input
                      type="text"
                      required
                      value={localPlayerNames.GREEN}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, GREEN: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                ) : null}

                <div>
                  <span className="text-[10px] font-bold text-amber-550 uppercase tracking-widest">
                    {localPlayerCount === 2 ? "Player 2" : "Player 3"} (YELLOW)
                  </span>
                  <input
                    type="text"
                    required
                    value={localPlayerNames.YELLOW}
                    onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, YELLOW: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {localPlayerCount === 4 ? (
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Player 4 (BLUE)</span>
                    <input
                      type="text"
                      required
                      value={localPlayerNames.BLUE}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, BLUE: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/snake-ladder" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </Link>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Start Game
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Main Board Area */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-4">
            
            {/* The Board */}
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
                  <Monitor className="w-5 h-5 text-amber-500" /> Pass & Play
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
                  <span className="text-zinc-400">Current Turn:</span>
                  <span className="capitalize font-bold text-amber-500">
                    {game?.players.find(p => p.color === game.current_turn)?.username || game?.current_turn}
                  </span>
                </div>
                
                {/* Players */}
                <div className="space-y-1.5">
                  {game?.players.map((p) => {
                    const isTurn = game?.status === "playing" && game?.current_turn === p.color;
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
                          <span className={`text-xs font-medium text-zinc-650 dark:text-zinc-350`}>
                            {p.username}
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
                      <div className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                        Your Turn: Roll!
                      </div>
                    ) : null}
                  </div>

                  {game?.status === "playing" && (
                    <button
                      disabled={!isMyTurn || isRolling}
                      onClick={handleRollDice}
                      className={`w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl flex items-center justify-center select-none active:scale-95 transition-all
                        ${isRolling ? "animate-spin cursor-not-allowed" : ""}
                        ${isMyTurn ? "hover:scale-105 ring-4 ring-amber-500/20 bg-white cursor-pointer" : "opacity-40 cursor-not-allowed"}
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
                <Sparkles className="w-4 h-4 text-amber-500" /> Activity Log
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                {localLogs.length === 0 ? (
                  <div className="text-zinc-555 text-center py-8">Game started. Roll to begin!</div>
                ) : (
                  localLogs.map((log, idx) => (
                    <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans" : ""}`}>
                      {log.message}
                    </div>
                  ))
                )}
                <div ref={logBottomRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
