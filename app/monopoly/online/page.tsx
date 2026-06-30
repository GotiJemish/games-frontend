"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { 
  Building2, Users, Coins, ArrowLeft, Globe, Copy, Send, 
  Sparkles, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle, LogOut
} from "lucide-react";
import { Dice } from "../../_components/dice";

interface GamePlayer {
  username: string;
  color: "RED" | "GREEN" | "BLUE" | "YELLOW";
}

interface PlayerState {
  position: number;
  money: number;
  in_jail: boolean;
  jail_turns: number;
  bankrupt: boolean;
  color: "RED" | "GREEN" | "BLUE" | "YELLOW";
}

interface PropertyState {
  owner: "RED" | "GREEN" | "BLUE" | "YELLOW" | null;
  houses: number;
  mortgaged: boolean;
}

interface GameState {
  id: string;
  game_type: string;
  status: "waiting" | "playing" | "finished";
  current_turn: "RED" | "GREEN" | "BLUE" | "YELLOW" | null;
  last_roll: number | null;
  has_rolled: boolean;
  winner: string | null;
  board_state: {
    players: Record<string, PlayerState>;
    properties: Record<string, PropertyState>;
    logs: string[];
    phase: "roll" | "action" | "finished";
  };
  players: GamePlayer[];
}

interface ChatMessage {
  type: "system" | "chat" | "move";
  username?: string;
  color?: string;
  message: string;
}

interface Space {
  name: string;
  type: "go" | "property" | "chest" | "tax" | "railroad" | "chance" | "jail" | "utility" | "parking" | "gotojail";
  color?: string;
  price?: number;
  rent?: number[];
  house_cost?: number;
}

