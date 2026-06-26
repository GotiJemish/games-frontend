"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, LogOut, Sparkles, Sun, Moon, Award, Users, Monitor
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // playing, finished
  current_turn: string | null;
  winner: string | null;
  board_state: {
    size: number;
    stones: Record<string, string>; // "r_c" -> "BLACK" or "WHITE"
    captured: Record<string, number>;
    consecutive_passes: number;
    previous_stones: any;
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "move";
  username?: string;
  color?: string;
  message: string;
}

// ----------------------------------------------------
// Local Go Engine helpers
// ----------------------------------------------------

const getNeighbors = (r: number, c: number, size: number): [number, number][] => {
  const neighbors: [number, number][] = [];
  if (r > 0) neighbors.push([r - 1, c]);
  if (r < size - 1) neighbors.push([r + 1, c]);
  if (c > 0) neighbors.push([r, c - 1]);
  if (c < size - 1) neighbors.push([r, c + 1]);
  return neighbors;
};

const findGroup = (
  stones: Record<string, string>,
  r: number,
  c: number,
  size: number
): [number, number][] => {
  const key = `${r}_${c}`;
  const color = stones[key];
  if (!color) return [];

  const visited: Record<string, boolean> = {};
  const group: [number, number][] = [];
  const queue: [number, number][] = [[r, c]];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const k = `${curr[0]}_${curr[1]}`;
    if (visited[k]) continue;

    visited[k] = true;
    group.push(curr);

    const neighbors = getNeighbors(curr[0], curr[1], size);
    for (const [nr, nc] of neighbors) {
      const nk = `${nr}_${nc}`;
      if (stones[nk] === color && !visited[nk]) {
        queue.push([nr, nc]);
      }
    }
  }

  return group;
};

const getLibertiesCount = (
  stones: Record<string, string>,
  group: [number, number][],
  size: number
): number => {
  const liberties: Record<string, boolean> = {};
  for (const [gr, gc] of group) {
    const neighbors = getNeighbors(gr, gc, size);
    for (const [nr, nc] of neighbors) {
      const nk = `${nr}_${nc}`;
      if (!stones[nk]) {
        liberties[nk] = true;
      }
    }
  }
  return Object.keys(liberties).length;
};

const executeLocalMove = (
  boardState: any,
  color: string,
  row: number,
  col: number
): { boardState: any; success: boolean; message: string } => {
  const size = boardState.size;
  const stones = { ...boardState.stones };
  const key = `${row}_${col}`;

  if (stones[key]) {
    return { boardState, success: false, message: "Intersection is already occupied." };
  }

  const opponent = color === "BLACK" ? "WHITE" : "BLACK";
  const oldStones = { ...stones };

  // Place stone temporarily
  stones[key] = color;

  // Check captures of opponent groups
  let capturedCount = 0;
  const processedOpponentGroups: Record<string, boolean> = {};
  const neighbors = getNeighbors(row, col, size);

  for (const [nr, nc] of neighbors) {
    const nk = `${nr}_${nc}`;
    if (stones[nk] === opponent) {
      const group = findGroup(stones, nr, nc, size);
      const groupKey = group.map(g => `${g[0]}_${g[1]}`).sort().join("|");
      if (processedOpponentGroups[groupKey]) continue;
      processedOpponentGroups[groupKey] = true;

      if (getLibertiesCount(stones, group, size) === 0) {
        for (const [gr, gc] of group) {
          const gk = `${gr}_${gc}`;
          delete stones[gk];
          capturedCount++;
        }
      }
    }
  }

  // Check suicide
  const ownGroup = findGroup(stones, row, col, size);
  if (getLibertiesCount(stones, ownGroup, size) === 0) {
    return { boardState, success: false, message: "Suicide move is invalid." };
  }

  // Check Ko rule
  const hashStones = (s: Record<string, string>) => Object.entries(s).sort().map(e => `${e[0]}:${e[1]}`).join(",");
  if (boardState.previous_stones && hashStones(stones) === hashStones(boardState.previous_stones)) {
    return { boardState, success: false, message: "Ko rule violation: Cannot recreate immediate previous board state." };
  }

  // Update board state
  const nextBoardState = {
    ...boardState,
    previous_stones: oldStones,
    stones,
    consecutive_passes: 0,
    captured: {
      ...boardState.captured,
      [color]: (boardState.captured[color] || 0) + capturedCount
    }
  };

  let msg = `${color} placed a stone at (${row}, ${col}).`;
  if (capturedCount > 0) {
    msg += ` Captured ${capturedCount} opponent stone(s)!`;
  }

  return { boardState: nextBoardState, success: true, message: msg };
};

