"use client";

import React, { useState } from "react";
import { User, RotateCcw, Award, Sparkles, Play } from "lucide-react";

const BOARD_SIZE = 8;

type PieceType = "RED" | "RED_KING" | "BLACK" | "BLACK_KING" | null;

function initBoard(): PieceType[] {
  const board: PieceType[] = new Array(64).fill(null);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row * 8 + col] = "RED";
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row * 8 + col] = "BLACK";
    }
  }
  return board;
}

function getValidMoves(board: PieceType[], color: "RED" | "BLACK"): [number, number][] {
  const ownPieces: PieceType[] = color === "RED" ? ["RED", "RED_KING"] : ["BLACK", "BLACK_KING"];
  const oppPieces: PieceType[] = color === "RED" ? ["BLACK", "BLACK_KING"] : ["RED", "RED_KING"];
  const moves: [number, number][] = [];
  const captures: [number, number][] = [];

  for (let pos = 0; pos < 64; pos++) {
    const piece = board[pos];
    if (!ownPieces.includes(piece)) continue;
    const row = Math.floor(pos / 8);
    const col = pos % 8;
    const isKing = piece?.endsWith("_KING");

    let directions: [number, number][];
    if (isKing) {
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else if (color === "RED") {
      directions = [[1, -1], [1, 1]];
    } else {
      directions = [[-1, -1], [-1, 1]];
    }

    for (const [dr, dc] of directions) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === null) {
        moves.push([pos, nr * 8 + nc]);
      }
      const jr = row + 2 * dr, jc = col + 2 * dc;
      const mr = row + dr, mc = col + dc;
      if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
        if (oppPieces.includes(board[mr * 8 + mc]) && board[jr * 8 + jc] === null) {
          captures.push([pos, jr * 8 + jc]);
        }
      }
    }
  }
  return captures.length > 0 ? captures : moves;
}

function checkWinner(board: PieceType[]): string | null {
  let red = 0, black = 0;
  board.forEach(c => { if (c === "RED" || c === "RED_KING") red++; if (c === "BLACK" || c === "BLACK_KING") black++; });
  if (red === 0) return "BLACK";
  if (black === 0) return "RED";
  if (getValidMoves(board, "RED").length === 0) return "BLACK";
  if (getValidMoves(board, "BLACK").length === 0) return "RED";
  return null;
}

