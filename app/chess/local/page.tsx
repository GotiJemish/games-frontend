"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";
import {
  User, ArrowLeft, Play, LogOut, Sparkles, Award, Users
} from "lucide-react";

interface ChatMessage {
  type: "system" | "move";
  message: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚"
};

const PIECE_NAMES: Record<string, string> = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King"
};

export default function ChessLocalPage() {
  
  // Game Setup
  const [playerWhite, setPlayerWhite] = useState("");
  const [playerBlack, setPlayerBlack] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  // Gameplay State
  const chessRef = useRef<Chess | null>(null);
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [history, setHistory] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"WHITE" | "BLACK">("WHITE");
  const [winner, setWinner] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [logMessages, setLogMessages] = useState<ChatMessage[]>([]);

  // Selection states for Chess board
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [promotionTarget, setPromotionTarget] = useState<{ from: string; to: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const logBottomRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll log
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logMessages]);

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    const whiteName = playerWhite.trim() || "White Player";
    const blackName = playerBlack.trim() || "Black Player";
    setPlayerWhite(whiteName);
    setPlayerBlack(blackName);
    
    const newChess = new Chess();
    chessRef.current = newChess;
    setFen(newChess.fen());
    setHistory([]);
    setCurrentTurn("WHITE");
    setWinner(null);
    setIsGameOver(false);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPromotionTarget(null);
    setLogMessages([{
      type: "system",
      message: `Game started: ${whiteName} vs ${blackName}`
    }]);
    setIsStarted(true);
  };

  const activeChess = chessRef.current;

  // Chess board coordinates logic
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const getKingSquare = (squareColor: "w" | "b") => {
    if (!activeChess) return null;
    const boardMat = activeChess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardMat[r][c];
        if (p && p.type === "k" && p.color === squareColor) {
          const fileLetter = String.fromCharCode(97 + c);
          const rankNum = 8 - r;
          return `${fileLetter}${rankNum}`;
        }
      }
    }
    return null;
  };

  const checkKingSquare = useMemo(() => {
    if (!activeChess || !activeChess.inCheck()) return null;
    return getKingSquare(activeChess.turn());
  }, [activeChess, fen]);

  // Captured pieces computation
  const capturedPieces = useMemo(() => {
    const startCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const active = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    const boardPart = fen.split(" ")[0];
    for (const char of boardPart) {
      if (char === "/" || /[0-9]/.test(char) || char.toLowerCase() === "k") continue;
      const isWhite = char === char.toUpperCase();
      const type = char.toLowerCase() as "p" | "n" | "b" | "r" | "q";
      const colorKey = isWhite ? "w" : "b";
      active[colorKey][type]++;
    }

    const capturedW: string[] = [];
    const capturedB: string[] = [];

    Object.entries(startCounts).forEach(([type, count]) => {
      const diff = count - active.w[type as "p" | "n" | "b" | "r" | "q"];
      for (let i = 0; i < diff; i++) capturedW.push(type);
    });

    Object.entries(startCounts).forEach(([type, count]) => {
      const diff = count - active.b[type as "p" | "n" | "b" | "r" | "q"];
      for (let i = 0; i < diff; i++) capturedB.push(type);
    });

    return { WHITE: capturedW, BLACK: capturedB };
  }, [fen]);

  // Click handler on board square
  const handleSquareClick = (square: string) => {
    if (!activeChess || isGameOver) return;
    if (promotionTarget) return;

    if (possibleMoves.includes(square) && selectedSquare) {
      const piece = activeChess.get(selectedSquare as any);
      const isPawn = piece?.type === "p";
      const targetRank = square[1];
      const isPromotion = isPawn && (targetRank === "8" || targetRank === "1");

      if (isPromotion) {
        setPromotionTarget({ from: selectedSquare, to: square });
      } else {
        executeMove(selectedSquare, square);
      }
      return;
    }

    const piece = activeChess.get(square as any);
    const activeColorSymbol = activeChess.turn(); // 'w' or 'b'
    const expectedColor = activeColorSymbol === "w" ? "WHITE" : "BLACK";

    if (piece && piece.color === activeColorSymbol) {
      setSelectedSquare(square);
      const moves = activeChess.moves({ square: square as any, verbose: true }) as any[];
      setPossibleMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const executeMove = (from: string, to: string, promotionPiece?: string) => {
    if (!activeChess) return;

    try {
      const moveResult = activeChess.move({
        from: from as any,
        to: to as any,
        promotion: promotionPiece || undefined
      });

      if (moveResult) {
        setFen(activeChess.fen());
        setHistory(activeChess.history());
        const turnColor = activeChess.turn() === "w" ? "WHITE" : "BLACK";
        setCurrentTurn(turnColor);
        
        // Log move
        const moveDesc = moveResult.san;
        const playerMoved = currentTurn === "WHITE" ? playerWhite : playerBlack;
        setLogMessages(prev => [...prev, {
          type: "move",
          message: `${playerMoved}: ${moveDesc}`
        }]);

        // Check game over conditions
        if (activeChess.isGameOver()) {
          setIsGameOver(true);
          if (activeChess.isCheckmate()) {
            const winnerName = currentTurn === "WHITE" ? playerWhite : playerBlack;
            setWinner(winnerName);
            setLogMessages(prev => [...prev, {
              type: "system",
              message: `Checkmate! Winner: ${winnerName}`
            }]);
          } else if (activeChess.isDraw()) {
            setLogMessages(prev => [...prev, {
              type: "system",
              message: "Game ended in a Draw."
            }]);
          }
        }
      }
    } catch (err) {
      // Invalid move
    }

    setSelectedSquare(null);
    setPossibleMoves([]);
    setPromotionTarget(null);
  };

  const handleLeaveGame = () => {
    setIsStarted(false);
    chessRef.current = null;
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setHistory([]);
    setLogMessages([]);
    setWinner(null);
    setIsGameOver(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-indigo-900/10 dark:bg-indigo-900/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none z-0" />

      {!isStarted ? (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-600/35 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-650 dark:from-purple-300 via-violet-650 dark:via-zinc-400 to-indigo-650 dark:to-indigo-300 bg-clip-text text-transparent">
              Pass & Play
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Local Offline Chess Match</p>
          </div>

          <form onSubmit={handleStartGame} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Player 1 (White)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="White Player Name"
                  value={playerWhite}
                  onChange={(e) => setPlayerWhite(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                />
                <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Player 2 (Black)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Black Player Name"
                  value={playerBlack}
                  onChange={(e) => setPlayerBlack(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                />
                <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/chess" className="flex-1">
                <button
                  type="button"
                  className="w-full bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </Link>
              <button
                type="submit"
                className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
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
            
            {/* Top Player Details / Captured Pieces */}
            <div className="w-full max-w-[560px] flex items-center justify-between px-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-zinc-850 dark:bg-zinc-900 border border-zinc-700" />
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                  {playerBlack}
                </span>
                {currentTurn === "BLACK" && !isGameOver && (
                  <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full animate-pulse border border-purple-500/20 font-bold">Their Turn</span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 h-6">
                {capturedPieces.WHITE.map((type, idx) => (
                  <span key={idx} className="text-lg text-zinc-400 dark:text-zinc-650 filter drop-shadow select-none">
                    {PIECE_SYMBOLS[type]}
                  </span>
                ))}
              </div>
            </div>

            {/* Chessboard Grid */}
            <div className="relative w-full max-w-[560px] aspect-square bg-zinc-900/10 dark:bg-zinc-900/30 backdrop-blur-md rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
              {promotionTarget && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 rounded-2xl">
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl max-w-xs text-center space-y-4">
                    <h3 className="font-extrabold text-white text-lg">Pawn Promotion</h3>
                    <p className="text-xs text-zinc-400">Choose which piece you want to promote your pawn to:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: "q", name: "Queen" },
                        { type: "r", name: "Rook" },
                        { type: "b", name: "Bishop" },
                        { type: "n", name: "Knight" }
                      ].map((promo) => (
                        <button
                          key={promo.type}
                          onClick={() => executeMove(promotionTarget.from, promotionTarget.to, promo.type)}
                          className="p-3 bg-zinc-800 hover:bg-purple-650 rounded-xl text-3xl text-zinc-200 hover:text-white cursor-pointer active:scale-95 transition-all flex flex-col items-center gap-1"
                        >
                          <span>{PIECE_SYMBOLS[promo.type]}</span>
                          <span className="text-[10px] font-semibold tracking-wide uppercase">{promo.type}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPromotionTarget(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-350 cursor-pointer pt-2 block mx-auto underline"
                    >
                      Cancel Move
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-8 grid-rows-8 w-full h-full border border-[#b58863]/40 rounded-lg overflow-hidden shadow-md">
                {ranks.map((rank, rankIdx) =>
                  files.map((file, fileIdx) => {
                    const square = `${file}${rank}`;
                    const isDark = (rankIdx + fileIdx) % 2 === 1;
                    const squareColor = isDark ? "#b58863" : "#f0d9b5";
                    const piece = activeChess?.get(square as any);
                    const isSelected = selectedSquare === square;
                    const isTarget = possibleMoves.includes(square);
                    const isCheck = checkKingSquare === square;

                    return (
                      <div
                        key={square}
                        onClick={() => handleSquareClick(square)}
                        style={{ backgroundColor: squareColor }}
                        className="relative aspect-square flex items-center justify-center select-none cursor-pointer transition-all duration-150"
                      >
                        {isSelected && <div className="absolute inset-0 bg-[#bac155]/50 z-0 pointer-events-none" />}
                        {isCheck && <div className="absolute inset-0 bg-red-500/35 animate-pulse z-0 pointer-events-none" />}

                        {piece && (
                          imageErrors[square] ? (
                            <span className={`text-3xl md:text-4xl font-semibold select-none transition-transform duration-200 active:scale-90 z-10 ${piece.color === "w" ? "text-zinc-100" : "text-violet-500"}`}>
                              {PIECE_SYMBOLS[piece.type]}
                            </span>
                          ) : (
                            <img
                              src={`https://lichess1.org/assets/piece/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`}
                              onError={() => setImageErrors(prev => ({ ...prev, [square]: true }))}
                              className="w-[90%] h-[90%] object-contain select-none pointer-events-none z-10 transition-transform duration-100 active:scale-95"
                              alt={`${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`}
                            />
                          )
                        )}

                        {isTarget && (
                          piece ? (
                            <div className="absolute w-[80%] h-[80%] rounded-full border-[5px] border-zinc-800/20 dark:border-zinc-900/25 z-20 pointer-events-none" />
                          ) : (
                            <div className="absolute w-3.5 h-3.5 rounded-full bg-zinc-800/15 dark:bg-zinc-900/20 z-20 pointer-events-none" />
                          )
                        )}

                        {rankIdx === 7 && (
                          <span className={`absolute bottom-0.5 left-1 text-[11px] font-bold select-none z-20 ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                            {file}
                          </span>
                        )}
                        {fileIdx === 7 && (
                          <span className={`absolute top-0.5 right-1.5 text-[11px] font-bold select-none z-20 ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                            {rank}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Player Details / Captured Pieces */}
            <div className="w-full max-w-[560px] flex items-center justify-between px-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-zinc-100" />
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                  {playerWhite}
                </span>
                {currentTurn === "WHITE" && !isGameOver && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20 font-bold">Your Turn</span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 h-6">
                {capturedPieces.BLACK.map((type, idx) => (
                  <span key={idx} className="text-lg text-zinc-400 dark:text-zinc-650 filter drop-shadow select-none">
                    {PIECE_SYMBOLS[type]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" /> Pass & Play
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
                  <span className="capitalize font-bold text-purple-500">{currentTurn === "WHITE" ? playerWhite : playerBlack}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                  <span className="text-zinc-400">Moves Played:</span>
                  <span className="font-bold text-zinc-850 dark:text-zinc-200">{history.length}</span>
                </div>
                {winner && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 font-bold text-center justify-center animate-bounce">
                    <Award className="w-5 h-5" />
                    <span>Winner: {winner}!</span>
                  </div>
                )}
                {isGameOver && !winner && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center gap-2 font-bold text-center justify-center">
                    <span>Game ended in Draw</span>
                  </div>
                )}
              </div>
            </div>

            {/* Move Log */}
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> Move Log
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                {logMessages.length === 0 ? (
                  <div className="text-zinc-500 text-center py-8">No moves yet. Make a move!</div>
                ) : (
                  logMessages.map((log, idx) => (
                    <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans font-bold" : ""}`}>
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
