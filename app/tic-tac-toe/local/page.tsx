"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/use-theme";
import { ArrowLeft, User, RotateCcw, Award, Sparkles, Play } from "lucide-react";

export default function TicTacToeLocal() {
  const { theme } = useTheme();
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [isSetup, setIsSetup] = useState(true);

  // Gameplay State
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null); // "X", "O", "DRAW", or null
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, DRAWS: 0 });
  const [logs, setLogs] = useState<string[]>([]);


  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const checkWinnerLocal = (currentBoard: (string | null)[]) => {
    for (const combo of winningCombos) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winnerName: currentBoard[a], combo };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winnerName: "DRAW", combo: null };
    }
    return { winnerName: null, combo: null };
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    const currentPlayer = isXNext ? "X" : "O";
    const currentPlayerName = isXNext ? p1Name : p2Name;
    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;

    setBoard(nextBoard);
    
    const logMsg = `${currentPlayerName} placed ${currentPlayer} at cell ${index + 1}`;
    const nextLogs = [logMsg, ...logs];
    setLogs(nextLogs);

    const result = checkWinnerLocal(nextBoard);
    if (result.winnerName) {
      setWinner(result.winnerName);
      if (result.combo) {
        setWinningLine(result.combo);
        const winPlayerName = result.winnerName === "X" ? p1Name : p2Name;
        setLogs(prev => [`🎉 Game Over! ${winPlayerName} (${result.winnerName}) wins!`, ...prev]);
        setScores(prev => ({
          ...prev,
          [result.winnerName!]: prev[result.winnerName as "X" | "O"] + 1
        }));
      } else {
        setLogs(prev => [`🤝 Game Over! It's a Draw!`, ...prev]);
        setScores(prev => ({ ...prev, DRAWS: prev.DRAWS + 1 }));
      }
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
    setLogs(["New game started."]);
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSetup(false);
    resetGame();
    setScores({ X: 0, O: 0, DRAWS: 0 });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-cyan-900/10 dark:bg-cyan-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-fuchsia-900/10 dark:bg-fuchsia-900/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {isSetup ? (
          /* Lobby Configuration Form */
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Local Pass & Play</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter player names below to start the local battle.</p>
            </div>
            <form onSubmit={handleStartGame} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 1 (X)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-fuchsia-500" />
                  <input
                    type="text"
                    required
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-fuchsia-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 2 (O)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-cyan-500" />
                  <input
                    type="text"
                    required
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-cyan-550 to-teal-550 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Start Match
              </button>
            </form>
          </div>
        ) : (
          /* Main Gameplay Panel */
          <>
            {/* Left Column: Board and Player turns */}
            <div className="flex-1 flex flex-col items-center gap-6">
              {/* Scoreboard */}
              <div className="w-full max-w-md grid grid-cols-3 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-lg gap-2">
                <div className="border-r border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold truncate">{p1Name}</p>
                  <p className="text-xl font-extrabold text-fuchsia-500 mt-1">{scores.X}</p>
                </div>
                <div className="border-r border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold">Draws</p>
                  <p className="text-xl font-extrabold text-zinc-650 mt-1">{scores.DRAWS}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold truncate">{p2Name}</p>
                  <p className="text-xl font-extrabold text-cyan-500 mt-1">{scores.O}</p>
                </div>
              </div>

              {/* Status Header */}
              <div className="text-center">
                {winner ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-lg font-bold shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>
                      {winner === "DRAW" ? "It's a Draw!" : `${winner === "X" ? p1Name : p2Name} Won!`}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-550"></span>
                    </span>
                    <span>
                      Active Turn: <strong className={isXNext ? "text-fuchsia-500" : "text-cyan-500"}>{isXNext ? p1Name : p2Name} ({isXNext ? "X" : "O"})</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Tic Tac Toe Grid */}
              <div className="relative w-full max-w-sm aspect-square bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xl backdrop-blur-md flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-3">
                  {board.map((cell, idx) => {
                    const isWinning = winningLine?.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleCellClick(idx)}
                        disabled={!!cell || !!winner}
                        className={`w-full h-full rounded-2xl border transition-all relative flex items-center justify-center text-4xl font-extrabold focus:outline-none cursor-pointer active:scale-95
                          ${cell === null ? "bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50" : ""}
                          ${cell === "X" ? "border-fuchsia-500/20 text-fuchsia-500 bg-fuchsia-500/5" : ""}
                          ${cell === "O" ? "border-cyan-500/20 text-cyan-500 bg-cyan-500/5" : ""}
                          ${isWinning ? "ring-4 ring-amber-500 border-amber-500 shadow-lg shadow-amber-500/20" : ""}
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
                        {!cell && !winner && (
                          <div className="opacity-0 hover:opacity-20 absolute inset-0 flex items-center justify-center transition-opacity">
                            {isXNext ? (
                              <svg className="w-10 h-10 text-fuchsia-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            ) : (
                              <svg className="w-9 h-9 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

              {/* Reset Controls */}
              <div className="flex gap-4">
                <button onClick={resetGame} className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-sm font-black rounded-2xl hover:text-cyan-500 hover:border-cyan-500/50 shadow-md active:scale-95 transition-all cursor-pointer">
                  <RotateCcw className="w-4 h-4" /> Reset Board
                </button>
                <button onClick={() => setIsSetup(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-sm font-black rounded-2xl hover:text-fuchsia-500 hover:border-fuchsia-500/50 shadow-md active:scale-95 transition-all cursor-pointer">
                  Setup Players
                </button>
              </div>
            </div>

            {/* Right Column: Game Feed Log */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500" /> Match Feed
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
