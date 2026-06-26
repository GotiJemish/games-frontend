"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { Chess } from "chess.js";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Sun, Moon, Award, Globe, Copy, Check, Users
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // waiting, playing, finished
  current_turn: string | null; // WHITE, BLACK
  winner: string | null;
  board_state: {
    fen: string;
    history: string[];
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "move";
  username?: string;
  color?: string;
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

export default function ChessOnlinePage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [actionType, setActionType] = useState<"select" | "create" | "join">("select");
  
  // Form input states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("WHITE"); // WHITE or BLACK
  const [gameIdInput, setGameIdInput] = useState("");

  // Game states
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Selection states for Chess board
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [promotionTarget, setPromotionTarget] = useState<{ from: string; to: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 1";
    const myCol = color === "BLACK" ? "BLACK" : "WHITE";
    
    try {
      const createRes = await axios.post(`${httpUrl}games/create`, {
        username: uName,
        color: myCol,
        game_type: "chess"
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
    const myCol = color === "BLACK" ? "BLACK" : "WHITE";

    try {
      const joinRes = await axios.post(`${httpUrl}games/${gId}/join`, {
        username: uName,
        color: myCol
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
      const startRes = await axios.post(`${httpUrl}games/${gameId}/start`);
      setOnlineGame(startRes.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start match");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const game = onlineGame;
  
  // Create current active chess instance helper
  const activeChess = useMemo(() => {
    if (game?.board_state?.fen) {
      return new Chess(game.board_state.fen);
    }
    return null;
  }, [game?.board_state?.fen]);

  // Chess board coordinates logic
  const perspective = useMemo(() => {
    const myPlayer = game?.players?.find(p => p.username === username);
    return myPlayer?.color || "WHITE";
  }, [game, username]);

  const files = useMemo(() => {
    const list = ["a", "b", "c", "d", "e", "f", "g", "h"];
    return perspective === "BLACK" ? [...list].reverse() : list;
  }, [perspective]);

  const ranks = useMemo(() => {
    const list = ["8", "7", "6", "5", "4", "3", "2", "1"];
    return perspective === "BLACK" ? [...list].reverse() : list;
  }, [perspective]);

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
  }, [activeChess]);

  // Active turn calculation
  const myPlayer = game?.players?.find(p => p.username === username);
  const myColor = myPlayer?.color;
  const isMyTurn = game?.status === "playing" && game?.current_turn === myColor;

  // Captured pieces computation
  const capturedPieces = useMemo(() => {
    if (!game?.board_state?.fen) return { WHITE: [], BLACK: [] };
    
    const startCounts = {
      p: 8, n: 2, b: 2, r: 2, q: 1
    };
    
    const active = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    const parts = game.board_state.fen.split(" ");
    const boardPart = parts[0];
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
      for (let i = 0; i < diff; i++) {
        capturedW.push(type);
      }
    });

    Object.entries(startCounts).forEach(([type, count]) => {
      const diff = count - active.b[type as "p" | "n" | "b" | "r" | "q"];
      for (let i = 0; i < diff; i++) {
        capturedB.push(type);
      }
    });

    return {
      WHITE: capturedW,
      BLACK: capturedB
    };
  }, [game?.board_state?.fen]);

  // Click handler on board square
  const handleSquareClick = (square: string) => {
    if (!isMyTurn || !activeChess || game?.status !== "playing") return;
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

    if (piece && piece.color === activeColorSymbol && expectedColor === myColor) {
      setSelectedSquare(square);
      const moves = activeChess.moves({ square: square as any, verbose: true }) as any[];
      setPossibleMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const executeMove = (from: string, to: string, promotionPiece?: string) => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "move_piece",
      from_square: from,
      to_square: to,
      promotion: promotionPiece || null
    }));

    setSelectedSquare(null);
    setPossibleMoves([]);
    setPromotionTarget(null);
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
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPromotionTarget(null);
  };

  const isHost = useMemo(() => {
    if (!game || game.players.length === 0) return false;
    return game.players[0].username === username;
  }, [game, username]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-x-hidden">
      {/* Glow Orbs */}
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35 mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 dark:from-indigo-300 via-purple-650 dark:via-zinc-400 to-indigo-600 dark:to-indigo-300 bg-clip-text text-transparent">
              Online Chess
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Real-time multiplayer lobbies</p>
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
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Create Room
              </button>
              <button
                onClick={() => setActionType("join")}
                className="w-full bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-250 font-bold border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                Join with Room Code
              </button>
              <Link href="/chess" className="block text-center mt-6">
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-350 cursor-pointer underline flex items-center gap-1.5 mx-auto font-bold">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Chess Lobby
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
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Your Side</label>
                <div className="grid grid-cols-2 gap-3">
                  {["WHITE", "BLACK"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3 rounded-xl border text-xs font-bold tracking-widest transition-all cursor-pointer
                        ${color === c 
                          ? "bg-indigo-600 text-white border-transparent scale-105 shadow-lg" 
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
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
                >
                  Create & Wait
                </button>
              </div>
            </form>
          )}

          {actionType === "join" && (
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Room Code / Game ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter game ID"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-mono tracking-wider text-center"
                />
              </div>

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
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Side to Join As</label>
                <div className="grid grid-cols-2 gap-3">
                  {["WHITE", "BLACK"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3 rounded-xl border text-xs font-bold tracking-widest transition-all cursor-pointer
                        ${color === c 
                          ? "bg-indigo-600 text-white border-transparent scale-105 shadow-lg" 
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
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-650 hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
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
            <div className="w-full max-w-xl mx-auto bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-8">
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
                  <Users className="w-4 h-4 text-indigo-500" /> Players Joined ({game.players.length}/2)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {game.players.map((p, idx) => (
                    <div key={idx} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 p-4 rounded-2xl flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${p.color === "WHITE" ? "bg-white border border-zinc-400" : "bg-zinc-900"}`} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none">{p.username}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize mt-1">{p.color.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                  {game.players.length < 2 && (
                    <div className="bg-zinc-50/40 dark:bg-zinc-950/20 border border-dashed border-zinc-300 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-center text-zinc-400 text-sm">
                      Waiting for opponent...
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-4 rounded-xl text-xs flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={handleLeaveGame}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-750 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer transition-all border border-zinc-700"
                >
                  Leave Lobby
                </button>
                {isHost && (
                  <button
                    disabled={game.players.length < 2}
                    onClick={handleStartGame}
                    className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-650 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed hover:opacity-95 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
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
                
                {/* Top Player Details / Captured Pieces */}
                <div className="w-full max-w-[560px] flex items-center justify-between px-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full ${perspective === "WHITE" ? "bg-zinc-850 dark:bg-zinc-900 border border-zinc-700" : "bg-zinc-100"}`} />
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                      {game?.players.find(p => p.color === (perspective === "WHITE" ? "BLACK" : "WHITE"))?.username || "Opponent"}
                    </span>
                    {game?.status === "playing" && game.current_turn !== perspective && (
                      <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">Thinking...</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 h-6">
                    {(perspective === "WHITE" ? capturedPieces.WHITE : capturedPieces.BLACK).map((type, idx) => (
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
                              className="p-3 bg-zinc-800 hover:bg-indigo-600 rounded-xl text-3xl text-zinc-200 hover:text-white cursor-pointer active:scale-95 transition-all flex flex-col items-center gap-1"
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
                    <span className={`w-3.5 h-3.5 rounded-full ${perspective === "WHITE" ? "bg-zinc-100" : "bg-zinc-850 dark:bg-zinc-900 border border-zinc-700"}`} />
                    <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                      {game?.players.find(p => p.color === perspective)?.username || username}
                    </span>
                    {game?.status === "playing" && game.current_turn === perspective && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20 font-bold">Your Turn</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 h-6">
                    {(perspective === "WHITE" ? capturedPieces.BLACK : capturedPieces.WHITE).map((type, idx) => (
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
                      <Award className="w-5 h-5 text-indigo-500" /> Online Match
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
                      <span className="font-mono font-bold text-zinc-850 dark:text-zinc-200 select-all tracking-wider">{game?.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                      <span className="text-zinc-400">Status:</span>
                      <span className="capitalize font-bold text-indigo-500">{game?.status}</span>
                    </div>
                    {game?.winner && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 font-bold text-center justify-center animate-bounce">
                        <Award className="w-5 h-5" />
                        <span>Winner: {game.winner}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Move Log */}
                <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg backdrop-blur-md flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Move Log
                  </h2>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-mono text-zinc-550 dark:text-zinc-350">
                    {chatMessages.filter(m => m.type === "move" || m.type === "system").length === 0 ? (
                      <div className="text-zinc-500 text-center py-8">Game started. Good luck!</div>
                    ) : (
                      chatMessages.filter(m => m.type === "move" || m.type === "system").map((log, idx) => (
                        <div key={idx} className={`pb-1 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 ${log.type === "system" ? "text-amber-500 dark:text-amber-400 font-sans" : ""}`}>
                          {log.type === "system" ? log.message : `${log.color === "WHITE" ? "White" : "Black"}: ${log.message}`}
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
                            <span className={`w-2 h-2 rounded-full ${chat.color === "WHITE" ? "bg-zinc-200" : "bg-violet-500"}`} />
                            <span className="font-bold text-zinc-700 dark:text-zinc-350">{chat.username}</span>
                          </div>
                          <p className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-2xl rounded-tl-none border border-zinc-150 dark:border-zinc-850/50 text-zinc-800 dark:text-zinc-200 font-sans">
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
                    <button type="submit" className="p-2.5 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl cursor-pointer active:scale-95">
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