const SPACES: Space[] = [
  { name: "GO", type: "go" },
  { name: "Mediter. Avenue", type: "property", color: "brown", price: 60, rent: [2, 10, 30, 90, 160, 250], house_cost: 50 },
  { name: "Community Chest", type: "chest" },
  { name: "Baltic Avenue", type: "property", color: "brown", price: 60, rent: [4, 20, 60, 180, 320, 450], house_cost: 50 },
  { name: "Income Tax", type: "tax", price: 200 },
  { name: "Reading Railroad", type: "railroad", price: 200, rent: [25, 50, 100, 200] },
  { name: "Oriental Avenue", type: "property", color: "lightblue", price: 100, rent: [6, 30, 90, 270, 400, 550], house_cost: 50 },
  { name: "Chance", type: "chance" },
  { name: "Vermont Avenue", type: "property", color: "lightblue", price: 100, rent: [6, 30, 90, 270, 400, 550], house_cost: 50 },
  { name: "Connect. Avenue", type: "property", color: "lightblue", price: 120, rent: [8, 40, 100, 300, 450, 600], house_cost: 50 },
  { name: "In Jail / Visit", type: "jail" },
  { name: "St. Charles Place", type: "property", color: "pink", price: 140, rent: [10, 50, 150, 450, 625, 750], house_cost: 100 },
  { name: "Electric Company", type: "utility", price: 150, rent: [4, 10] },
  { name: "States Avenue", type: "property", color: "pink", price: 140, rent: [10, 50, 150, 450, 625, 750], house_cost: 100 },
  { name: "Virginia Avenue", type: "property", color: "pink", price: 160, rent: [12, 60, 180, 500, 700, 900], house_cost: 100 },
  { name: "Penn. Railroad", type: "railroad", price: 200, rent: [25, 50, 100, 200] },
  { name: "St. James Place", type: "property", color: "orange", price: 180, rent: [14, 70, 200, 550, 750, 950], house_cost: 100 },
  { name: "Community Chest", type: "chest" },
  { name: "Tennessee Ave", type: "property", color: "orange", price: 180, rent: [14, 70, 200, 550, 750, 950], house_cost: 100 },
  { name: "New York Avenue", type: "property", color: "orange", price: 200, rent: [16, 80, 220, 600, 800, 1000], house_cost: 100 },
  { name: "Free Parking", type: "parking" },
  { name: "Kentucky Avenue", type: "property", color: "red", price: 220, rent: [18, 90, 250, 700, 875, 1050], house_cost: 150 },
  { name: "Chance", type: "chance" },
  { name: "Indiana Avenue", type: "property", color: "red", price: 220, rent: [18, 90, 250, 700, 875, 1050], house_cost: 150 },
  { name: "Illinois Avenue", type: "property", color: "red", price: 240, rent: [20, 100, 300, 750, 925, 1100], house_cost: 150 },
  { name: "B. & O. Railroad", type: "railroad", price: 200, rent: [25, 50, 100, 200] },
  { name: "Atlantic Avenue", type: "property", color: "yellow", price: 260, rent: [22, 110, 330, 800, 975, 1150], house_cost: 150 },
  { name: "Ventnor Avenue", type: "property", color: "yellow", price: 260, rent: [22, 110, 330, 800, 975, 1150], house_cost: 150 },
  { name: "Water Works", type: "utility", price: 150, rent: [4, 10] },
  { name: "Marvin Gardens", type: "property", color: "yellow", price: 280, rent: [24, 120, 360, 850, 1025, 1200], house_cost: 150 },
  { name: "Go To Jail", type: "gotojail" },
  { name: "Pacific Avenue", type: "property", color: "green", price: 300, rent: [26, 130, 390, 900, 1100, 1275], house_cost: 200 },
  { name: "N. Carolina Ave", type: "property", color: "green", price: 300, rent: [26, 130, 390, 900, 1100, 1275], house_cost: 200 },
  { name: "Community Chest", type: "chest" },
  { name: "Penn. Avenue", type: "property", color: "green", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], house_cost: 200 },
  { name: "Short Line R.R.", type: "railroad", price: 200, rent: [25, 50, 100, 200] },
  { name: "Chance", type: "chance" },
  { name: "Park Place", type: "property", color: "darkblue", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], house_cost: 200 },
  { name: "Luxury Tax", type: "tax", price: 100 },
  { name: "Boardwalk", type: "property", color: "darkblue", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], house_cost: 200 }
];

const COLOR_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39],
  railroad: [5, 15, 25, 35],
  utility: [12, 28]
};

const BOARD_COLOR_CLASSES: Record<string, string> = {
  brown: "bg-amber-800",
  lightblue: "bg-sky-300",
  pink: "bg-pink-400",
  orange: "bg-orange-400",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  darkblue: "bg-blue-800"
};

const PLAYER_COLORS_BG: Record<string, string> = {
  RED: "bg-red-500 text-white",
  GREEN: "bg-green-500 text-white",
  BLUE: "bg-blue-500 text-white",
  YELLOW: "bg-yellow-400 text-black"
};

const PLAYER_COLORS_BORDER: Record<string, string> = {
  RED: "border-red-500",
  GREEN: "border-green-500",
  BLUE: "border-blue-500",
  YELLOW: "border-yellow-400"
};