// Calculate area score locally
const calculateAreaScore = (boardState: any): any => {
  const size = boardState.size;
  const stones = boardState.stones;

  let blackStones = 0;
  let whiteStones = 0;
  for (const c of Object.values(stones)) {
    if (c === "BLACK") blackStones++;
    if (c === "WHITE") whiteStones++;
  }

  const visited: Record<string, boolean> = {};
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const k = `${r}_${c}`;
      if (stones[k] || visited[k]) continue;

      // Unvisited empty spot: run BFS to find territory component
      const component: [number, number][] = [];
      const queue: [number, number][] = [[r, c]];
      const borders: Record<string, boolean> = {};

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const ck = `${curr[0]}_${curr[1]}`;
        if (visited[ck]) continue;

        visited[ck] = true;
        component.push(curr);

        const neighbors = getNeighbors(curr[0], curr[1], size);
        for (const [nr, nc] of neighbors) {
          const nk = `${nr}_${nc}`;
          if (stones[nk]) {
            borders[stones[nk]] = true;
          } else if (!visited[nk] && !component.some(g => g[0] === nr && g[1] === nc)) {
            queue.push([nr, nc]);
          }
        }
      }

      const borderColors = Object.keys(borders);
      if (borderColors.length === 1) {
        const bCol = borderColors[0];
        if (bCol === "BLACK") blackTerritory += component.length;
        if (bCol === "WHITE") whiteTerritory += component.length;
      }
    }
  }

  const komi = 6.5;
  const blackTotal = blackStones + blackTerritory;
  const whiteTotal = whiteStones + whiteTerritory + komi;

  return {
    BLACK: blackTotal,
    WHITE: whiteTotal,
    black_stones: blackStones,
    white_stones: whiteStones,
    black_territory: blackTerritory,
    white_territory: whiteTerritory,
    komi,
    winner: blackTotal > whiteTotal ? "BLACK" : "WHITE"
  };
};

