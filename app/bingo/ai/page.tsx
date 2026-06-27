"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { useTheme } from "@/lib/use-theme";
import { 
  User, ArrowLeft, Play, LogOut, Sparkles, Award, Shield, MessageSquare, Send
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

export default function BingoAI() {
  const { theme, setNavbarConfig } = useTheme();
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Form input states
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("BLUE"); // BLUE or RED
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (isJoined) {
      setNavbarConfig({
        backLabel: "Leave Game",
        onBackClick: handleLeaveGame,
        backHref: null,
      });
    } else {
      setNavbarConfig({
        backHref: "/bingo",
        backLabel: "Back to Bingo Lobby",
        onBackClick: null,
      });
    }
  }, [isJoined, setNavbarConfig]);

  // Match states
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
    const myCol = color === "RED" ? "RED" : "BLUE";
    const botCol = myCol === "BLUE" ? "RED" : "BLUE";
    
    try {
      const createRes = await api.post(`games/create`, {
        username: uName,
        color: myCol,
        game_type: "bingo",
        difficulty: difficulty
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      await api.post(`games/${gId}/add_bot`, {
        username: `Computer (Bot) ${botCol}`,
        color: botCol
      });
      
      const startRes = await api.post(`games/${gId}/start`);
      
      setOnlineGame(startRes.data);
      setGameId(gId);
      setIsJoined(true);
      setChatMessages([]);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start bot match");
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
    setOnlineGame(null);
  };

  // Player info
  const myPlayer = onlineGame?.players.find(p => !p.username.startsWith("Computer (Bot)"));
  const botPlayer = onlineGame?.players.find(p => p.username.startsWith("Computer (Bot)"));

  const myBoard = myPlayer ? onlineGame?.board_state.boards[myPlayer.color] || [] : [];
  const botBoard = botPlayer ? onlineGame?.board_state.boards[botPlayer.color] || [] : [];
  const crossed = onlineGame?.board_state.crossed || [];
  
  const myLines = myPlayer ? onlineGame?.board_state.player_lines[myPlayer.color] || 0 : 0;
  const botLines = botPlayer ? onlineGame?.board_state.player_lines[botPlayer.color] || 0 : 0;

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
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-blue-900/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-purple-900/10 dark:bg-purple-900/20 blur-[120px] pointer-events-none" />

      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {!isJoined ? (
          /* Lobby Configuration Form */
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Play vs. Computer</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Configure your Bingo color and difficulty level.</p>
            </div>
            <form onSubmit={handlePlayVsComputer} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-blue-500" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 transition-all text-zinc-850 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Your Color</label>
                <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                        difficulty === diff 
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 border-blue-550 text-white shadow-md" 
                          : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-blue-650 to-purple-650 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Play Game
              </button>
            </form>
          </div>
        ) : isJoined && onlineGame ? (
          /* Main Gameplay Panel */
          <div className="w-full flex flex-col xl:flex-row gap-8 items-stretch justify-center">
            {/* Left: Player Board */}
            <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between items-center text-center">
              <div>
                <h3 className={`text-xl font-extrabold truncate max-w-64 ${myPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}`}>
                  {myPlayer?.username} (You)
                </h3>
                {getBingoLetters(myLines)}
              </div>

              {/* Grid 5x5 */}
              <div className="w-full max-w-sm aspect-square grid grid-cols-5 gap-2 my-6">
                {myBoard.map((num, idx) => {
                  const isCrossed = crossed.includes(num);
                  const isMyTurn = onlineGame.status === "playing" && onlineGame.current_turn === myPlayer?.color;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNumberSelect(num)}
                      disabled={isCrossed || onlineGame.status === "finished" || !isMyTurn}
                      className={`w-full aspect-square rounded-xl border flex items-center justify-center text-base font-extrabold transition-all duration-200 cursor-pointer active:scale-90
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
                Completed Lines: <strong className={myPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}>{myLines}</strong> / 5
              </div>
            </div>

            {/* Middle Column: Status and Logs */}
            <div className="w-full xl:w-72 flex flex-col gap-6 justify-between items-center py-2">
              <div className="w-full text-center space-y-4">
                {onlineGame.status === "finished" ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-855 text-base font-black shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500 animate-spin" />
                    <span>
                      {onlineGame.winner === "DRAW" ? "It's a Draw!" : `${onlineGame.winner === myPlayer?.color ? "You Won!" : "Computer Wins!"}`}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center justify-center gap-2 px-5 py-3 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    {onlineGame.current_turn === botPlayer?.color ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-555"></span>
                        </span>
                        <span>Bot is thinking...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-550"></span>
                        </span>
                        <span>Your Turn! Choose number.</span>
                      </>
                    )}
                  </div>
                )}
                
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Difficulty: {difficulty}</p>
              </div>

              {/* Feed logs */}
              <div className="w-full h-56 bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <h4 className="text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-500 tracking-wider border-b border-zinc-150 dark:border-zinc-800 pb-2">Match Feed</h4>
                <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 text-[10px] font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                  {chatMessages.length === 0 ? (
                    <p className="text-zinc-400 italic">Game has started.</p>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={`p-1.5 rounded-lg border break-words
                          ${msg.type === "move" 
                            ? "bg-blue-500/5 text-blue-750 dark:text-blue-300 border-blue-500/10" 
                            : "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-855 text-zinc-500 dark:text-zinc-400"
                          }
                        `}
                      >
                        {msg.message}
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </div>
            </div>

            {/* Right: Computer Board */}
            <div className="flex-1 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between items-center text-center">
              <div>
                <h3 className={`text-xl font-extrabold truncate max-w-64 ${botPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}`}>
                  {botPlayer?.username} (AI)
                </h3>
                {getBingoLetters(botLines)}
              </div>

              {/* Grid 5x5 */}
              <div className="w-full max-w-sm aspect-square grid grid-cols-5 gap-2 my-6">
                {botBoard.map((num, idx) => {
                  const isCrossed = crossed.includes(num);
                  return (
                    <div
                      key={idx}
                      className={`w-full aspect-square rounded-xl border flex items-center justify-center text-xs font-semibold select-none
                        ${isCrossed 
                          ? botPlayer?.color === "BLUE" 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500/70 line-through decoration-blue-500/40" 
                            : "bg-red-500/10 border-red-500/20 text-red-500/70 line-through decoration-red-500/40"
                          : "bg-zinc-100/30 dark:bg-zinc-950/20 border-zinc-200/40 dark:border-zinc-850/30 text-zinc-400 dark:text-zinc-650"
                        }
                      `}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                Completed Lines: <strong className={botPlayer?.color === "BLUE" ? "text-blue-500" : "text-red-500"}>{botLines}</strong> / 5
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