export default function MonopolyOnlinePage() {
  const [actionType, setActionType] = useState<"select" | "create" | "join">("select");
  const [username, setUsername] = useState("");
  const [color, setColor] = useState<"RED" | "GREEN" | "BLUE" | "YELLOW">("RED");
  const [gameIdInput, setGameIdInput] = useState("");

  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);

  // Chat message & gameplay notifications
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Selected space for houses / mortgaging
  const [selectedSpaceIdx, setSelectedSpaceIdx] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll chats
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 1";
    try {
      const res = await api.post("games/create", {
        username: uName,
        color,
        game_type: "monopoly"
      });
      const lobby = res.data;
      setOnlineGame(lobby);
      setGameId(lobby.id);
      setIsJoined(true);
      connectWebSocket(lobby.id, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create room");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const uName = username.trim() || "Player 2";
    const gId = gameIdInput.trim();
    if (!gId) {
      setErrorMsg("Please enter room code");
      return;
    }
    try {
      const res = await api.post(`games/${gId}/join`, {
        username: uName,
        color
      });
      setOnlineGame(res.data);
      setGameId(gId);
      setIsJoined(true);
      connectWebSocket(gId, uName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to join room");
    }
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      const res = await api.post(`games/${gameId}/start`);
      setOnlineGame(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to start match");
    }
  };

  const handleLeaveRoom = () => {
    if (wsRef.current) wsRef.current.close();
    setIsJoined(false);
    setOnlineGame(null);
    setGameId("");
    setActionType("select");
  };

  const sendAction = (action: string, extra = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...extra }));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendAction("chat", { message: msg });
    setChatInput("");
  };

  // Turn Actions
  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    // Simulate dice spin locally for 800ms
    setTimeout(() => {
      setIsRolling(false);
      sendAction("roll_dice_monopoly");
    }, 800);
  };

  const handleBuyProperty = () => {
    if (!onlineGame) return;
    const myState = getMyPlayerState();
    if (!myState) return;
    sendAction("buy_property_monopoly", { property_idx: myState.position });
  };

  const handleBuildHouse = (idx: number) => {
    sendAction("build_house_monopoly", { property_idx: idx });
  };

  const handleSellHouse = (idx: number) => {
    sendAction("sell_house_monopoly", { property_idx: idx });
  };

  const handleToggleMortgage = (idx: number) => {
    sendAction("mortgage_property_monopoly", { property_idx: idx });
  };

  const handlePayJailFine = () => {
    sendAction("pay_jail_fine_monopoly");
  };

  const handleDeclareBankruptcy = () => {
    sendAction("declare_bankruptcy_monopoly");
  };

  const handleEndTurn = () => {
    sendAction("end_turn_monopoly");
  };

  // Helper utils
  const getMyColor = (): "RED" | "GREEN" | "BLUE" | "YELLOW" | null => {
    const me = onlineGame?.players.find(p => p.username === username);
    return me ? me.color : null;
  };

  const getMyPlayerState = (): PlayerState | null => {
    const col = getMyColor();
    return col && onlineGame?.board_state?.players ? onlineGame.board_state.players[col] : null;
  };

  const getGridPosition = (index: number) => {
    if (index >= 0 && index <= 10) {
      return { gridRow: 11, gridColumn: 11 - index };
    } else if (index > 10 && index < 20) {
      return { gridRow: 11 - (index - 10), gridColumn: 1 };
    } else if (index >= 20 && index <= 30) {
      return { gridRow: 1, gridColumn: index - 20 + 1 };
    } else {
      return { gridRow: index - 30 + 1, gridColumn: 11 };
    }
  };

  const isMyTurn = (): boolean => {
    if (!onlineGame) return false;
    return onlineGame.current_turn === getMyColor();
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-4 md:p-6 transition-colors duration-300 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full max-w-7xl z-10 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6 select-none">
        <div className="flex items-center gap-3">
          {isJoined ? (
            <button
              onClick={handleLeaveRoom}
              className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-550 rounded-2xl shadow-sm text-zinc-650 dark:text-zinc-350 cursor-pointer transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <Link href="/monopoly" className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl shadow-sm text-zinc-650 dark:text-zinc-350 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-550 to-indigo-650 bg-clip-text text-transparent">
            Monopoly Royale (Online)
          </h1>
        </div>
        {onlineGame && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-550 font-bold select-all">Code: {gameId}</span>
            <button
              onClick={copyToClipboard}
              className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white rounded-xl bg-zinc-50 dark:bg-zinc-850 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </header>

      {errorMsg && (
        <div className="w-full max-w-md bg-red-500/10 border border-red-500/25 rounded-2xl p-4 mb-4 text-red-650 dark:text-red-400 flex items-center gap-3 text-sm z-25 animate-scale-up select-none">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. LOBBY OPTIONS SCREEN */}
      {!isJoined && (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 z-10 shadow-xl space-y-8 mt-12 animate-fade-in">
          {actionType === "select" && (
            <div className="space-y-6 text-center select-none">
              <Globe className="w-10 h-10 mx-auto text-blue-500 animate-pulse" />
              <div>
                <h2 className="text-2xl font-extrabold">Online Lobby</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Host a room or enter room code to join</p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <button
                  onClick={() => setActionType("create")}
                  className="py-4.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-2xl cursor-pointer hover:opacity-95 shadow-md text-sm active:scale-98 transition-all"
                >
                  Create New Room
                </button>
                <button
                  onClick={() => setActionType("join")}
                  className="py-4.5 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground font-extrabold rounded-2xl cursor-pointer border border-zinc-200 dark:border-zinc-800 text-sm active:scale-98 transition-all"
                >
                  Join with Code
                </button>
              </div>
            </div>
          )}

          {actionType === "create" && (
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold">Create Room</h2>
                <p className="text-xs text-zinc-500">Pick a username and token color</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400">Username</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 focus:border-blue-500 rounded-2xl px-4 py-3.5 focus:outline-none text-sm transition-colors"
                    placeholder="E.g., Landlord"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400">Choose Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["RED", "GREEN", "BLUE", "YELLOW"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c as any)}
                        className={`py-3 rounded-xl font-black text-xs cursor-pointer border transition-all ${
                          color === c
                            ? "bg-blue-605 text-white border-blue-650 shadow-md shadow-blue-500/20 scale-102"
                            : "bg-white dark:bg-zinc-850 border-zinc-200 dark:border-zinc-850 text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-850 rounded-2xl font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-2xl text-sm cursor-pointer shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {actionType === "join" && (
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold">Join Room</h2>
                <p className="text-xs text-zinc-500 font-bold">Enter lobby code and pick your credentials</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400">Lobby Code</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 focus:border-blue-500 rounded-2xl px-4 py-3.5 focus:outline-none text-sm transition-colors font-mono uppercase tracking-wider"
                    placeholder="E.g., abc12efg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400">Username</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 focus:border-blue-500 rounded-2xl px-4 py-3.5 focus:outline-none text-sm transition-colors"
                    placeholder="E.g., Tycoon"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400">Choose Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["RED", "GREEN", "BLUE", "YELLOW"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c as any)}
                        className={`py-3 rounded-xl font-black text-xs cursor-pointer border transition-all ${
                          color === c
                            ? "bg-blue-605 text-white border-blue-650 shadow-md shadow-blue-500/20"
                            : "bg-white dark:bg-zinc-850 border-zinc-200 dark:border-zinc-850 text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType("select")}
                  className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-850 rounded-2xl font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-2xl text-sm cursor-pointer shadow-md"
                >
                  Join Room
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 2. ROOM LOBBY WAITING SCREEN */}
      {isJoined && onlineGame && onlineGame.status === "waiting" && (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 z-10 shadow-xl space-y-8 mt-12 animate-fade-in select-none">
          <div className="text-center space-y-2">
            <Globe className="w-10 h-10 mx-auto text-blue-500 animate-spin-slow" />
            <h2 className="text-2xl font-extrabold">Lobby Lounge</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-550">Waiting for players to join... (Max 4)</p>
          </div>

          {/* Connected players list */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400">Joined Players ({onlineGame.players.length})</div>
            {onlineGame.players.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900/20"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${PLAYER_COLORS_BG[p.color]}`}>
                    {p.username.substring(0, 1)}
                  </span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{p.username}</span>
                </div>
                <span className="text-xs text-zinc-400 font-bold uppercase">{p.color}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {onlineGame.players.length >= 2 ? (
            <button
              onClick={handleStartGame}
              className="w-full py-4.5 bg-gradient-to-r from-blue-650 to-indigo-650 text-white font-extrabold rounded-2xl text-sm cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Launch Match</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="text-center text-xs text-zinc-450 p-4 border border-zinc-200/50 dark:border-zinc-805/50 rounded-2xl bg-zinc-50/50 dark:bg-zinc-850/20">
              Need at least 2 players to launch the game
            </div>
          )}
        </div>
      )}

      {/* 3. ACTIVE GAME PLAYBOARD & CONTROLS */}
      {isJoined && onlineGame && onlineGame.status !== "waiting" && (
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-start">
          
          {/* Left Panel: Grid Gameboard (cols 1 to 7) */}
          <div className="lg:col-span-7 flex justify-center items-center">
            <div className="w-full max-w-[650px] aspect-square bg-zinc-200 dark:bg-zinc-900 border-4 border-zinc-850 dark:border-zinc-800 rounded-3xl p-1 relative shadow-2xl overflow-hidden grid grid-cols-11 grid-rows-11 gap-[2px]">
              
              {/* Central Actions Center panel */}
              <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-white dark:bg-zinc-950 flex flex-col justify-between p-4 md:p-6 rounded-2xl m-0.5 relative border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-hidden select-none">
                
                <div className="text-center space-y-1">
                  <div className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold">MONOPOLY</div>
                  <div className="text-[10px] text-zinc-400 font-bold dark:text-zinc-650">MULTIPLAYER ONLINE</div>
                </div>

                {/* Central displays */}
                <div className="flex-1 flex flex-col justify-center items-center my-4 space-y-4">
                  {/* Dice Box */}
                  <div className="flex gap-4">
                    <Dice val={onlineGame.last_roll ? Math.ceil(onlineGame.last_roll / 2) : 1} isRolling={isRolling} onClick={() => {}} disabled={true} color="RED" />
                    <Dice val={onlineGame.last_roll ? Math.floor(onlineGame.last_roll / 2) : 1} isRolling={isRolling} onClick={() => {}} disabled={true} color="BLUE" />
                  </div>

                  {/* Active turn display */}
                  <div className="text-center space-y-1">
                    {onlineGame.status === "finished" ? (
                      <div className="text-sm font-black text-emerald-500 uppercase tracking-wider animate-bounce">
                        👑 Winner: {onlineGame.winner}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-black text-zinc-805 dark:text-zinc-200 flex items-center gap-1.5 justify-center">
                          <span>Active Turn:</span>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${PLAYER_COLORS_BG[onlineGame.current_turn || "RED"]}`}>
                            {onlineGame.current_turn}
                          </span>
                        </div>
                        {isMyTurn() ? (
                          <div className="text-xs font-bold text-blue-500 dark:text-blue-400 animate-pulse">
                            It is your turn! Make a move.
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-400">
                            Waiting for opponent...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Turn Actions buttons */}
                {onlineGame.status !== "finished" && (
                  <div className="space-y-2">
                    {isMyTurn() && onlineGame.board_state?.phase === "roll" && (
                      <div className="flex gap-2">
                        {onlineGame.board_state.players[getMyColor() || "RED"]?.in_jail && (
                          <button
                            onClick={handlePayJailFine}
                            disabled={onlineGame.board_state.players[getMyColor() || "RED"]?.money < 50}
                            className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-750 text-white font-bold rounded-2xl text-xs cursor-pointer disabled:opacity-50"
                          >
                            Pay $50 Fine
                          </button>
                        )}
                        <button
                          onClick={handleRollDice}
                          disabled={isRolling}
                          className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-2xl text-sm shadow-md cursor-pointer hover:opacity-95"
                        >
                          {isRolling ? "Rolling..." : "Roll Dice"}
                        </button>
                      </div>
                    )}

                    {isMyTurn() && onlineGame.board_state?.phase === "action" && (
                      <div className="space-y-2">
                        {/* Buy street button */}
                        {(() => {
                          const me = getMyPlayerState();
                          if (!me) return null;
                          const space = SPACES[me.position];
                          const prop = onlineGame.board_state.properties[me.position.toString()];
                          if (prop && prop.owner === null && me.money >= (space.price || 0)) {
                            return (
                              <button
                                onClick={handleBuyProperty}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm shadow-md cursor-pointer active:scale-95 transition-all"
                              >
                                Buy {space.name} (${space.price})
                              </button>
                            );
                          }
                          return null;
                        })()}

                        <div className="flex gap-2">
                          {getMyPlayerState() && (getMyPlayerState()?.money || 0) < 0 && (
                            <button
                              onClick={handleDeclareBankruptcy}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Bankrupt
                            </button>
                          )}
                          <button
                            onClick={handleEndTurn}
                            disabled={(getMyPlayerState()?.money || 0) < 0}
                            className="flex-1 py-3.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-750 text-white font-extrabold rounded-2xl text-sm shadow-md cursor-pointer active:scale-95"
                          >
                            End Turn
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RENDER GRID BOARD */}
              {SPACES.map((space, idx) => {
                const gridPos = getGridPosition(idx);
                const propState = onlineGame.board_state?.properties?.[idx.toString()];

                let colorBar = null;
                const spaceColor = space.color ? BOARD_COLOR_CLASSES[space.color] : "";
                if (spaceColor) {
                  if (idx > 0 && idx < 10) {
                    colorBar = <div className={`w-full h-1.5 md:h-2.5 ${spaceColor}`} />;
                  } else if (idx > 10 && idx < 20) {
                    colorBar = <div className={`h-full w-1.5 md:w-2.5 ${spaceColor} absolute right-0 top-0`} />;
                  } else if (idx > 20 && idx < 30) {
                    colorBar = <div className={`w-full h-1.5 md:h-2.5 ${spaceColor} absolute bottom-0 left-0`} />;
                  } else if (idx > 30 && idx < 40) {
                    colorBar = <div className={`h-full w-1.5 md:w-2.5 ${spaceColor} absolute left-0 top-0`} />;
                  }
                }

                // Collect standing player tokens
                const standingPlayers: PlayerState[] = [];
                if (onlineGame.board_state?.players) {
                  Object.keys(onlineGame.board_state.players).forEach(colKey => {
                    const ps = onlineGame.board_state.players[colKey];
                    if (ps.position === idx && !ps.bankrupt) {
                      standingPlayers.push(ps);
                    }
                  });
                }

                let ownerIndicator = null;
                if (propState && propState.owner) {
                  ownerIndicator = (
                    <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ${PLAYER_COLORS_BG[propState.owner]} border border-white`} />
                  );
                }

                const handleSpaceClick = () => {
                  if (propState) {
                    setSelectedSpaceIdx(idx);
                  }
                };

                return (
                  <div
                    key={idx}
                    onClick={handleSpaceClick}
                    style={gridPos}
                    className={`border border-zinc-300 dark:border-zinc-805 bg-zinc-50 dark:bg-zinc-900/90 flex flex-col justify-between items-center p-[2px] cursor-pointer hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors relative overflow-hidden select-none ${
                      [0, 10, 20, 30].includes(idx) ? "font-bold" : ""
                    }`}
                  >
                    {colorBar}

                    <div className={`text-[6px] md:text-[8px] leading-tight text-center font-bold break-words px-0.5 mt-1 text-zinc-750 dark:text-zinc-350 ${
                      [0, 10, 20, 30].includes(idx) ? "font-black" : ""
                    }`}>
                      {space.name}
                    </div>

                    <div className="text-[5px] md:text-[7px] text-zinc-500 font-bold mb-1 select-none">
                      {space.price ? `$${space.price}` : ""}
                      {idx === 0 && <span className="text-red-500 font-bold">←</span>}
                    </div>

                    {standingPlayers.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/5 dark:bg-black/15">
                        <div className="flex flex-wrap gap-0.5 justify-center items-center p-0.5">
                          {standingPlayers.map(p => (
                            <span
                              key={p.color}
                              className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full border border-white dark:border-zinc-800 shadow-md ${
                                PLAYER_COLORS_BG[p.color]
                              } flex items-center justify-center text-[5px] font-black`}
                            >
                              {p.color.substring(0, 1)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {propState && propState.houses > 0 && !propState.mortgaged && (
                      <div className="absolute top-1 left-1 flex gap-0.5 pointer-events-none">
                        {Array.from({ length: propState.houses }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              propState.houses === 5 ? "bg-red-655" : "bg-green-600"
                            }`} 
                          />
                        ))}
                      </div>
                    )}

                    {propState && propState.mortgaged && (
                      <div className="absolute top-0.5 left-0.5 px-0.5 bg-red-550 text-white text-[5px] font-black rounded pointer-events-none">
                        M
                      </div>
                    )}

                    {ownerIndicator}
                  </div>
                );
              })}

            </div>
          </div>

          {/* Right Panel: Players list, chat room & log feeds (cols 8 to 12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Realtime Assets Panel */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-4 select-none">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Coins className="w-5 h-5 text-blue-500 animate-pulse" />
                <span>Active Assets</span>
              </h2>

              <div className="space-y-3">
                {onlineGame.players.map((gp, i) => {
                  const state = onlineGame.board_state?.players?.[gp.color];
                  const isCurrent = onlineGame.current_turn === gp.color && onlineGame.status !== "finished";
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                        isCurrent
                          ? `${PLAYER_COLORS_BORDER[gp.color]} bg-zinc-50 dark:bg-zinc-850/50 shadow-sm border-2`
                          : "border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900/20"
                      } ${state?.bankrupt ? "opacity-45" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-2xl ${PLAYER_COLORS_BG[gp.color]} flex items-center justify-center text-xs font-black`}>
                          {gp.username.substring(0, 1)}
                        </span>
                        <div>
                          <div className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                            <span>{gp.username}</span>
                            {state?.bankrupt && <span className="text-[10px] text-red-550 font-black px-1.5 py-0.5 bg-red-500/10 rounded-full">Bankrupt</span>}
                          </div>
                          {state && (
                            <div className="text-xs text-zinc-400 dark:text-zinc-550">
                              Pos: {state.position} ({SPACES[state.position].name})
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-zinc-905 dark:text-white">
                          ${state ? state.money : 1500}
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-extrabold text-blue-550 dark:text-blue-450 uppercase tracking-wider animate-pulse">
                            Active Turn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat & Logs Multi-panel */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                <span>Room Feed</span>
              </h2>

              <div className="h-44 overflow-y-auto border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono space-y-2 select-text">
                {/* Display logs from board state */}
                {onlineGame.board_state?.logs?.map((log, i) => (
                  <div key={i} className="border-b border-zinc-100 dark:border-zinc-900 pb-1 last:border-b-0 text-zinc-650 dark:text-zinc-350 leading-relaxed">
                    <span className="text-blue-550 font-bold select-none mr-1.5">&gt;</span>
                    {log}
                  </div>
                ))}
                
                {/* Display chat messages */}
                {chatMessages.map((chat, idx) => (
                  <div key={idx} className="border-b border-zinc-100 dark:border-zinc-900 pb-1 text-zinc-700 dark:text-zinc-300">
                    <span className={`font-bold mr-1.5 ${chat.color ? PLAYER_COLORS_BG[chat.color] + " px-1 py-0.5 rounded text-[8px]" : "text-zinc-400"}`}>
                      {chat.username || "System"}:
                    </span>
                    <span>{chat.message}</span>
                  </div>
                ))}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Field */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  maxLength={100}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message to lobby..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* PROPERTY VIEWER & ASSET MANAGER MODAL */}
      {selectedSpaceIdx !== null && onlineGame && onlineGame.status !== "waiting" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl relative animate-scale-up">
            
            <div className={`p-4 rounded-2xl text-center space-y-1 relative ${
              SPACES[selectedSpaceIdx].color ? BOARD_COLOR_CLASSES[SPACES[selectedSpaceIdx].color || ""] : "bg-zinc-800"
            } text-white`}>
              <div className="text-xs uppercase tracking-widest opacity-80 font-extrabold">
                {SPACES[selectedSpaceIdx].type}
              </div>
              <h3 className="text-lg font-black">{SPACES[selectedSpaceIdx].name}</h3>
            </div>

            <div className="text-sm space-y-2 text-zinc-650 dark:text-zinc-350">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                <span>Value:</span>
                <span className="font-bold text-zinc-800 dark:text-white">${SPACES[selectedSpaceIdx].price}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                <span>Mortgage Value:</span>
                <span className="font-bold text-zinc-800 dark:text-white">${(SPACES[selectedSpaceIdx].price || 0) / 2}</span>
              </div>
              {SPACES[selectedSpaceIdx].type === "property" && (
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  <span>House Cost:</span>
                  <span className="font-bold text-zinc-800 dark:text-white">${SPACES[selectedSpaceIdx].house_cost}</span>
                </div>
              )}
              
              {/* Owner details */}
              <div className="pt-2 text-xs border-t border-zinc-150 dark:border-zinc-800 mt-2 space-y-1">
                <div>Owner: <span className="font-bold text-zinc-900 dark:text-white">
                  {onlineGame.board_state.properties[selectedSpaceIdx.toString()]?.owner || "Bank"}
                </span></div>
                <div>Mortgaged: <span className="font-bold text-zinc-900 dark:text-white">
                  {onlineGame.board_state.properties[selectedSpaceIdx.toString()]?.mortgaged ? "Yes" : "No"}
                </span></div>
                <div>Houses: <span className="font-bold text-zinc-900 dark:text-white">
                  {onlineGame.board_state.properties[selectedSpaceIdx.toString()]?.houses || 0}
                </span></div>
              </div>
            </div>

            {/* Management panel if owner */}
            {onlineGame.board_state.properties[selectedSpaceIdx.toString()]?.owner === getMyColor() && isMyTurn() && onlineGame.status !== "finished" && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 dark:text-zinc-555">Asset Manager:</div>
                <div className="grid grid-cols-2 gap-2">
                  {SPACES[selectedSpaceIdx].type === "property" && (
                    <>
                      <button
                        onClick={() => handleBuildHouse(selectedSpaceIdx)}
                        disabled={onlineGame.board_state.properties[selectedSpaceIdx.toString()].houses >= 5 || onlineGame.board_state.properties[selectedSpaceIdx.toString()].mortgaged}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Build House
                      </button>
                      <button
                        onClick={() => handleSellHouse(selectedSpaceIdx)}
                        disabled={onlineGame.board_state.properties[selectedSpaceIdx.toString()].houses <= 0}
                        className="py-2.5 bg-orange-550 hover:bg-orange-655 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Sell House
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleToggleMortgage(selectedSpaceIdx)}
                    disabled={onlineGame.board_state.properties[selectedSpaceIdx.toString()].houses > 0}
                    className="col-span-2 py-2.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-755 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    {onlineGame.board_state.properties[selectedSpaceIdx.toString()].mortgaged ? "Unmortgage" : "Mortgage Property"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedSpaceIdx(null)}
              className="w-full py-3 bg-zinc-150 dark:bg-zinc-850 hover:bg-zinc-200 text-zinc-705 dark:text-zinc-200 font-bold rounded-2xl cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