export default function GoLocalPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(9);
  
  // Game Setup
  const [playerBlack, setPlayerBlack] = useState("");
  const [playerWhite, setPlayerWhite] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  // Game state
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [localLogs, setLocalLogs] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll logs
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Start Local Game
  const handleStartLocalGame = (e: React.FormEvent) => {
    e.preventDefault();
    const blackName = playerBlack.trim() || "Black Player";
    const whiteName = playerWhite.trim() || "White Player";
    setPlayerBlack(blackName);
    setPlayerWhite(whiteName);

    const initialBoard = {
      size: boardSize,
      stones: {},
      captured: { BLACK: 0, WHITE: 0 },
      consecutive_passes: 0,
      previous_stones: null
    };

    const playersList = [
      { username: blackName, color: "BLACK" },
      { username: whiteName, color: "WHITE" }
    ];

    setLocalGame({
      id: "LOCAL",
      status: "playing",
      current_turn: "BLACK",
      winner: null,
      board_state: initialBoard,
      players: playersList
    });
    setLocalLogs([{ type: "system", message: `Local Go Match Started: ${blackName} vs ${whiteName}` }]);
    setIsStarted(true);
  };

  // Place stone Local
  const handlePlaceStone = (row: number, col: number) => {
    if (!localGame || localGame.status !== "playing") return;
    const turnColor = localGame.current_turn!;
    const activePlayer = localGame.players.find(p => p.color === turnColor)!;

    const { boardState: nextBoardState, success, message } = executeLocalMove(
      localGame.board_state,
      turnColor,
      row,
      col
    );

    if (!success) {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    const nextTurn = turnColor === "BLACK" ? "WHITE" : "BLACK";
    setLocalGame({
      ...localGame,
      board_state: nextBoardState,
      current_turn: nextTurn
    });
    setLocalLogs(prev => [...prev, {
      type: "move",
      username: activePlayer.username,
      color: turnColor,
      message
    }]);
  };

  // Pass Turn Local
  const handlePass = () => {
    if (!localGame || localGame.status !== "playing") return;
    const turnColor = localGame.current_turn!;
    const activePlayer = localGame.players.find(p => p.color === turnColor)!;

    const nextPasses = localGame.board_state.consecutive_passes + 1;
    let nextBoardState = {
      ...localGame.board_state,
      consecutive_passes: nextPasses
    };

    let logMsg = `${activePlayer.username} (${turnColor}) passed.`;
    let updatedGame: GameState = {
      ...localGame,
      board_state: nextBoardState
    };

    if (nextPasses >= 2) {
      const score = calculateAreaScore(nextBoardState);
      updatedGame.status = "finished";
      updatedGame.winner = score.winner;
      updatedGame.current_turn = null;
      logMsg += ` Both players passed. Game ended! Scores - Black: ${score.BLACK}, White: ${score.WHITE}. Winner: ${score.winner}!`;
    } else {
      updatedGame.current_turn = turnColor === "BLACK" ? "WHITE" : "BLACK";
    }

    setLocalGame(updatedGame);
    setLocalLogs(prev => [...prev, {
      type: "move",
      username: activePlayer.username,
      color: turnColor,
      message: logMsg
    }]);
  };

  const handleLeaveGame = () => {
    setIsStarted(false);
    setLocalGame(null);
    setLocalLogs([]);
  };

  const game = localGame;

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
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-slate-900/10 dark:bg-slate-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none z-0" />
      
      {/* Toggle Theme */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={toggleTheme} 
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {!isStarted ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#c99553] text-white shadow-xl shadow-amber-600/35 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-850 dark:from-slate-350 via-amber-650 dark:via-amber-500 to-slate-850 dark:to-slate-350 bg-clip-text text-transparent">
              Pass & Play
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Local Offline Go Game</p>
          </div>

          <form onSubmit={handleStartLocalGame} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Black Player Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Black Player"
                  value={playerBlack}
                  onChange={(e) => setPlayerBlack(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                />
                <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">White Player Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="White Player"
                  value={playerWhite}
                  onChange={(e) => setPlayerWhite(e.target.value)}
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
                    onClick={() => setBoardSize(s as any)}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer
                      ${boardSize === s 
                        ? "bg-[#c99553] text-white border-transparent shadow-md" 
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:border-zinc-300"
                      }
                    `}
                  >
                    {s}x{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/go" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </Link>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-[#dfaf70] to-[#c99553] hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
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

                    if (game?.status === "playing") {
                      const isBlack = game.current_turn === "BLACK";
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
              <span>Pass the device back and forth to take turns.</span>
              {errorMsg && <span className="text-red-500 font-bold">{errorMsg}</span>}
            </div>
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

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                  <span className="text-zinc-400">Current Turn:</span>
                  <span className="capitalize font-bold text-amber-500">
                    {game?.current_turn === "BLACK" ? playerBlack : playerWhite} ({game?.current_turn})
                  </span>
                </div>
                
                {/* Captured counts */}
                <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-black border border-zinc-400" />
                    {playerBlack} (Black):
                  </span>
                  <span className="font-bold">{game?.board_state.captured?.BLACK || 0} Captures</span>
                </div>
                <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-800" />
                    {playerWhite} (White):
                  </span>
                  <span className="font-bold">{game?.board_state.captured?.WHITE || 0} Captures</span>
                </div>

                {game?.status === "playing" && (
                  <button
                    onClick={handlePass}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all cursor-pointer mt-2"
                  >
                    Pass Turn
                  </button>
                )}

                {game?.winner && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 font-bold text-center justify-center animate-bounce">
                    <Award className="w-5 h-5" />
                    <span>Winner: {game.winner === "BLACK" ? playerBlack : playerWhite}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Move Log */}
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Activity Log
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                {localLogs.length === 0 ? (
                  <div className="text-zinc-500 text-center py-8">Game started. Black plays first.</div>
                ) : (
                  localLogs.map((log, idx) => (
                    <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans" : ""}`}>
                      {log.message}
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
