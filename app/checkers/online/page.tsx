"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import { useTheme } from "@/lib/use-theme";
import { User, Play, Award, Globe, Users, Copy, Send } from "lucide-react";

interface GamePlayer { username: string; color: string; }
interface GameState {
  id: string;
  status: string;
  current_turn: string | null;
  winner: string | null;
  board_state: { board: (string | null)[]; difficulty: string; chain_from?: number | null; };
  players: GamePlayer[];
}
interface ChatMessage { type: "system" | "chat" | "move"; username?: string; color?: string; message: string; }

export default function CheckersOnline() {
  const { setNavbarConfig } = useTheme();
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("RED");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLobbyCreator, setIsLobbyCreator] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [gameId, setGameId] = useState("");
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    if (isJoined) {
      setNavbarConfig({ backLabel: "Leave Room", onBackClick: handleLeaveGame, backHref: null });
    } else {
      setNavbarConfig({ backHref: "/checkers", backLabel: "Back to Checkers Lobby", onBackClick: null });
    }
  }, [isJoined, setNavbarConfig]);

  const connectWebSocket = (gId: string, uName: string) => {
    if (wsRef.current) wsRef.current.close();
    const wsProto = httpUrl.startsWith("https") ? "wss:" : "ws:";
    const cleanHost = httpUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const wsUrl = `${wsProto}//${cleanHost}/checkers/${gId}/ws?username=${encodeURIComponent(uName)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "state") { setOnlineGame(data.game); }
      else if (data.type === "move") {
        setOnlineGame(data.game);
        setChatMessages(prev => [...prev, { type: "move", username: data.username, color: data.color, message: data.message }]);
      } else if (data.type === "chat") {
        setChatMessages(prev => [...prev, { type: "chat", username: data.username, color: data.color, message: data.message }]);
      } else if (data.type === "system") {
        setChatMessages(prev => [...prev, { type: "system", message: data.message }]);
      } else if (data.type === "error") {
        setErrorMsg(data.message);
        setTimeout(() => setErrorMsg(""), 4000);
      }
    };
    ws.onclose = () => { setIsJoined(false); setOnlineGame(null); };
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player";
    try {
      const res = await api.post("checkers/createLobby", { username: uName, color: color, difficulty: "medium" });
      const gId = res.data.id;
      setGameId(gId);
      setIsLobbyCreator(true);
      setIsJoined(true);
      setChatMessages([]);
      setOnlineGame(res.data);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Guest";
    const rCode = roomCodeInput.trim();
    if (!rCode) { setErrorMsg("Room code is required."); setTimeout(() => setErrorMsg(""), 4000); return; }
    try {
      const res = await api.post(`checkers/${rCode}/joinLobby`, { username: uName, color: color });
      setGameId(rCode);
      setIsLobbyCreator(false);
      setIsJoined(true);
      setChatMessages([]);
      setOnlineGame(res.data);
      connectWebSocket(rCode, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to join room");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleStartGame = async () => {
    try {
      await api.post(`checkers/${gameId}/start`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start game");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Valid moves computation
  const getValidMovesLocal = (board: (string | null)[], col: string): [number, number][] => {
    const own = col === "RED" ? ["RED", "RED_KING"] : ["BLACK", "BLACK_KING"];
    const opp = col === "RED" ? ["BLACK", "BLACK_KING"] : ["RED", "RED_KING"];
    const moves: [number, number][] = [];
    const captures: [number, number][] = [];
    for (let pos = 0; pos < 64; pos++) {
      const pc = board[pos];
      if (!pc || !own.includes(pc)) continue;
      const r = Math.floor(pos / 8), c = pos % 8;
      const isK = pc.endsWith("_KING");
      const dirs: [number, number][] = isK ? [[-1,-1],[-1,1],[1,-1],[1,1]] : col === "RED" ? [[1,-1],[1,1]] : [[-1,-1],[-1,1]];
      for (const [dr, dc] of dirs) {
        const nr = r+dr, nc = c+dc;
        if (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr*8+nc]===null) moves.push([pos, nr*8+nc]);
        const jr = r+2*dr, jc = c+2*dc, mr = r+dr, mc = c+dc;
        if (jr>=0&&jr<8&&jc>=0&&jc<8&&mr>=0&&mr<8&&mc>=0&&mc<8)
          if (opp.includes(board[mr*8+mc]) && board[jr*8+jc]===null) captures.push([pos, jr*8+jc]);
      }
    }
    return captures.length > 0 ? captures : moves;
  };

  const myColor = onlineGame?.players.find(p => p.username === (username.trim() || (isLobbyCreator ? "Player" : "Guest")))?.color;
  const isMyTurn = onlineGame?.status === "playing" && onlineGame?.current_turn === myColor;
  const board = onlineGame?.board_state?.board || [];
  const chainFrom = onlineGame?.board_state?.chain_from ?? null;

  const validMoves = isMyTurn && myColor ? getValidMovesLocal(board, myColor) : [];
  const selectedMoves = selectedPos !== null ? validMoves.filter(([f]) => f === selectedPos).map(([, t]) => t) : [];

  const handleCellClick = (pos: number) => {
    if (!wsRef.current || !onlineGame || !isMyTurn) return;

    if (chainFrom !== null) {
      if (pos === chainFrom) { setSelectedPos(pos); return; }
      if (selectedPos === chainFrom && selectedMoves.includes(pos)) {
        wsRef.current.send(JSON.stringify({ action: "move_piece", from_pos: chainFrom, to_pos: pos }));
        setSelectedPos(null);
        return;
      }
      return;
    }

    const ownPieces = myColor === "RED" ? ["RED", "RED_KING"] : ["BLACK", "BLACK_KING"];
    if (ownPieces.includes(board[pos] as string)) {
      const pieceMoves = validMoves.filter(([f]) => f === pos);
      if (pieceMoves.length > 0) setSelectedPos(pos);
      return;
    }
    if (selectedPos !== null && selectedMoves.includes(pos)) {
      wsRef.current.send(JSON.stringify({ action: "move_piece", from_pos: selectedPos, to_pos: pos }));
      setSelectedPos(null);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsRef.current || !chatInput.trim()) return;
    wsRef.current.send(JSON.stringify({ action: "chat", message: chatInput.trim() }));
    setChatInput("");
  };

  const handleLeaveGame = () => {
    if (wsRef.current) wsRef.current.close();
    setIsJoined(false);
    setOnlineGame(null);
    setSelectedPos(null);
  };

  const getPieceColor = (piece: string | null) => {
    if (piece === "RED" || piece === "RED_KING") return "red";
    if (piece === "BLACK" || piece === "BLACK_KING") return "black";
    return null;
  };

  const isPlaying = onlineGame?.status === "playing" || onlineGame?.status === "finished";

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-rose-900/10 dark:bg-rose-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-pink-900/10 dark:bg-pink-900/20 blur-[120px] pointer-events-none" />

      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center mt-12">
        {!isJoined ? (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-black">Online Multiplayer</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Create a room or join an existing one.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-rose-500" />
                  <input type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-zinc-850 dark:text-zinc-100" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Your Color</label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setColor("RED")}
                    className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${color === "RED" ? "bg-red-500/10 border-red-500 text-red-500 shadow-md" : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800"}`}>
                    Red
                  </button>
                  <button type="button" onClick={() => setColor("BLACK")}
                    className={`py-3 rounded-2xl border text-sm font-bold active:scale-95 transition-all cursor-pointer ${color === "BLACK" ? "bg-zinc-700/10 border-zinc-600 text-zinc-700 dark:text-zinc-300 shadow-md" : "bg-zinc-100 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800"}`}>
                    Black
                  </button>
                </div>
              </div>

              <button onClick={handleCreateRoom} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Globe className="w-5 h-5" /> Create Room
              </button>

              <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600 font-bold uppercase">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span>OR JOIN</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-450 dark:text-zinc-500 mb-2">Room Code</label>
                <input type="text" placeholder="Enter room code" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-zinc-850 dark:text-zinc-100" />
              </div>
              <button onClick={handleJoinRoom} className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 hover:border-rose-500 hover:text-rose-500">
                <Users className="w-5 h-5" /> Join Room
              </button>
            </div>
          </div>
        ) : !isPlaying ? (
          /* Waiting Room */
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
            <h2 className="text-2xl font-black">Waiting for Opponent</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="px-5 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-2xl font-mono text-lg font-extrabold tracking-widest text-rose-500">
                {gameId}
              </div>
              <button onClick={handleCopyCode} className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl active:scale-95 transition-all cursor-pointer">
                <Copy className="w-5 h-5" />
              </button>
            </div>
            {copiedText && <p className="text-xs text-green-500 font-bold">Copied to clipboard!</p>}
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Share this room code with your friend to join the game.</p>

            <div className="space-y-2 text-left">
              <p className="text-xs font-black uppercase text-zinc-450 dark:text-zinc-500">Players in Lobby</p>
              {onlineGame?.players.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className={`w-3 h-3 rounded-full ${p.color === "RED" ? "bg-red-500" : "bg-zinc-800 dark:bg-zinc-200"}`} />
                  <span className="text-sm font-bold">{p.username}</span>
                  <span className="ml-auto text-xs font-bold text-zinc-400">{p.color}</span>
                </div>
              ))}
            </div>

            {isLobbyCreator && (onlineGame?.players?.length || 0) >= 2 && (
              <button onClick={handleStartGame} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95">
                <Play className="w-5 h-5" /> Start Game
              </button>
            )}
          </div>
        ) : (
          /* Game Board */
          <>
            <div className="flex-1 flex flex-col items-center gap-6">
              {/* Players */}
              <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center shadow-lg flex justify-between items-center px-6">
                {onlineGame?.players.map((p, i) => (
                  <div key={i} className={i === 0 ? "text-left" : "text-right"}>
                    <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold truncate max-w-32">{p.username}</p>
                    <p className={`text-sm font-extrabold mt-0.5 ${p.color === "RED" ? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}`}>{p.color}</p>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="text-center">
                {onlineGame?.status === "finished" ? (
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-lg font-bold shadow-md animate-bounce">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>{onlineGame.winner === myColor ? "You Won!" : "Opponent Won!"}</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-250 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMyTurn ? "bg-green-400" : "bg-amber-400"} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isMyTurn ? "bg-green-500" : "bg-amber-500"}`}></span>
                    </span>
                    <span>{isMyTurn ? "Your Turn!" : "Waiting for opponent..."}</span>
                    {chainFrom !== null && isMyTurn && <span className="ml-2 text-amber-500 text-xs font-bold animate-pulse">Chain Jump!</span>}
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
                    const isKing = piece?.toString().endsWith("_KING");

                    return (
                      <button key={idx} onClick={() => handleCellClick(idx)}
                        className={`relative flex items-center justify-center transition-all duration-150
                          ${isDark ? "bg-amber-800/80 dark:bg-amber-900/90" : "bg-amber-200 dark:bg-amber-100/90"}
                          ${isSelected ? "ring-3 ring-yellow-400 z-10" : ""}
                          ${isTarget ? "ring-2 ring-green-400/70" : ""}
                          ${isMyTurn && onlineGame?.status !== "finished" ? "cursor-pointer hover:brightness-110" : "cursor-default"}
                        `}
                        style={{ aspectRatio: "1/1" }}
                        disabled={onlineGame?.status === "finished"}
                      >
                        {isTarget && !piece && <div className="absolute w-4 h-4 rounded-full bg-green-400/50 animate-pulse" />}
                        {piece && (
                          <div className={`w-[75%] h-[75%] rounded-full border-2 shadow-lg flex items-center justify-center transition-transform
                            ${pieceColor === "red" ? "bg-gradient-to-br from-red-500 to-red-700 border-red-400 shadow-red-900/50" : "bg-gradient-to-br from-zinc-700 to-zinc-900 border-zinc-500 shadow-zinc-900/50"}
                            ${isSelected ? "scale-110 shadow-xl" : "hover:scale-105"}
                          `}>
                            {isKing && <span className="text-amber-300 text-lg font-bold drop-shadow-lg select-none">♔</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <div className="w-full lg:w-80 h-96 flex flex-col bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-zinc-450 dark:text-zinc-500 border-b border-zinc-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-rose-500" /> Game Feed
              </h3>
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 text-xs font-semibold scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-zinc-400 italic">Waiting for players...</p>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`p-2.5 rounded-xl border break-words
                      ${msg.type === "move" ? "bg-rose-500/5 text-rose-700 dark:text-rose-300 border-rose-500/10" : msg.type === "system" ? "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400" : "bg-pink-500/5 text-pink-700 dark:text-pink-300 border-pink-500/10"}`}>
                      {msg.type === "chat" && <strong>{msg.username}: </strong>}
                      {msg.message}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>
              <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                <input type="text" placeholder="Send a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 transition-all text-zinc-850 dark:text-zinc-100" />
                <button type="submit" className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl active:scale-95 transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