export default function CheckersLocal() {
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [isSetup, setIsSetup] = useState(true);
  const [board, setBoard] = useState<PieceType[]>(initBoard());
  const [currentTurn, setCurrentTurn] = useState<"RED" | "BLACK">("RED");
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [scores, setScores] = useState({ RED: 0, BLACK: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [chainFrom, setChainFrom] = useState<number | null>(null);

  const validMoves = getValidMoves(board, currentTurn);
  const selectedMoves = selectedPos !== null
    ? validMoves.filter(([f]) => f === selectedPos).map(([, t]) => t)
    : [];

  const handleCellClick = (pos: number) => {
    if (winner) return;
    const piece = board[pos];

    // If in chain mode, only allow moves from chain position
    if (chainFrom !== null) {
      if (pos === chainFrom) {
        setSelectedPos(pos);
        return;
      }
      if (selectedPos === chainFrom && selectedMoves.includes(pos)) {
        executeMove(chainFrom, pos);
        return;
      }
      return;
    }

    // Select own piece
    const ownPieces: PieceType[] = currentTurn === "RED" ? ["RED", "RED_KING"] : ["BLACK", "BLACK_KING"];
    if (ownPieces.includes(piece)) {
      // Only allow selecting pieces that have valid moves
      const pieceMoves = validMoves.filter(([f]) => f === pos);
      if (pieceMoves.length > 0) {
        setSelectedPos(pos);
      }
      return;
    }

    // Move to target
    if (selectedPos !== null && selectedMoves.includes(pos)) {
      executeMove(selectedPos, pos);
    }
  };

  const executeMove = (from: number, to: number) => {
    const newBoard = [...board];
    const piece = newBoard[from]!;
    const fromRow = Math.floor(from / 8);
    const toRow = Math.floor(to / 8);
    const fromCol = from % 8;
    const toCol = to % 8;
    const isCapture = Math.abs(fromRow - toRow) === 2;
    const playerName = currentTurn === "RED" ? p1Name : p2Name;

    newBoard[from] = null;

    let isKinged = false;
    if (piece === "RED" && toRow === 7) { newBoard[to] = "RED_KING"; isKinged = true; }
    else if (piece === "BLACK" && toRow === 0) { newBoard[to] = "BLACK_KING"; isKinged = true; }
    else newBoard[to] = piece;

    let logMsg = "";
    if (isCapture) {
      const midRow = (fromRow + toRow) / 2;
      const midCol = (fromCol + toCol) / 2;
      newBoard[midRow * 8 + midCol] = null;
      logMsg = `${playerName} captured a piece!`;
      if (isKinged) logMsg += " Promoted to KING! 👑";

      // Check for chain jumps (multi-capture)
      if (!isKinged) {
        const tempMoves = getValidMoves(newBoard, currentTurn);
        const chainCaptures = tempMoves.filter(([f, t]) => f === to && Math.abs(Math.floor(f / 8) - Math.floor(t / 8)) === 2);
        if (chainCaptures.length > 0) {
          setBoard(newBoard);
          setSelectedPos(to);
          setChainFrom(to);
          setLogs(prev => [logMsg + " (chain jump!)", ...prev]);
          return;
        }
      }
    } else {
      logMsg = `${playerName} moved to cell ${to}`;
      if (isKinged) logMsg += " Promoted to KING! 👑";
    }

    setBoard(newBoard);
    setSelectedPos(null);
    setChainFrom(null);

    const w = checkWinner(newBoard);
    if (w) {
      setWinner(w);
      const winnerName = w === "RED" ? p1Name : p2Name;
      setLogs(prev => [`🎉 ${winnerName} (${w}) wins!`, logMsg, ...prev]);
      setScores(prev => ({ ...prev, [w]: prev[w as "RED" | "BLACK"] + 1 }));
    } else {
      const next = currentTurn === "RED" ? "BLACK" : "RED";
      setCurrentTurn(next as "RED" | "BLACK");
      setLogs(prev => [logMsg, ...prev]);
    }
  };

  const resetGame = () => {
    setBoard(initBoard());
    setCurrentTurn("RED");
    setSelectedPos(null);
    setWinner(null);
    setChainFrom(null);
    setLogs(["New game started."]);
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSetup(false);
    resetGame();
    setScores({ RED: 0, BLACK: 0 });
  };

  const getPieceColor = (piece: PieceType) => {
    if (piece === "RED" || piece === "RED_KING") return "red";
    if (piece === "BLACK" || piece === "BLACK_KING") return "black";
    return null;
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-red-900/10 dark:bg-red-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-amber-900/10 dark:bg-amber-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {isSetup ? (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Local Pass & Play</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter player names below to start the checkers battle.</p>
            </div>
            <form onSubmit={handleStartGame} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 1 (Red)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-red-500" />
                  <input type="text" required value={p1Name} onChange={(e) => setP1Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-red-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 2 (Black)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  <input type="text" required value={p2Name} onChange={(e) => setP2Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-zinc-500 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Start Match
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center gap-6">
              {/* Scoreboard */}
              <div className="w-full max-w-md grid grid-cols-2 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-lg gap-2">
                <div className="border-r border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold truncate">{p1Name} (Red)</p>
                  <p className="text-xl font-extrabold text-red-500 mt-1">{scores.RED}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold truncate">{p2Name} (Black)</p>
                  <p className="text-xl font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">{scores.BLACK}</p>
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                {winner ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-lg font-bold shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>{winner === "RED" ? p1Name : p2Name} Won!</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentTurn === "RED" ? "bg-red-400" : "bg-zinc-600"} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTurn === "RED" ? "bg-red-500" : "bg-zinc-700"}`}></span>
                    </span>
                    <span>
                      Active Turn: <strong className={currentTurn === "RED" ? "text-red-500" : "text-zinc-800 dark:text-zinc-200"}>{currentTurn === "RED" ? p1Name : p2Name} ({currentTurn})</strong>
                    </span>
                    {chainFrom !== null && <span className="ml-2 text-amber-500 text-xs font-bold animate-pulse">Chain Jump!</span>}
                  </div>
                )}
              </div>

              {/* Board */}
              <div className="relative bg-amber-900/90 dark:bg-amber-950 rounded-3xl p-3 shadow-2xl border-4 border-amber-800 dark:border-amber-900">
                <div className="grid grid-cols-8 gap-0" style={{ width: "min(80vw, 440px)", height: "min(80vw, 440px)" }}>
                  {Array.from({ length: 64 }).map((_, idx) => {
                    const row = Math.floor(idx / 8);
                    const col = idx % 8;
                    const isDark = (row + col) % 2 === 1;
                    const piece = board[idx];
                    const isSelected = selectedPos === idx;
                    const isTarget = selectedMoves.includes(idx);
                    const pieceColor = getPieceColor(piece);
                    const isKing = piece?.endsWith("_KING");

                    return (
                      <button
                        key={idx}
                        onClick={() => handleCellClick(idx)}
                        className={`relative flex items-center justify-center transition-all duration-150
                          ${isDark ? "bg-amber-800/80 dark:bg-amber-900/90" : "bg-amber-200 dark:bg-amber-100/90"}
                          ${isSelected ? "ring-3 ring-yellow-400 z-10" : ""}
                          ${isTarget ? "ring-2 ring-green-400/70" : ""}
                          ${!winner ? "cursor-pointer hover:brightness-110" : "cursor-default"}
                        `}
                        style={{ aspectRatio: "1/1" }}
                        disabled={!!winner}
                      >
                        {/* Valid move indicator */}
                        {isTarget && !piece && (
                          <div className="absolute w-4 h-4 rounded-full bg-green-400/50 animate-pulse" />
                        )}

                        {/* Piece */}
                        {piece && (
                          <div className={`w-[75%] h-[75%] rounded-full border-2 shadow-lg flex items-center justify-center transition-transform
                            ${pieceColor === "red" 
                              ? "bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-red-900/50" 
                              : "bg-gradient-to-br from-zinc-700 to-zinc-900 border-zinc-500 shadow-zinc-900/50"}
                            ${isSelected ? "scale-110 shadow-xl" : "hover:scale-105"}
                          `}>
                            {isKing && (
                              <span className="text-amber-300 text-lg font-bold drop-shadow-lg select-none">♔</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset Controls */}
              <div className="flex gap-4">
                <button onClick={resetGame} className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-sm font-black rounded-2xl hover:text-red-500 hover:border-red-500/50 shadow-md active:scale-95 transition-all cursor-pointer">
                  <RotateCcw className="w-4 h-4" /> Reset Board
                </button>
                <button onClick={() => setIsSetup(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-sm font-black rounded-2xl hover:text-amber-500 hover:border-amber-500/50 shadow-md active:scale-95 transition-all cursor-pointer">
                  Setup Players
                </button>
              </div>
            </div>

            {/* Game Feed */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" /> Match Feed
              </h3>
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 text-xs font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                {logs.length === 0 ? (
                  <p className="text-zinc-400 italic">No turns played yet.</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-350 border border-zinc-200/50 dark:border-zinc-800/40 animate-fade-in break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
