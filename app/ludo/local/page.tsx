"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/use-theme";
import { Dice } from "@/app/_components/dice";
import { 
  Users, Coins, ArrowLeft, Monitor, LogOut, Check, Sparkles, Play, Star
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
  status: string; // playing, finished
  current_turn: string | null;
  last_roll: number | null;
  has_rolled: boolean;
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

// Local mode utilities
const getLocalAbsolutePosition = (color: string, stepCount: number): number => {
  if (stepCount < 0 || stepCount > 50) return -1;
  const start = STARTING_TRACK_INDICES[color];
  return (start + stepCount) % 52;
};

const getLocalNextTurn = (current: string, activeColors: string[]): string => {
  const ORDER = ["RED", "GREEN", "YELLOW", "BLUE"];
  const filtered = ORDER.filter(c => activeColors.includes(c));
  if (!filtered.length) return current;
  const idx = filtered.indexOf(current);
  return filtered[(idx + 1) % filtered.length];
};

const executeLocalMove = (
  boardState: Record<string, number[]>,
  color: string,
  tokenIdx: number,
  roll: number
): { boardState: Record<string, number[]>; captured: boolean; message: string } => {
  const tokens = [...boardState[color]];
  const currPos = tokens[tokenIdx];
  let newPos = currPos;

  if (currPos === -1) {
    if (roll === 6) newPos = 0;
  } else {
    newPos = currPos + roll;
  }

  tokens[tokenIdx] = newPos;
  
  const nextBoardState = { ...boardState, [color]: tokens };
  let captured = false;
  let captureMsg = "";
  const absPos = getLocalAbsolutePosition(color, newPos);

  if (absPos !== -1 && !SAFE_TRACK_INDICES.has(absPos)) {
    Object.entries(nextBoardState).forEach(([oppColor, oppTokens]) => {
      if (oppColor === color) return;
      const updatedOppTokens = [...oppTokens];
      let oppUpdated = false;
      
      updatedOppTokens.forEach((oppPos, oppIdx) => {
        const oppAbs = getLocalAbsolutePosition(oppColor, oppPos);
        if (oppAbs === absPos) {
          updatedOppTokens[oppIdx] = -1; // Reset to yard
          oppUpdated = true;
          captured = true;
          captureMsg = ` Captured ${oppColor}'s token ${oppIdx + 1}!`;
        }
      });
      
      if (oppUpdated) {
        nextBoardState[oppColor] = updatedOppTokens;
      }
    });
  }

  let message = `${color} token ${tokenIdx + 1} moved to step ${newPos}.`;
  if (newPos === 56) message += " Reached Home!";
  if (captured) message += captureMsg;

  return { boardState: nextBoardState, captured, message };
};

export default function LudoLocalPage() {
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

  const handleStartLocalGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    let colors: string[] = [];
    if (localPlayerCount === 2) colors = ["RED", "YELLOW"];
    else if (localPlayerCount === 3) colors = ["RED", "GREEN", "YELLOW"];
    else colors = ["RED", "GREEN", "YELLOW", "BLUE"];

    const board: Record<string, number[]> = {};
    colors.forEach(col => {
      board[col] = [-1, -1, -1, -1];
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
      has_rolled: false,
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
      const tokens = localGame.board_state[turnColor];
      const activePlayer = localGame.players.find(p => p.color === turnColor)!;

      const updatedGame: GameState = { ...localGame, last_roll: roll, has_rolled: true };
      let logMsg = `${activePlayer.username} (${turnColor}) rolled a ${roll}.`;

      // Check valid moves locally
      const canMove = getEligibleMoves(turnColor, tokens, roll).length > 0;
      
      if (!canMove) {
        const activeColors = localGame.players.map(p => p.color);
        const nextColor = getLocalNextTurn(turnColor, activeColors);
        updatedGame.current_turn = nextColor;
        updatedGame.has_rolled = false;
        updatedGame.last_roll = null;
        logMsg += ` No moves available. Turn passes to ${nextColor}.`;
        
        setLocalLogs(prev => [...prev, {
          type: "roll",
          username: activePlayer.username,
          color: turnColor,
          message: logMsg
        }]);
      } else {
        setLocalLogs(prev => [...prev, {
          type: "roll",
          username: activePlayer.username,
          color: turnColor,
          message: logMsg
        }]);
      }

      setLocalGame(updatedGame);
      setIsRolling(false);
    }, 800);
  };

  const handleMoveToken = (tokenIdx: number) => {
    if (!localGame || !localGame.has_rolled || localGame.last_roll === null) return;

    const turnColor = localGame.current_turn!;
    const roll = localGame.last_roll;
    const activePlayer = localGame.players.find(p => p.color === turnColor)!;

    const boardStateCopy: Record<string, number[]> = {};
    Object.entries(localGame.board_state).forEach(([k, v]) => {
      boardStateCopy[k] = [...v];
    });

    const { boardState: nextBoardState, captured, message } = executeLocalMove(
      boardStateCopy, turnColor, tokenIdx, roll
    );

    let updatedGame: GameState = { ...localGame, board_state: nextBoardState };
    let logMsg = message;

    const hasWon = nextBoardState[turnColor].every(pos => pos === 56);
    if (hasWon) {
      updatedGame.status = "finished";
      updatedGame.winner = turnColor;
      updatedGame.current_turn = null;
      logMsg += ` ${activePlayer.username} (${turnColor}) HAS WON THE GAME!`;
    } else {
      if (roll === 6 || captured) {
        logMsg += ` ${turnColor} gets another roll!`;
      } else {
        const activeColors = localGame.players.map(p => p.color);
        const nextColor = getLocalNextTurn(turnColor, activeColors);
        updatedGame.current_turn = nextColor;
      }
    }

    updatedGame.has_rolled = false;
    updatedGame.last_roll = null;

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
  const myColor = game?.current_turn; 
  const isMyTurn = game?.status === "playing";

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
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isInteractive && onClick) onClick();
        }}
        disabled={!isInteractive}
        title={`${tokenColor} Token ${tokenIdx + 1}`}
        className={`ludo-king-token ludo-king-token-${tokenColor.toLowerCase()}
          ${isInteractive ? "ring-4 ring-indigo-500 animate-pulse scale-110 cursor-pointer" : "cursor-default"}
        `}
      >
        <Star className="w-3.5 h-3.5 fill-current ludo-king-token-star" />
      </button>
    );
  };

  const renderPathCell = (r: number, c: number) => {
    const key = `${r}_${c}`;
    const cellTokens = tokensByCell[key] || [];

    let cellBg = "bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400";
    let isStar = false;
    let label = "";

    if (SAFE_TRACK_INDICES.has(TRACK_COORDINATES.findIndex(coord => coord[0] === r && coord[1] === c))) {
      isStar = true;
      cellBg = "bg-[#f5f5f5] dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 text-zinc-405 dark:text-zinc-400";
    }

    if (r === 6 && c === 1) {
      cellBg = "bg-red-600 dark:bg-red-500 border border-red-700 dark:border-red-600 text-white font-extrabold";
      label = "➔";
    } else if (r === 7 && c >= 1 && c <= 5) {
      cellBg = "bg-red-500 border border-red-200 dark:border-red-500/30 text-white";
    }
    else if (r === 1 && c === 8) {
      cellBg = "bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-600 text-white font-extrabold";
      label = "↓";
    } else if (c === 7 && r >= 1 && r <= 5) {
      cellBg = "bg-emerald-500 border border-emerald-250 dark:border-emerald-500/30 text-white";
    }
    else if (r === 8 && c === 13) {
      cellBg = "bg-amber-500 dark:bg-amber-400 border border-amber-600 dark:border-amber-500 text-zinc-950 font-extrabold";
      label = "←";
    } else if (r === 7 && c >= 9 && c <= 13) {
      cellBg = "bg-amber-500 border border-amber-250 dark:border-amber-500/30 text-zinc-950";
    }
    else if (r === 13 && c === 6) {
      cellBg = "bg-blue-600 dark:bg-blue-500 border border-blue-700 dark:border-blue-600 text-white font-extrabold";
      label = "↑";
    } else if (c === 7 && r >= 9 && r <= 13) {
      cellBg = "bg-blue-500 border border-blue-250 dark:border-blue-500/30 text-white";
    }

    return (
      <div 
        key={key} 
        style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
        className={`w-full aspect-square flex items-center justify-center relative select-none transition-all ${cellBg}`}
      >
        {isStar && !cellTokens.length && <Star className="w-5 h-5 text-zinc-400 dark:text-zinc-650" />}
        {label && !cellTokens.length && <span className="text-sm font-black opacity-90">{label}</span>}
        
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

    // Check if player exists in local match
    const exists = game?.players.some(p => p.color === yardColor);
    if (!exists) return <div style={{ gridColumn: `${colStart} / span 6`, gridRow: `${rowStart} / span 6` }} className="bg-zinc-100/10 dark:bg-zinc-950/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl" />;

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
                className="bg-slate-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-850 border-dashed rounded-full flex items-center justify-center aspect-square shadow-inner"
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
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none z-0" />

      {!isStarted ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/35 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-605 dark:from-emerald-300 via-teal-650 dark:via-zinc-400 to-indigo-650 dark:to-indigo-300 bg-clip-text text-transparent">
              Pass & Play
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Local Offline Ludo Match</p>
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
                        ? "bg-emerald-605 text-white border-transparent scale-105 shadow-md" 
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 hover:border-zinc-350"
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
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                {localPlayerCount >= 3 ? (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-605 dark:text-emerald-500 uppercase tracking-widest">Player 2 (GREEN)</span>
                    <input
                      type="text"
                      required
                      value={localPlayerNames.GREEN}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, GREEN: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                ) : null}

                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                    {localPlayerCount === 2 ? "Player 2" : "Player 3"} (YELLOW)
                  </span>
                  <input
                    type="text"
                    required
                    value={localPlayerNames.YELLOW}
                    onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, YELLOW: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/ludo" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </Link>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Start Game
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
                  <div className="absolute inset-0 bg-red-600 dark:bg-red-500 border-r border-red-500/10" style={{ clipPath: "polygon(0% 0%, 50% 50%, 0% 100%)" }} />
                  <div className="absolute inset-0 bg-emerald-600 dark:bg-emerald-500 border-b border-emerald-500/10" style={{ clipPath: "polygon(0% 0%, 100% 0%, 50% 50%)" }} />
                  <div className="absolute inset-0 bg-amber-500 dark:bg-amber-400 border-l border-amber-500/10" style={{ clipPath: "polygon(100% 0%, 100% 100%, 50% 50%)" }} />
                  <div className="absolute inset-0 bg-blue-600 dark:bg-blue-500 border-t border-blue-500/10" style={{ clipPath: "polygon(0% 100%, 100% 100%, 50% 50%)" }} />

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
                  <Monitor className="w-5 h-5 text-emerald-500" /> Pass & Play
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
                  <span className="capitalize font-bold text-emerald-500">
                    {game?.players.find(p => p.color === game.current_turn)?.username || game?.current_turn}
                  </span>
                </div>
                
                {/* Players */}
                <div className="space-y-1.5">
                  {game?.players.map((p) => {
                    const isTurn = game?.status === "playing" && game?.current_turn === p.color;
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
                          <span className={`text-xs font-medium text-zinc-650 dark:text-zinc-300`}>
                            {p.username}
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
                        <Sparkles className="w-4 h-4" /> Winner: {game.winner}
                      </div>
                    ) : isMyTurn ? (
                      <div className="text-emerald-650 dark:text-emerald-450 font-bold text-sm">
                        {game?.has_rolled ? "Select token to move" : "Your Turn: Roll!"}
                      </div>
                    ) : null}
                  </div>

                  {game?.status === "playing" && (
                    <Dice
                      val={game?.last_roll || 0}
                      isRolling={isRolling}
                      onClick={handleRollDice}
                      disabled={!isMyTurn || !!game?.has_rolled || isRolling}
                      color={myColor || "RED"}
                    />
                  )}
                </div>

                {isMyTurn && game?.has_rolled && eligibleMoves.length > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl mt-3">
                    <div className="text-xs font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-wider mb-2">Available Token Moves</div>
                    <div className="flex flex-wrap gap-2">
                      {eligibleMoves.map((tIdx) => {
                        const pos = game?.board_state[myColor || ""][tIdx];
                        return (
                          <button
                            key={tIdx}
                            onClick={() => handleMoveToken(tIdx)}
                            className="bg-emerald-655 hover:bg-emerald-505 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            Token {tIdx + 1}
                            <span className="text-[10px] font-normal text-emerald-200">
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
                <Sparkles className="w-4 h-4 text-emerald-500" /> Activity Log
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
