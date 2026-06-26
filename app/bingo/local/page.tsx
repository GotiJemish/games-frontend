"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, RotateCcw, Award, Sparkles, Sun, Moon, Play } from "lucide-react";

export default function BingoLocal() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [isSetup, setIsSetup] = useState(true);

  // Gameplay State
  const [board1, setBoard1] = useState<number[]>([]);
  const [board2, setBoard2] = useState<number[]>([]);
  const [crossed, setCrossed] = useState<number[]>([]);
  const [isP1Next, setIsP1Next] = useState(true);
  const [winner, setWinner] = useState<string | null>(null); // "BLUE", "RED", "DRAW", or null
  const [scores, setScores] = useState({ BLUE: 0, RED: 0, DRAWS: 0 });
  const [lines, setLines] = useState({ BLUE: 0, RED: 0 });
  const [logs, setLogs] = useState<string[]>([]);

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

  const winningCombos = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], // Rows
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], // Cols
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20] // Diags
  ];

  const calculateLinesLocal = (board: number[], crossedList: number[]) => {
    if (board.length === 0) return 0;
    const crossedSet = new Set(crossedList);
    let count = 0;
    for (const combo of winningCombos) {
      if (combo.every(idx => crossedSet.has(board[idx]))) {
        count++;
      }
    }
    return count;
  };

  const shuffleBoard = () => {
    const arr = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(randomFloat() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Seeded/standard random utility
  const randomFloat = () => {
    return Math.random();
  };

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSetup(false);
    resetGame();
    setScores({ BLUE: 0, RED: 0, DRAWS: 0 });
  };

  const resetGame = () => {
    const b1 = shuffleBoard();
    const b2 = shuffleBoard();
    setBoard1(b1);
    setBoard2(b2);
    setCrossed([]);
    setIsP1Next(true);
    setWinner(null);
    setLines({ BLUE: 0, RED: 0 });
    setLogs(["New game started."]);
  };

  const handleNumberSelect = (num: number) => {
    if (crossed.includes(num) || winner) return;

    const activePlayerName = isP1Next ? p1Name : p2Name;
    const activeColor = isP1Next ? "BLUE" : "RED";
    const nextCrossed = [...crossed, num];
    setCrossed(nextCrossed);

    const l1 = calculateLinesLocal(board1, nextCrossed);
    const l2 = calculateLinesLocal(board2, nextCrossed);
    setLines({ BLUE: l1, RED: l2 });

    const logMsg = `${activePlayerName} (${activeColor}) selected number ${num}`;
    const nextLogs = [logMsg, ...logs];
    setLogs(nextLogs);

    // Winner check: 5 lines to win
    if (l1 >= 5 || l2 >= 5) {
      if (l1 >= 5 && l2 >= 5) {
        if (l1 > l2) {
          setWinner("BLUE");
          setLogs(prev => [`🎉 Game Over! ${p1Name} (BLUE) wins with more lines!`, ...prev]);
          setScores(prev => ({ ...prev, BLUE: prev.BLUE + 1 }));
        } else if (l2 > l1) {
          setWinner("RED");
          setLogs(prev => [`🎉 Game Over! ${p2Name} (RED) wins with more lines!`, ...prev]);
          setScores(prev => ({ ...prev, RED: prev.RED + 1 }));
        } else {
          setWinner("DRAW");
          setLogs(prev => [`🤝 Game Over! It's a DRAW! Both reached equal lines.`, ...prev]);
          setScores(prev => ({ ...prev, DRAWS: prev.DRAWS + 1 }));
        }
      } else if (l1 >= 5) {
        setWinner("BLUE");
        setLogs(prev => [`🎉 Game Over! ${p1Name} (BLUE) wins!`, ...prev]);
        setScores(prev => ({ ...prev, BLUE: prev.BLUE + 1 }));
      } else {
        setWinner("RED");
        setLogs(prev => [`🎉 Game Over! ${p2Name} (RED) wins!`, ...prev]);
        setScores(prev => ({ ...prev, RED: prev.RED + 1 }));
      }
    } else {
      setIsP1Next(!isP1Next);
    }
  };

  const getBingoLetters = (linesCount: number) => {
    const letters = ["B", "I", "N", "G", "O"];
    return (
      <div className="flex gap-1 justify-center my-2">
        {letters.map((l, i) => {
          const isActive = linesCount > i;
          return (
            <span
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-all border duration-300
                ${isActive 
                  ? "bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20 scale-110 font-black animate-pulse" 
                  : "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-650"
                }
              `}
            >
              {l}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-emerald-900/10 dark:bg-emerald-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/bingo" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Exit Mode
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-6xl z-10 flex flex-col items-center justify-center mt-12">
        {isSetup ? (
          /* Lobby Configuration Form */
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Local Pass & Play</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Enter player names below to generate random 5x5 boards.</p>
            </div>
            <form onSubmit={handleStartGame} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 1 (Blue)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-blue-500" />
                  <input
                    type="text"
                    required
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Player 2 (Red)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-red-500" />
                  <input
                    type="text"
                    required
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-red-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Start Match
              </button>
            </form>
          </div>
        ) : (
          /* Main Gameplay Panel */
          <div className="w-full flex flex-col xl:flex-row gap-8 items-stretch justify-center">
            {/* Left: Player 1 Board */}
            <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between items-center text-center">
              <div>
                <h3 className="text-xl font-extrabold text-blue-500 truncate max-w-64">{p1Name}</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black mt-0.5">Wins: {scores.BLUE}</p>
                {getBingoLetters(lines.BLUE)}
              </div>

              {/* Grid 5x5 */}
              <div className="w-full max-w-sm aspect-square grid grid-cols-5 gap-2 my-6">
                {board1.map((num, idx) => {
                  const isCrossed = crossed.includes(num);
                  const isMyTurn = isP1Next && !winner;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNumberSelect(num)}
                      disabled={isCrossed || !!winner || !isMyTurn}
                      className={`w-full aspect-square rounded-xl border flex items-center justify-center text-base font-extrabold transition-all duration-200 cursor-pointer active:scale-90
                        ${isCrossed 
                          ? "bg-blue-500/10 border-blue-500/40 text-blue-500 line-through decoration-blue-500 decoration-2" 
                          : isMyTurn 
                            ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400" 
                            : "bg-zinc-100/50 dark:bg-zinc-950/30 border-zinc-200/50 dark:border-zinc-850/40 opacity-70 cursor-not-allowed"
                        }
                      `}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                Completed Lines: <strong className="text-blue-500 text-sm">{lines.BLUE}</strong> / 5
              </div>
            </div>

            {/* Middle: Control center & feed */}
            <div className="w-full xl:w-72 flex flex-col gap-6 justify-between items-center py-2">
              {/* Scoreboard and active turn */}
              <div className="w-full text-center space-y-4">
                {winner ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-850 text-base font-black shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500 animate-spin" />
                    <span>
                      {winner === "DRAW" ? "It's a Draw!" : `${winner === "BLUE" ? p1Name : p2Name} Wins!`}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center justify-center gap-2 px-5 py-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-455 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>
                      Turn: <strong className={isP1Next ? "text-blue-500" : "text-red-500"}>{isP1Next ? p1Name : p2Name}</strong>
                    </span>
                  </div>
                )}
                
                {/* Draws count */}
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Draws Counter: {scores.DRAWS}</p>
              </div>

              {/* Feed logs */}
              <div className="w-full h-48 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <h4 className="text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">Logs</h4>
                <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 text-[10px] font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                  {logs.map((l, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-850/40">
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls buttons */}
              <div className="flex flex-col gap-2 w-full">
                <button onClick={resetGame} className="w-full py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-xs font-black rounded-2xl hover:text-emerald-500 hover:border-emerald-500/50 active:scale-95 transition-all shadow-sm cursor-pointer">
                  <RotateCcw className="w-4 h-4 inline mr-1.5" /> Reset Board
                </button>
                <button onClick={() => setIsSetup(true)} className="w-full py-3 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-xs font-black rounded-2xl hover:text-blue-500 hover:border-blue-500/50 active:scale-95 transition-all shadow-sm cursor-pointer">
                  Setup Players
                </button>
              </div>
            </div>

            {/* Right: Player 2 Board */}
            <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between items-center text-center">
              <div>
                <h3 className="text-xl font-extrabold text-red-500 truncate max-w-64">{p2Name}</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black mt-0.5">Wins: {scores.RED}</p>
                {getBingoLetters(lines.RED)}
              </div>

              {/* Grid 5x5 */}
              <div className="w-full max-w-sm aspect-square grid grid-cols-5 gap-2 my-6">
                {board2.map((num, idx) => {
                  const isCrossed = crossed.includes(num);
                  const isMyTurn = !isP1Next && !winner;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNumberSelect(num)}
                      disabled={isCrossed || !!winner || !isMyTurn}
                      className={`w-full aspect-square rounded-xl border flex items-center justify-center text-base font-extrabold transition-all duration-200 cursor-pointer active:scale-90
                        ${isCrossed 
                          ? "bg-red-500/10 border-red-500/40 text-red-500 line-through decoration-red-500 decoration-2" 
                          : isMyTurn 
                            ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850 hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-400" 
                            : "bg-zinc-100/50 dark:bg-zinc-950/30 border-zinc-200/50 dark:border-zinc-850/40 opacity-70 cursor-not-allowed"
                        }
                      `}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                Completed Lines: <strong className="text-red-500 text-sm">{lines.RED}</strong> / 5
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
