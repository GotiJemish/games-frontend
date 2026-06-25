"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { 
  User, Copy, Plus, Play, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Monitor, Globe,
  Sun, Moon, Check, Award
} from "lucide-react";

interface GamePlayer {
  username: string;
  color: string;
}

interface GameState {
  id: string;
  status: string; // waiting, playing, finished
  current_turn: string | null;
  last_roll: number | null;
  has_rolled: boolean;
  winner: string | null;
  board_state: {
    size: number;
    stones: Record<string, string>; // "r_c" -> "BLACK" or "WHITE"
    captured: Record<string, number>;
    consecutive_passes: number;
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "roll" | "move";
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

export default function GoPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [entryTab, setEntryTab] = useState<"online" | "local">("online");
  const [isLocalMode, setIsLocalMode] = useState(false);

  // General state
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("BLACK");
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [lobbyBoardSize, setLobbyBoardSize] = useState<9 | 13 | 19>(9);

  // Match states
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Local Game State
  const [localPlayerNames, setLocalPlayerNames] = useState<Record<string, string>>({
    BLACK: "Player 1",
    WHITE: "Player 2"
  });
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [localLogs, setLocalLogs] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API URLs
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll chats
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, localLogs]);

  // Handle load theme and URL joins
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get("join");
      if (joinId) {
        setGameId(joinId.toUpperCase());
        setEntryTab("online");
      }

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

  // REST handlers
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      const res = await axios.post(`${httpUrl}games/create`, {
        username: username.trim(),
        color,
        game_type: "go",
        board_size: lobbyBoardSize
      });
      const data = res.data;
      setOnlineGame(data);
      setGameId(data.id);
      setIsJoined(true);
      setIsLocalMode(false);
      connectWebSocket(data.id, username.trim());
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create lobby");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !gameId.trim()) return;

    try {
      const res = await axios.post(`${httpUrl}games/${gameId.trim()}/join`, {
        username: username.trim(),
        color
      });
      const data = res.data;
      setOnlineGame(data);
      setIsJoined(true);
      setIsLocalMode(false);
      connectWebSocket(data.id, username.trim());
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to join lobby");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleStartGame = async () => {
    if (!onlineGame) return;
    try {
      const res = await axios.post(`${httpUrl}games/${onlineGame.id}/start`);
      setOnlineGame(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start game");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleAddBot = async () => {
    if (!onlineGame) return;
    const takenColors = onlineGame.players.map(p => p.color);
    const availableColors = ["BLACK", "WHITE"].filter(c => !takenColors.includes(c));
    if (availableColors.length === 0) return;
    const botCol = availableColors[0];
    
    try {
      const res = await axios.post(`${httpUrl}games/${onlineGame.id}/add_bot`, {
        username: `Computer (Bot) ${botCol}`,
        color: botCol
      });
      setOnlineGame(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to add bot");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handlePlayVsComputer = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player";
    const myCol = color === "WHITE" ? "WHITE" : "BLACK";
    const botCol = myCol === "BLACK" ? "WHITE" : "BLACK";
    
    try {
      const createRes = await axios.post(`${httpUrl}games/create`, {
        username: uName,
        color: myCol,
        game_type: "go",
        board_size: lobbyBoardSize
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      await axios.post(`${httpUrl}games/${gId}/add_bot`, {
        username: `Computer (Bot) ${botCol}`,
        color: botCol
      });
      
      const startRes = await axios.post(`${httpUrl}games/${gId}/start`);
      
      setOnlineGame(startRes.data);
      setGameId(gId);
      setIsJoined(true);
      setIsLocalMode(false);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start bot match");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Start Local Game
  const handleStartLocalGame = (e: React.FormEvent) => {
    e.preventDefault();

    const initialBoard = {
      size: lobbyBoardSize,
      stones: {},
      captured: { BLACK: 0, WHITE: 0 },
      consecutive_passes: 0,
      previous_stones: null
    };

    const playersList = [
      { username: localPlayerNames.BLACK || "Black", color: "BLACK" },
      { username: localPlayerNames.WHITE || "White", color: "WHITE" }
    ];

    setLocalGame({
      id: "LOCAL",
      status: "playing",
      current_turn: "BLACK",
      last_roll: null,
      has_rolled: false,
      winner: null,
      board_state: initialBoard,
      players: playersList
    });
    setLocalLogs([{ type: "system", message: "Local Go Match Started! Black plays first." }]);
    setIsLocalMode(true);
    setIsJoined(true);
  };

  // Place stone (Online/Local)
  const handlePlaceStone = (row: number, col: number) => {
    if (isLocalMode) {
      handleLocalPlaceStone(row, col);
    } else {
      if (!wsRef.current || !onlineGame) return;
      wsRef.current.send(JSON.stringify({
        action: "place_stone",
        row,
        col
      }));
    }
  };

  // Pass Turn
  const handlePass = () => {
    if (isLocalMode) {
      handleLocalPass();
    } else {
      if (!wsRef.current || !onlineGame) return;
      wsRef.current.send(JSON.stringify({
        action: "place_stone",
        pass_turn: true
      }));
    }
  };

  // Local placement solver
  const handleLocalPlaceStone = (row: number, col: number) => {
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

  // Local Pass Solver
  const handleLocalPass = () => {
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
      // Both players passed - calculate scores and end match
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
    setIsLocalMode(false);
    setOnlineGame(null);
    setLocalGame(null);
    setChatMessages([]);
    setLocalLogs([]);
  };

  // Bind active game state
  const game = isLocalMode ? localGame : onlineGame;

  const myPlayer = isLocalMode 
    ? game?.players?.find(p => p.color === game?.current_turn) 
    : game?.players?.find(p => p.username === username);
  
  const myColor = myPlayer?.color;
  
  const isMyTurn = isLocalMode
    ? game?.status === "playing"
    : game?.status === "playing" && game?.current_turn === myColor;

  const inviteUrl = useMemo(() => {
    if (typeof window !== "undefined" && game && !isLocalMode) {
      return `${window.location.origin}/go?join=${game.id}`;
    }
    return "";
  }, [game, isLocalMode]);

  // Board dimensions for SVG rendering
  const boardSize = game?.board_state?.size || 9;
  const boardSizeMargin = 5;
  const gridRange = 100 - (boardSizeMargin * 2);
  const cellDistance = gridRange / (boardSize - 1);

  // Star Points (Hoshi) coordinates mapping
  const starPoints = useMemo(() => {
    const points: [number, number][] = [];
    if (boardSize === 9) {
      const idxs = [2, 4, 6];
      for (const r of idxs) {
        for (const c of idxs) {
          points.push([r, c]);
        }
      }
    } else if (boardSize === 13) {
      const idxs = [3, 6, 9];
      for (const r of idxs) {
        for (const c of idxs) {
          points.push([r, c]);
        }
      }
    } else if (boardSize === 19) {
      const idxs = [3, 9, 15];
      for (const r of idxs) {
        for (const c of idxs) {
          points.push([r, c]);
        }
      }
    }
    return points;
  }, [boardSize]);

  // --------------------------------------------------
  // UI Render Components
  // --------------------------------------------------

  if (!isJoined) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 transition-colors duration-300 relative">
        <div className="absolute inset-0 bg-radial-gradient from-slate-900/10 dark:from-slate-900/20 via-zinc-50/80 dark:via-zinc-950/60 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
        
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

        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 text-white shadow-xl shadow-slate-800/35 mb-4 animate-bounce">
              <span className="font-extrabold text-3xl tracking-tighter">G</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-800 dark:from-slate-300 via-slate-650 dark:via-zinc-400 to-slate-800 dark:to-slate-300 bg-clip-text text-transparent">
              Go (Weiqi)
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Multiplayer Online or Offline Pass & Play</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 bg-zinc-100 dark:bg-zinc-950 mb-6 transition-colors duration-300">
            <button
              onClick={() => setEntryTab("online")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all
                ${entryTab === "online" 
                  ? "bg-slate-800 text-white shadow-md" 
                  : "text-zinc-500 dark:text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-350"
                }
              `}
            >
              <Globe className="w-4 h-4" /> Online Match
            </button>
            <button
              onClick={() => setEntryTab("local")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all
                ${entryTab === "local" 
                  ? "bg-slate-800 text-white shadow-md" 
                  : "text-zinc-500 dark:text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-350"
                }
              `}
            >
              <Monitor className="w-4 h-4" /> Single Device
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-500/15 dark:bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Configuration for Board Sizes */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Board Size</label>
            <div className="grid grid-cols-3 gap-2">
              {[9, 13, 19].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setLobbyBoardSize(s as 9 | 13 | 19)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer
                    ${lobbyBoardSize === s 
                      ? "bg-slate-800 text-white border-transparent shadow-md" 
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-450 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }
                  `}
                >
                  {s}x{s}
                </button>
              ))}
            </div>
          </div>

          {entryTab === "online" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-805 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Color Choice</label>
                <div className="grid grid-cols-2 gap-3">
                  {["BLACK", "WHITE"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-widest transition-all cursor-pointer
                        ${color === c 
                          ? "bg-slate-800 text-white border-transparent scale-105 shadow-lg" 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-450 hover:border-zinc-350"
                        }
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-850 pt-6">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <form onSubmit={handleCreateGame} className="w-full">
                    <button
                      type="submit"
                      disabled={!username.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Create Lobby
                    </button>
                  </form>
                  <form onSubmit={handlePlayVsComputer} className="w-full">
                    <button
                      type="submit"
                      disabled={!username.trim()}
                      className="w-full bg-indigo-650 hover:bg-indigo-600 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Monitor className="w-4 h-4" /> VS Computer
                    </button>
                  </form>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
                  <span className="flex-shrink mx-4 text-zinc-400 dark:text-zinc-550 text-xs font-semibold uppercase tracking-widest">or join lobby</span>
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
                </div>

                <form onSubmit={handleJoinGame} className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Lobby ID (e.g. game1234)"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800/50 text-center uppercase tracking-widest text-zinc-900 dark:text-zinc-100 font-mono transition-colors duration-300"
                  />
                  <button
                    type="submit"
                    disabled={!username.trim() || !gameId.trim()}
                    className="w-full bg-zinc-850 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-200 border border-zinc-750 dark:border-zinc-700 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 text-slate-400" /> Join Room
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Offline Pass & Play Setup
            <form onSubmit={handleStartLocalGame} className="space-y-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Player Names</label>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">Black Player</span>
                    <input
                      type="text"
                      value={localPlayerNames.BLACK}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, BLACK: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-slate-800/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">White Player</span>
                    <input
                      type="text"
                      value={localPlayerNames.WHITE}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, WHITE: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-slate-800/50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3.5 font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-white" /> Start Pass & Play Game
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // Active game window
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col p-4 md:p-6 gap-6 relative transition-colors duration-300">
      <div className="absolute inset-0 bg-radial-gradient from-slate-900/10 via-zinc-50/50 dark:via-zinc-950/40 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
      
      {/* Header bar */}
      <header className="w-full flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-extrabold shadow-md">
            G
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white">Go Room</h2>
            <p className="text-[10px] text-zinc-500">{isLocalMode ? "Pass & Play" : "Real-time Lobby"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-white cursor-pointer active:scale-90 transition-all"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={handleLeaveGame}
            className="px-3.5 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch justify-center z-10 w-full">
        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[620px] aspect-square bg-[#dfaf70] dark:bg-[#c99553] border-8 border-amber-950/60 rounded-3xl p-4 md:p-6 shadow-2xl relative transition-all">
            
            {/* The SVG Go Board */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full select-none"
            >
              {/* Draw Grid Lines */}
              {Array.from({ length: boardSize }).map((_, i) => {
                const coord = boardSizeMargin + i * cellDistance;
                return (
                  <React.Fragment key={i}>
                    {/* Horizontal Line */}
                    <line 
                      x1={boardSizeMargin} y1={coord} 
                      x2={100 - boardSizeMargin} y2={coord} 
                      stroke="#452a0a" 
                      strokeWidth="0.3" 
                    />
                    {/* Vertical Line */}
                    <line 
                      x1={coord} y1={boardSizeMargin} 
                      x2={coord} y2={100 - boardSizeMargin} 
                      stroke="#452a0a" 
                      strokeWidth="0.3" 
                    />
                  </React.Fragment>
                );
              })}

              {/* Draw Star Points (Hoshi) */}
              {starPoints.map(([sr, sc], idx) => {
                const cx = boardSizeMargin + sc * cellDistance;
                const cy = boardSizeMargin + sr * cellDistance;
                return (
                  <circle 
                    key={idx}
                    cx={cx} 
                    cy={cy} 
                    r="0.8" 
                    fill="#3b2005" 
                  />
                );
              })}

              {/* Hover and Stone Interactions */}
              {Array.from({ length: boardSize }).map((_, r) => 
                Array.from({ length: boardSize }).map((__, c) => {
                  const cx = boardSizeMargin + c * cellDistance;
                  const cy = boardSizeMargin + r * cellDistance;
                  const key = `${r}_${c}`;
                  const stoneColor = game?.board_state?.stones?.[key];

                  // Collision radius for hover interaction click
                  const hitRadius = cellDistance / 2;

                  if (stoneColor) {
                    // Render Stone
                    const isBlack = stoneColor === "BLACK";
                    return (
                      <g key={key}>
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={cellDistance * 0.46} 
                          fill={isBlack ? "url(#blackStoneGrad)" : "url(#whiteStoneGrad)"}
                          filter="url(#stoneShadow)"
                        />
                      </g>
                    );
                  }

                  // Render Place Interaction (Hover state only if it is my turn)
                  if (isMyTurn && game?.status === "playing") {
                    const isBlack = myColor === "BLACK";
                    return (
                      <g 
                        key={key} 
                        className="group cursor-pointer"
                        onClick={() => handlePlaceStone(r, c)}
                      >
                        {/* Invisible large hover area */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={hitRadius} 
                          fill="transparent" 
                        />
                        {/* Hover preview stone */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={cellDistance * 0.42} 
                          fill={isBlack ? "black" : "white"} 
                          opacity="0" 
                          className="group-hover:opacity-40 transition-opacity"
                        />
                      </g>
                    );
                  }

                  return null;
                })
              )}

              {/* SVG Definitions for 3D styling */}
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
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0 justify-between">
          <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl transition-all">
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
                {isLocalMode ? "Offline Match" : "Lobby ID"}
              </span>
              {isLocalMode ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-slate-600 dark:text-slate-400 font-bold text-xs">
                  <Monitor className="w-3.5 h-3.5" /> Local Play
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 font-mono text-slate-800 dark:text-slate-200 text-sm font-semibold select-all">
                  <span>{game?.id}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(game?.id || "")}
                    className="hover:text-zinc-900 dark:hover:text-white cursor-pointer active:scale-90 transition-all"
                    title="Copy Lobby ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Players and captured counts */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Players</span>
                {!isLocalMode && game && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setErrorMsg("Copied Invite Link!");
                      setTimeout(() => setErrorMsg(""), 2000);
                    }}
                    className="bg-slate-800/10 hover:bg-slate-800/20 border border-slate-800/20 text-slate-800 dark:text-zinc-200 font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <Copy className="w-3 h-3" /> Share Invite
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {game?.players.map((p) => {
                  const isTurn = game?.status === "playing" && game?.current_turn === p.color;
                  const isMe = isLocalMode ? false : p.username === username;
                  const captures = game?.board_state?.captured?.[p.color] || 0;

                  return (
                    <div 
                      key={p.username} 
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200
                        ${isTurn 
                          ? "border-slate-800/60 bg-slate-800/5 ring-1 ring-slate-800/10" 
                          : "bg-zinc-50/60 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-850"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-800 ${
                          p.color === "BLACK" ? "bg-black" : "bg-white"
                        }`} />
                        <span className={`text-sm font-medium ${isMe ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-650 dark:text-zinc-300"}`}>
                          {p.username} {isMe && "(You)"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                          Captured: {captures}
                        </span>
                        {isTurn && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-white animate-pulse">
                            Turn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!isLocalMode && Array.from({ length: 2 - (game?.players.length || 0) }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 border-dashed bg-zinc-50/30 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-650 text-xs font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-850" />
                      <span>Open Slot</span>
                    </div>
                    {game?.status === "waiting" ? (
                      <button
                        onClick={handleAddBot}
                        className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                      >
                        <Plus className="w-3 h-3" /> Add Bot
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-700">Waiting</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            {game?.status === "waiting" ? (
              <div className="space-y-3">
                <button
                  onClick={handleStartGame}
                  disabled={(game?.players?.length || 0) < 2}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Go Match
                </button>
                <p className="text-[10px] text-zinc-500 text-center">Requires 2 players in the lobby</p>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-850">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl gap-4">
                  <div className="flex-1">
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-0.5">Game Play</div>
                    {game?.status === "finished" ? (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center gap-1.5 animate-pulse">
                        <Award className="w-4 h-4" /> {game?.winner} Wins!
                      </div>
                    ) : isMyTurn ? (
                      <div className="text-slate-850 dark:text-slate-200 font-bold text-sm">
                        Your Turn: Place Stone or Pass
                      </div>
                    ) : (
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Waiting for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{game?.current_turn}</span>
                      </div>
                    )}
                  </div>

                  {game?.status === "playing" && (
                    <button
                      disabled={!isMyTurn}
                      onClick={handlePass}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all cursor-pointer"
                    >
                      Pass Turn
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Message inside panel */}
            {errorMsg && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Activity Log / Chat */}
          <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col h-[260px] max-h-[260px]">
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-800 dark:text-slate-400" /> {isLocalMode ? "Activity Log" : "Room Chat & Log"}
            </span>

            <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 custom-scrollbar text-zinc-700 dark:text-zinc-300">
              {(isLocalMode ? localLogs : chatMessages).length === 0 ? (
                <div className="text-zinc-400 dark:text-zinc-650 text-xs text-center mt-8 italic">No stone placements yet. Click the intersections to place!</div>
              ) : (
                (isLocalMode ? localLogs : chatMessages).map((msg, i) => {
                  if (msg.type === "system") {
                    return (
                      <div key={i} className="text-[11px] text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center font-medium">
                        {msg.message}
                      </div>
                    );
                  }
                  
                  const isRollOrMove = msg.type === "roll" || msg.type === "move";
                  
                  return (
                    <div key={i} className={`text-xs rounded-xl px-3 py-2 border ${isRollOrMove ? "bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-100"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          msg.color === "BLACK" ? "bg-black border border-zinc-400" : "bg-white border border-zinc-600"
                        }`} />
                        <span className="font-bold text-zinc-650 dark:text-zinc-400">{msg.username}</span>
                      </div>
                      <div className={isRollOrMove ? "italic text-zinc-500 dark:text-zinc-400 font-medium" : ""}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Box Input */}
            {!isLocalMode && (
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Send message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800/50 text-zinc-850 dark:text-zinc-200"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-2.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
