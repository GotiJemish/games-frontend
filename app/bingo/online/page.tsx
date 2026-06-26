"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { 
  User, ArrowLeft, Play, LogOut, Sparkles, Sun, Moon, Award, Globe, Users, Copy, Send
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // waiting, playing, finished
  current_turn: string | null;
  winner: string | null;
  board_state: {
    boards: Record<string, number[]>; // "BLUE" | "RED" -> 25 numbers
    crossed: number[];
    difficulty: string;
    player_lines: Record<string, number>;
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "move";
  username?: string;
  color?: string;
  message: string;
}

export default function BingoOnline() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Room config / Join states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("BLUE"); // BLUE or RED
  const [roomCodeInput, setRoomCodeInput] = useState("");
  
  const [isLobbyCreator, setIsLobbyCreator] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Gameplay State
  const [gameId, setGameId] = useState("");
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

  // WebSocket Connection
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
    const uName = username.trim() || "Host";
    const myCol = color === "RED" ? "RED" : "BLUE";

    try {
      const createRes = await axios.post(`${httpUrl}games/create`, {
        username: uName,
        color: myCol,
        game_type: "bingo"
      });
      const lobby = createRes.data;
      setGameId(lobby.id);
      setOnlineGame(lobby);
      setIsLobbyCreator(true);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(lobby.id, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player";
    const code = roomCodeInput.trim().toUpperCase();

    if (!code) {
      setErrorMsg("Please enter a room code");
      return;
    }

    try {
      let joinCol = color === "RED" ? "RED" : "BLUE";
      let joinRes;
      try {
        joinRes = await axios.post(`${httpUrl}games/${code}/join`, {
          username: uName,
          color: joinCol
        });
      } catch (joinErr: any) {
        joinCol = joinCol === "BLUE" ? "RED" : "BLUE";
        joinRes = await axios.post(`${httpUrl}games/${code}/join`, {
          username: uName,
          color: joinCol
        });
      }

      const lobby = joinRes.data;
      setGameId(lobby.id);
      setOnlineGame(lobby);
      setIsLobbyCreator(false);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(lobby.id, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to join room. Verify code or username.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      await axios.post(`${httpUrl}games/${gameId}/start`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start game");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleNumberSelect = (num: number) => {
    if (!wsRef.current || !onlineGame) return;
    wsRef.current.send(JSON.stringify({
      action: "choose_number",
      number: num
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
    setIsLobbyCreator(false);
    setOnlineGame(null);
  };

  const copyRoomCode = () => {
    if (typeof navigator !== "undefined" && gameId) {
      navigator.clipboard.writeText(gameId);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Find players
  const myPlayer = onlineGame?.players.find(p => p.username === username);
  const opponentPlayer = onlineGame?.players.find(p => p.username !== username);

  const myBoard = myPlayer ? onlineGame?.board_state?.boards[myPlayer.color] || [] : [];
  const opponentBoard = opponentPlayer ? onlineGame?.board_state?.boards[opponentPlayer.color] || [] : [];
  const crossed = onlineGame?.board_state?.crossed || [];
  
  const myLines = myPlayer ? onlineGame?.board_state?.player_lines[myPlayer.color] || 0 : 0;
  const opponentLines = opponentPlayer ? onlineGame?.board_state?.player_lines[opponentPlayer.color] || 0 : 0;

  const getBingoLetters = (linesCount: number) => {
    const letters = ["B", "I", "N", "G", "O"];
    return (
      <div className="flex gap-1 justify-center my-2">
        {letters.map((l, i) => {
          const isActive = linesCount > i;
          return (
            <span
              key={i}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all border duration-300
                ${isActive 
                  ? "bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20 scale-110 animate-pulse" 
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
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      {/* Header Tools */}
      <div className="absolute top-6 left-6 z-20">
        {!isJoined ? (
          <Link href="/bingo" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Link>
        ) : (
          <button onClick={handleLeaveGame} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer active:scale-95 transition-all text-sm font-bold">
            <LogOut className="w-4 h-4" /> Leave Room
          </button>
        )}
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

      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {!isJoined ? (
          /* Lobby Configuration Form */
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            {/* Create Room Box */}
            <div className="space-y-4 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 pb-6 md:pb-0">
              <div className="text-center md:text-left space-y-1.5 mb-4">
                <span className="text-xs font-black uppercase text-blue-550 dark:text-blue-400 tracking-wider">Host Game</span>
                <h2 className="text-2xl font-black">Create a Room</h2>
              </div>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Host Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Choose Color</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setColor("BLUE")}
                      className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                        color === "BLUE" 
                          ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      Blue
                    </button>
                    <button
                      type="button"
                      onClick={() => setColor("RED")}
                      className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${
                        color === "RED" 
                          ? "bg-red-500/10 border-red-500 text-red-500 shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      Red
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-650 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                  <Play className="w-5 h-5" /> Host Match
                </button>
              </form>
            </div>

            {/* Join Room Box */}
            <div className="space-y-4 pl-0 md:pl-6">
              <div className="text-center md:text-left space-y-1.5 mb-4">
                <span className="text-xs font-black uppercase text-purple-550 dark:text-purple-400 tracking-wider">Join Friend</span>
                <h2 className="text-2xl font-black">Join a Room</h2>
              </div>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Guest Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-purple-550 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Room Code (4 Chars)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter Code (e.g. F2H1)"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-bold tracking-widest outline-none focus:border-purple-550 transition-all text-zinc-850 dark:text-zinc-100 uppercase placeholder:tracking-normal placeholder:font-semibold"
                  />
                </div>
                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-650 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                  <Globe className="w-5 h-5" /> Join Match
                </button>
              </form>
            </div>
          </div>
        ) : isJoined && onlineGame ? (
          /* Main Room Layout */
          <>
            <div className="flex-1 flex flex-col items-center gap-6">
              {onlineGame?.status === "waiting" ? (
                /* Waiting Lobby Screen */
                <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl space-y-6">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-black rounded-full uppercase tracking-wider animate-pulse">
                      Lobby Waiting
                    </span>
                    <h2 className="text-xl font-black">Room Lobby</h2>
                  </div>

                  <div className="p-4 bg-zinc-100 dark:bg-zinc-950/80 rounded-2xl border border-zinc-200 dark:border-zinc-855 flex flex-col items-center gap-2">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Share Room Code</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black tracking-widest text-blue-500">{gameId}</span>
                      <button onClick={copyRoomCode} className="p-2 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl active:scale-90 transition-all cursor-pointer">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copiedText && <span className="text-[10px] text-green-500 font-bold">Copied code to clipboard!</span>}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider text-left flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" /> Players ({onlineGame.players.length}/2)
                    </h4>
                    <div className="space-y-2">
                      {onlineGame.players.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-850/50 rounded-xl">
                          <span className="text-sm font-bold">{p.username}</span>
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                            p.color === "BLUE" 
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                              : "bg-red-500/10 border-red-500/20 text-red-500"
                          }`}>{p.color}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isLobbyCreator && (
                    <button
                      onClick={handleStartGame}
                      disabled={onlineGame.players.length < 2}
                      className="w-full bg-gradient-to-r from-blue-650 to-purple-650 hover:opacity-95 text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play className="w-5 h-5" /> Start Match
                    </button>
                  )}
                  {!isLobbyCreator && (
                    <p className="text-xs text-zinc-400 italic">Waiting for host to start the match...</p>
                  )}
                </div>
              ) : (
                /* Active Game Screen */
                <div className="w-full flex flex-col xl:flex-row gap-6 items-stretch justify-center">
                  {/* Left: Player Board */}
                  <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between items-center text-center">
                    <div>
                      <h3 className={`text-lg font-black truncate max-w-48 ${myPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}`}>
                        {myPlayer?.username} (You)
                      </h3>
                      {getBingoLetters(myLines)}
                    </div>

                    {/* Grid 5x5 */}
                    <div className="w-full max-w-xs aspect-square grid grid-cols-5 gap-1.5 my-4">
                      {myBoard.map((num, idx) => {
                        const isCrossed = crossed.includes(num);
                        const isMyTurn = onlineGame.status === "playing" && onlineGame.current_turn === myPlayer?.color;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleNumberSelect(num)}
                            disabled={isCrossed || onlineGame.status === "finished" || !isMyTurn}
                            className={`w-full aspect-square rounded-xl border flex items-center justify-center text-sm font-black transition-all duration-200 cursor-pointer active:scale-90
                              ${isCrossed 
                                ? myPlayer?.color === "BLUE" 
                                  ? "bg-blue-500/10 border-blue-500/40 text-blue-500 line-through decoration-blue-500 decoration-2" 
                                  : "bg-red-500/10 border-red-500/40 text-red-500 line-through decoration-red-500 decoration-2"
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
                      Completed: <strong className={myPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}>{myLines}</strong> / 5
                    </div>
                  </div>

                  {/* Middle Control status */}
                  <div className="xl:w-60 flex flex-col justify-between items-center py-2 gap-4">
                    <div className="text-center space-y-3">
                      {onlineGame.status === "finished" ? (
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-855 text-sm font-black shadow-md animate-bounce">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>
                            {onlineGame.winner === "DRAW" ? "It's a Draw!" : `${onlineGame.winner === myPlayer?.color ? "You Won!" : "You Lost!"}`}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-xl shadow-sm">
                          {onlineGame.current_turn === myPlayer?.color ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-550"></span>
                              </span>
                              <span>Your Turn! Choose number.</span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-550"></span>
                              </span>
                              <span>Opponent's Turn...</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Room code display */}
                    <div className="text-center px-4 py-2 bg-zinc-100 dark:bg-zinc-950/80 rounded-xl border border-zinc-200 dark:border-zinc-850 text-xs font-semibold">
                      Room Code: <strong className="text-blue-500 font-extrabold">{gameId}</strong>
                    </div>
                  </div>

                  {/* Right: Opponent Hidden Board Grid (Hides numbers, shows cross progress) */}
                  <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between items-center text-center">
                    <div>
                      <h3 className={`text-lg font-black truncate max-w-48 ${opponentPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}`}>
                        {opponentPlayer?.username || "Opponent"}
                      </h3>
                      {getBingoLetters(opponentLines)}
                    </div>

                    {/* Grid 5x5 containing ? marks */}
                    <div className="w-full max-w-xs aspect-square grid grid-cols-5 gap-1.5 my-4">
                      {opponentBoard.map((num, idx) => {
                        const isCrossed = crossed.includes(num);
                        return (
                          <div
                            key={idx}
                            className={`w-full aspect-square rounded-xl border flex items-center justify-center text-xs font-bold select-none
                              ${isCrossed 
                                ? opponentPlayer?.color === "BLUE"
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-500/60 font-black animate-pulse"
                                  : "bg-red-500/10 border-red-500/30 text-red-500/60 font-black animate-pulse"
                                : "bg-zinc-150/40 dark:bg-zinc-950/20 border-zinc-200/40 dark:border-zinc-850/20 text-zinc-350 dark:text-zinc-700"
                              }
                            `}
                          >
                            {isCrossed ? "✓" : "?"}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-xs text-zinc-400 dark:text-zinc-500">
                      Completed: <strong className={opponentPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}>{opponentLines}</strong> / 5
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Chat Room / Game Logs */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" /> Room Feed
              </h3>
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 text-xs font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-zinc-400 italic">Welcome to the lobby feed.</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-2.5 rounded-xl border break-words
                        ${msg.type === "move" 
                          ? "bg-blue-500/5 text-blue-755 dark:text-blue-300 border-blue-500/10" 
                          : msg.type === "system" 
                            ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400"
                            : "bg-purple-500/5 text-purple-755 dark:text-purple-300 border-purple-500/10"
                        }
                      `}
                    >
                      {msg.type === "chat" && <strong>{msg.username}: </strong>}
                      {msg.message}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Send a chat message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 transition-all text-zinc-855 dark:text-zinc-100"
                />
                <button type="submit" className="p-2 bg-blue-500 hover:bg-blue-650 text-white rounded-xl active:scale-95 transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
