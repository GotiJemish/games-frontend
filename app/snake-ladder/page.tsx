"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { 
  User, Copy, Plus, Play, Check, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Monitor, Globe,
  Sun, Moon, ShieldAlert
} from "lucide-react";

// Board size definitions
const BOARD_ROWS = 10;
const BOARD_COLS = 10;

// Snakes mapping: start cell -> end cell (head -> tail)
const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79
};

// Ladders mapping: start cell -> end cell (bottom -> top)
const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};

const COLOR_THEMES: Record<string, { bg: string; text: string; border: string; token: string; hover: string }> = {
  RED: { 
    bg: "bg-red-600", 
    text: "text-red-655 dark:text-red-500", 
    border: "border-red-500",
    token: "bg-red-500 shadow-red-500/50 hover:shadow-red-500/80", 
    hover: "hover:bg-red-600" 
  },
  GREEN: { 
    bg: "bg-emerald-600", 
    text: "text-emerald-650 dark:text-emerald-500", 
    border: "border-emerald-500",
    token: "bg-emerald-500 shadow-emerald-500/50 hover:shadow-emerald-500/80", 
    hover: "hover:bg-emerald-600" 
  },
  YELLOW: { 
    bg: "bg-amber-500", 
    text: "text-amber-600 dark:text-amber-550", 
    border: "border-amber-500",
    token: "bg-amber-400 text-zinc-950 shadow-amber-400/50 hover:shadow-amber-400/80", 
    hover: "hover:bg-amber-500" 
  },
  BLUE: { 
    bg: "bg-blue-600", 
    text: "text-blue-600 dark:text-blue-500", 
    border: "border-blue-500",
    token: "bg-blue-500 shadow-blue-500/50 hover:shadow-blue-500/80", 
    hover: "hover:bg-blue-600" 
  }
};

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
  board_state: Record<string, number[]>;
  players: GamePlayer[];
  game_type?: string;
}

interface ChatMessage {
  type: "system" | "chat" | "roll" | "move";
  username?: string;
  color?: string;
  message: string;
}

// Converts cell number (1 to 100) to grid coordinates { col, row } where row 0 is top
const getCellCoords = (cellNum: number): { col: number; row: number } => {
  const adjusted = cellNum - 1;
  const rowFromBottom = Math.floor(adjusted / 10);
  const row = 9 - rowFromBottom;
  const isRowEvenFromBottom = rowFromBottom % 2 === 1;
  const col = isRowEvenFromBottom ? 9 - (adjusted % 10) : adjusted % 10;
  return { col, row };
};

// Local Mode gameplay move execution
const executeLocalMove = (
  boardState: Record<string, number[]>,
  color: string,
  roll: number
): { boardState: Record<string, number[]>; message: string } => {
  const nextBoardState = { ...boardState };
  const currPos = boardState[color][0];
  let newPos = currPos + roll;

  if (newPos > 100) {
    return {
      boardState,
      message: `${color} rolled a ${roll} but needs exact roll to reach 100 (stays at ${currPos}).`
    };
  }

  let msg = `${color} rolled a ${roll} and moved from ${currPos} to ${newPos}.`;

  if (LADDERS[newPos]) {
    const landPos = LADDERS[newPos];
    msg += ` Climbed a ladder to ${landPos}!`;
    newPos = landPos;
  } else if (SNAKES[newPos]) {
    const landPos = SNAKES[newPos];
    msg += ` Was bitten by a snake and slid down to ${landPos}.`;
    newPos = landPos;
  }

  nextBoardState[color] = [newPos];
  return { boardState: nextBoardState, message: msg };
};

const getLocalNextTurn = (current: string, activeColors: string[]): string => {
  const ORDER = ["RED", "GREEN", "YELLOW", "BLUE"];
  const filtered = ORDER.filter(c => activeColors.includes(c));
  if (!filtered.length) return current;
  const idx = filtered.indexOf(current);
  return filtered[(idx + 1) % filtered.length];
};

export default function SnakeLadderPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [entryTab, setEntryTab] = useState<"online" | "local">("online");
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Online Multiplayer state
  const [username, setUsername] = useState("");
  const [color, setColor] = useState("RED");
  const [gameId, setGameId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [onlineGame, setOnlineGame] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRolling, setIsRolling] = useState(false);

  // Local Pass & Play State
  const [localPlayerCount, setLocalPlayerCount] = useState<2 | 3 | 4>(2);
  const [localPlayerNames, setLocalPlayerNames] = useState<Record<string, string>>({
    RED: "Player 1",
    GREEN: "Player 2",
    YELLOW: "Player 3",
    BLUE: "Player 4"
  });
  const [localGame, setLocalGame] = useState<GameState | null>(null);
  const [localLogs, setLocalLogs] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Resolve API Base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/";
  const httpUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;

  // Autoscroll logs/chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, localLogs]);

  // Read URL search parameter '?join=ID' and initialize System Theme on mount
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

  // Theme switch handler
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  };

  // Cleanup WebSockets
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect WebSocket
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
      } else if (data.type === "roll") {
        setOnlineGame(data.game);
        setChatMessages(prev => [...prev, {
          type: "roll",
          username: data.username,
          color: data.color,
          message: data.message
        }]);
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

  // REST API Actions
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    try {
      const res = await axios.post(`${httpUrl}games/create`, {
        username: username.trim(),
        color,
        game_type: "snake-ladder"
      });
      const data = res.data;
      setOnlineGame(data);
      setGameId(data.id);
      setIsJoined(true);
      setIsLocalMode(false);
      connectWebSocket(data.id, username.trim());
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create game lobby");
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
      setErrorMsg(err.response?.data?.detail || "Failed to join game lobby");
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
    const availableColors = ["RED", "GREEN", "YELLOW", "BLUE"].filter(c => !takenColors.includes(c));
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
    const myCol = color || "RED";
    
    const colors = ["RED", "GREEN", "YELLOW", "BLUE"];
    const otherColors = colors.filter(c => c !== myCol);

    try {
      const createRes = await axios.post(`${httpUrl}games/create`, {
        username: uName,
        color: myCol,
        game_type: "snake-ladder"
      });
      const lobby = createRes.data;
      const gId = lobby.id;
      
      for (const botCol of otherColors) {
        await axios.post(`${httpUrl}games/${gId}/add_bot`, {
          username: `Computer (Bot) ${botCol}`,
          color: botCol
        });
      }
      
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
    
    let colors: string[] = [];
    if (localPlayerCount === 2) colors = ["RED", "YELLOW"];
    else if (localPlayerCount === 3) colors = ["RED", "GREEN", "YELLOW"];
    else colors = ["RED", "GREEN", "YELLOW", "BLUE"];

    const board: Record<string, number[]> = {};
    colors.forEach(col => {
      board[col] = [0]; // Position 0 represents off the board
    });

    const playersList = colors.map((col) => ({
      username: localPlayerNames[col] || `${col} Player`,
      color: col
    }));

    setLocalGame({
      id: "LOCAL",
      status: "playing",
      current_turn: "RED",
      last_roll: null,
      has_rolled: false,
      winner: null,
      board_state: board,
      players: playersList,
      game_type: "snake-ladder"
    });
    setLocalLogs([{ type: "system", message: "Local Pass & Play Match Started!" }]);
    setIsLocalMode(true);
    setIsJoined(true);
  };

  // Dice roll
  const handleRollDice = () => {
    if (isLocalMode) {
      handleLocalRoll();
    } else {
      if (!wsRef.current || !onlineGame) return;
      setIsRolling(true);
      setTimeout(() => {
        wsRef.current?.send(JSON.stringify({ action: "roll_dice" }));
        setIsRolling(false);
      }, 800);
    }
  };

  // Offline Engine Roll & Auto-Move
  const handleLocalRoll = () => {
    if (!localGame || localGame.status !== "playing") return;
    setIsRolling(true);
    
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const turnColor = localGame.current_turn!;
      const activePlayer = localGame.players.find(p => p.color === turnColor)!;

      const { boardState: nextBoardState, message } = executeLocalMove(
        localGame.board_state,
        turnColor,
        roll
      );

      let updatedGame: GameState = {
        ...localGame,
        board_state: nextBoardState,
        last_roll: roll
      };

      let logMsg = message;

      // Check Winner
      const hasWon = nextBoardState[turnColor][0] === 100;
      if (hasWon) {
        updatedGame.status = "finished";
        updatedGame.winner = turnColor;
        updatedGame.current_turn = null;
        logMsg += ` ${activePlayer.username} (${turnColor}) HAS WON THE GAME!`;
      } else {
        if (roll === 6) {
          logMsg += ` ${activePlayer.username} gets another roll!`;
        } else {
          const activeColors = localGame.players.map(p => p.color);
          const nextColor = getLocalNextTurn(turnColor, activeColors);
          updatedGame.current_turn = nextColor;
        }
      }

      setLocalGame(updatedGame);
      setLocalLogs(prev => [...prev, {
        type: "move",
        username: activePlayer.username,
        color: turnColor,
        message: logMsg
      }]);
      setIsRolling(false);
    }, 800);
  };

  // Chat Form (Online only)
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

  // Compute turns & player settings dynamically
  const myPlayer = isLocalMode 
    ? game?.players?.find(p => p.color === game?.current_turn) 
    : game?.players?.find(p => p.username === username);
  
  const myColor = myPlayer?.color;
  
  const isMyTurn = isLocalMode
    ? game?.status === "playing"
    : game?.status === "playing" && game?.current_turn === myColor;

  // Map tokens to coordinates
  const tokensByCell = useMemo(() => {
    const cells: Record<number, { color: string; username: string }[]> = {};
    if (!game || game.status === "waiting") return cells;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      const pos = tokens[0];
      if (pos > 0 && pos <= 100) {
        if (!cells[pos]) cells[pos] = [];
        const playerObj = game.players.find(p => p.color === color);
        cells[pos].push({ color, username: playerObj?.username || color });
      }
    });

    return cells;
  }, [game]);

  // Aggregate off-board players
  const offBoardPlayers = useMemo(() => {
    const list: { color: string; username: string }[] = [];
    if (!game || game.status === "waiting") return list;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      if (tokens[0] === 0) {
        const playerObj = game.players.find(p => p.color === color);
        list.push({ color, username: playerObj?.username || color });
      }
    });
    return list;
  }, [game]);

  // Generate Invite URL
  const inviteUrl = useMemo(() => {
    if (typeof window !== "undefined" && game && !isLocalMode) {
      return `${window.location.origin}/snake-ladder?join=${game.id}`;
    }
    return "";
  }, [game, isLocalMode]);

  // Dice dot renderer
  const renderDiceDots = (val: number) => {
    const dotClasses = "w-3 h-3 bg-zinc-950 dark:bg-white rounded-full shadow-sm animate-pulse";
    switch (val) {
      case 1:
        return <div className="flex items-center justify-center w-full h-full"><div className={dotClasses} /></div>;
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2 flex-col">
            <div className="flex justify-start"><div className={dotClasses} /></div>
            <div className="flex justify-end"><div className={dotClasses} /></div>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2 flex-col">
            <div className="flex justify-start"><div className={dotClasses} /></div>
            <div className="flex justify-center"><div className={dotClasses} /></div>
            <div className="flex justify-end"><div className={dotClasses} /></div>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full p-2 gap-2">
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-1.5 justify-items-center items-center">
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
            <div />
            <div className={dotClasses} />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 w-full h-full p-2 gap-x-2 gap-y-1 justify-items-center">
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
            <div className={dotClasses} />
          </div>
        );
      default:
        return <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs md:text-sm">ROLL</div>;
    }
  };

  // Render Grid Cells
  const renderGridCells = () => {
    const cells = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      const rowNum = 9 - r; // Row index from bottom (0 to 9)
      const isRowEvenFromBottom = rowNum % 2 === 1;

      for (let c = 0; c < BOARD_COLS; c++) {
        const colNum = isRowEvenFromBottom ? 9 - c : c;
        const cellNum = rowNum * 10 + colNum + 1;
        const cellTokens = tokensByCell[cellNum] || [];

        // Styling cells with alternating chess pattern
        const isAlternate = (r + c) % 2 === 1;
        let cellBg = isAlternate 
          ? "bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50" 
          : "bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50";

        // Accent home (100) and start (1)
        if (cellNum === 100) {
          cellBg = "bg-amber-500/20 dark:bg-amber-400/25 border-2 border-amber-500/50";
        } else if (cellNum === 1) {
          cellBg = "bg-indigo-650/15 dark:bg-indigo-500/20 border-2 border-indigo-500/50";
        }

        cells.push(
          <div 
            key={cellNum}
            className={`w-full aspect-square relative flex flex-col justify-between p-1 rounded-sm select-none transition-all ${cellBg}`}
          >
            {/* Cell Number */}
            <span className={`text-[9px] md:text-xs font-bold leading-none ${
              cellNum === 100 ? "text-amber-600 dark:text-amber-400" :
              cellNum === 1 ? "text-indigo-600 dark:text-indigo-400" :
              "text-zinc-400 dark:text-zinc-650"
            }`}>
              {cellNum}
            </span>

            {/* Cell Tokens */}
            <div className="flex-1 flex items-center justify-center">
              {cellTokens.length > 0 && (
                <div className={`grid gap-0.5 justify-center items-center ${cellTokens.length > 1 ? "grid-cols-2 p-0.5" : "grid-cols-1"}`}>
                  {cellTokens.map((t, idx) => {
                    const themeInfo = COLOR_THEMES[t.color];
                    return (
                      <div 
                        key={idx}
                        title={t.username}
                        className={`w-4 h-4 md:w-6 md:h-6 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center font-extrabold text-[8px] md:text-[10px] select-none shadow-md ${themeInfo.token}`}
                      >
                        {t.username.substring(0, 1).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    return cells;
  };

  // SVGLayer for drawing snakes and ladders overlay
  const renderSVGOverlay = () => {
    // Generate lines connecting start and end coordinates
    return (
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="ladderGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Draw Ladders */}
        {Object.entries(LADDERS).map(([startStr, endVal]) => {
          const start = parseInt(startStr);
          const end = endVal;
          const c1 = getCellCoords(start);
          const c2 = getCellCoords(end);

          // Map grid index (0-9) to percentage coordinates (0-100)
          const x1 = c1.col * 10 + 5;
          const y1 = c1.row * 10 + 5;
          const x2 = c2.col * 10 + 5;
          const y2 = c2.row * 10 + 5;

          // Draw double parallel lines representing a ladder
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const dx = Math.sin(angle) * 1.5;
          const dy = -Math.cos(angle) * 1.5;

          return (
            <g key={`ladder-${start}`}>
              <line 
                x1={x1 + dx} y1={y1 + dy} 
                x2={x2 + dx} y2={y2 + dy} 
                stroke="url(#ladderGrad)" 
                strokeWidth="1.2" 
              />
              <line 
                x1={x1 - dx} y1={y1 - dy} 
                x2={x2 - dx} y2={y2 - dy} 
                stroke="url(#ladderGrad)" 
                strokeWidth="1.2" 
              />
              {/* Rungs of the ladder */}
              {Array.from({ length: 6 }).map((_, i) => {
                const t = (i + 1) / 7;
                const rx = x1 + (x2 - x1) * t;
                const ry = y1 + (y2 - y1) * t;
                return (
                  <line 
                    key={i}
                    x1={rx + dx} y1={ry + dy} 
                    x2={rx - dx} y2={ry - dy} 
                    stroke="#10b981" 
                    strokeWidth="0.8" 
                    strokeOpacity="0.8"
                  />
                );
              })}
            </g>
          );
        })}

        {/* Draw Snakes */}
        {Object.entries(SNAKES).map(([startStr, endVal]) => {
          const start = parseInt(startStr);
          const end = endVal;
          const c1 = getCellCoords(start);
          const c2 = getCellCoords(end);

          const x1 = c1.col * 10 + 5;
          const y1 = c1.row * 10 + 5;
          const x2 = c2.col * 10 + 5;
          const y2 = c2.row * 10 + 5;

          // Draw wavy bezier curve for the snake
          const midX1 = (x1 + x2) / 2 + (y2 - y1) * 0.12;
          const midY1 = (y1 + y2) / 2 - (x2 - x1) * 0.12;
          const midX2 = (x1 + x2) / 2 - (y2 - y1) * 0.12;
          const midY2 = (y1 + y2) / 2 + (x2 - x1) * 0.12;

          const pathD = `M ${x1} ${y1} C ${midX1} ${midY1}, ${midX2} ${midY2}, ${x2} ${y2}`;

          return (
            <g key={`snake-${start}`}>
              <path 
                d={pathD} 
                fill="none" 
                stroke="url(#snakeGrad)" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
              />
              {/* Snake Head */}
              <circle cx={x1} cy={y1} r="1.4" fill="#ef4444" />
              <circle cx={x1 - 0.4} cy={y1 - 0.4} r="0.3" fill="white" />
              <circle cx={x1 + 0.4} cy={y1 - 0.4} r="0.3" fill="white" />
              {/* Snake Tail */}
              <circle cx={x2} cy={y2} r="0.5" fill="#dc2626" />
            </g>
          );
        })}
      </svg>
    );
  };

  // Lobby Screen View
  if (!isJoined) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 transition-colors duration-300 relative">
        <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 dark:from-indigo-900/20 via-zinc-50/80 dark:via-zinc-950/60 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
        
        {/* Toggle Theme */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={toggleTheme} 
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative z-10 transition-colors duration-300">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/35 mb-4 animate-bounce">
              <span className="font-extrabold text-3xl tracking-tighter">S</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 dark:from-emerald-400 via-teal-500 dark:via-teal-400 to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
              Snakes & Ladders
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Multiplayer Online or Offline Pass & Play</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 bg-zinc-100 dark:bg-zinc-950 mb-6 transition-colors duration-300">
            <button
              onClick={() => setEntryTab("online")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all
                ${entryTab === "online" 
                  ? "bg-emerald-600 text-white shadow-md" 
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
                  ? "bg-emerald-600 text-white shadow-md" 
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
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-805 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
                  />
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Assign Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(COLOR_THEMES).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`py-3.5 rounded-xl border text-xs font-bold tracking-wider transition-all cursor-pointer
                        ${color === c 
                          ? `${COLOR_THEMES[c].bg} text-white border-transparent scale-105 shadow-lg` 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-350 dark:hover:border-zinc-700"
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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Create Lobby
                    </button>
                  </form>
                  <form onSubmit={handlePlayVsComputer} className="w-full">
                    <button
                      type="submit"
                      disabled={!username.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Monitor className="w-4 h-4" /> VS Computer
                    </button>
                  </form>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
                  <span className="flex-shrink mx-4 text-zinc-450 dark:text-zinc-550 text-xs font-semibold uppercase tracking-widest">or join lobby</span>
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-850"></div>
                </div>

                <form onSubmit={handleJoinGame} className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Lobby ID (e.g. game1234)"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center uppercase tracking-widest text-zinc-900 dark:text-zinc-100 font-mono transition-colors duration-300"
                  />
                  <button
                    type="submit"
                    disabled={!username.trim() || !gameId.trim()}
                    className="w-full bg-zinc-850 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-200 border border-zinc-750 dark:border-zinc-700 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 text-emerald-450" /> Join Room
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Offline Pass & Play Setup
            <form onSubmit={handleStartLocalGame} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Total Players</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLocalPlayerCount(num as 2 | 3 | 4)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer
                        ${localPlayerCount === num 
                          ? "bg-emerald-600 text-white border-transparent scale-105 shadow-md" 
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-350 dark:hover:border-zinc-750"
                        }
                      `}
                    >
                      {num} Players
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Player Names</label>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Player 1 (RED)</span>
                    <input
                      type="text"
                      value={localPlayerNames.RED}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, RED: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>

                  {localPlayerCount >= 3 ? (
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-555 uppercase tracking-widest">Player 2 (GREEN)</span>
                      <input
                        type="text"
                        value={localPlayerNames.GREEN}
                        onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, GREEN: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                  ) : null}

                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                      {localPlayerCount === 2 ? "Player 2" : "Player 3"} (YELLOW)
                    </span>
                    <input
                      type="text"
                      value={localPlayerNames.YELLOW}
                      onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, YELLOW: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>

                  {localPlayerCount === 4 ? (
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Player 4 (BLUE)</span>
                      <input
                        type="text"
                        value={localPlayerNames.BLUE}
                        onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, BLUE: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
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
      <div className="absolute inset-0 bg-radial-gradient from-emerald-900/10 via-zinc-50/50 dark:via-zinc-950/40 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
      
      {/* Header bar */}
      <header className="w-full flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-emerald-600/20">
            S
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white">Snakes & Ladders Room</h2>
            <p className="text-[10px] text-zinc-500">{isLocalMode ? "Pass & Play" : "Real-time Lobby"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl text-zinc-650 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-white cursor-pointer active:scale-90 transition-all"
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

      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch justify-center z-10 w-full">
        {/* Board container */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[620px] aspect-square bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xl dark:shadow-2xl relative transition-all flex items-center justify-center">
            
            {/* The 10x10 Grid wrapper */}
            <div className="w-full h-full relative grid grid-cols-10 grid-rows-10 gap-[2px] md:gap-[4px] bg-zinc-300 dark:bg-zinc-850 p-[2px] md:p-[4px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              {renderGridCells()}
              {renderSVGOverlay()}
            </div>

          </div>
        </div>

        {/* Sidebar panels */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0 justify-between">
          
          <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
                {isLocalMode ? "Offline Match" : "Lobby ID"}
              </span>
              {isLocalMode ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-105 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Monitor className="w-3.5 h-3.5" /> Local Play
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 font-mono text-emerald-600 dark:text-emerald-400 text-sm font-semibold select-all">
                  <span>{game?.id}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(game?.id || "")}
                    className="hover:text-zinc-900 dark:hover:text-white cursor-pointer active:scale-90 transition-all animate-pulse"
                    title="Copy Lobby ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Players list info */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Players</span>
                
                {!isLocalMode && game && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setErrorMsg("Copied Invite Link!");
                      setTimeout(() => setErrorMsg(""), 2000);
                    }}
                    className="bg-emerald-650/10 hover:bg-emerald-650/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <Copy className="w-3 h-3" /> Share Invite
                  </button>
                )}
              </div>

              <div className="space-y-1.5 text-zinc-850 dark:text-zinc-200">
                {game?.players.map((p) => {
                  const isTurn = game?.status === "playing" && game?.current_turn === p.color;
                  const isMe = isLocalMode ? false : p.username === username;
                  const currentPos = game?.board_state[p.color]?.[0] || 0;

                  return (
                    <div 
                      key={p.username} 
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-205
                        ${isTurn 
                          ? `${COLOR_THEMES[p.color].border} bg-${p.color.toLowerCase()}-500/5 ring-1 ring-${p.color.toLowerCase()}-500/10` 
                          : "bg-zinc-50/60 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-850"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${COLOR_THEMES[p.color].bg} shadow-sm`} />
                        <span className={`text-sm font-medium ${isMe ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-650 dark:text-zinc-300"}`}>
                          {p.username} {isMe && "(You)"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-450 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-850">
                          Pos: {currentPos}
                        </span>
                        {isTurn && (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${COLOR_THEMES[p.color].bg} text-white animate-pulse`}>
                            Turn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!isLocalMode && Array.from({ length: 4 - (game?.players.length || 0) }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 border-dashed bg-zinc-50/30 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-650 text-xs font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-850" />
                      <span>Open Lobby Slot</span>
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

            {/* Off-board players list */}
            {game?.status === "playing" && offBoardPlayers.length > 0 && (
              <div className="mb-4 p-3 bg-zinc-55/40 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-850">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 mb-1.5">Waiting to Enter Board (Pos 0)</span>
                <div className="flex flex-wrap gap-1.5">
                  {offBoardPlayers.map((p, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className={`w-2.5 h-2.5 rounded-full ${COLOR_THEMES[p.color].bg}`} />
                      <span className="text-zinc-700 dark:text-zinc-300">{p.username}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Controllers */}
            {game?.status === "waiting" ? (
              <div className="space-y-3">
                <button
                  onClick={handleStartGame}
                  disabled={(game?.players?.length || 0) < 2}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Snakes & Ladders
                </button>
                <p className="text-[10px] text-zinc-500 text-center">Requires at least 2 players in the lobby</p>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-850">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl gap-4">
                  <div className="flex-1">
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-0.5">Game Play</div>
                    {game?.status === "finished" ? (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-4 h-4" /> {game?.winner} Wins!
                      </div>
                    ) : isMyTurn ? (
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        Your Turn: Roll!
                      </div>
                    ) : (
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Waiting for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{game?.current_turn}</span>
                      </div>
                    )}
                  </div>

                  {game?.status === "playing" && (
                    <button
                      disabled={!isMyTurn || isRolling}
                      onClick={handleRollDice}
                      className={`w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl flex items-center justify-center select-none active:scale-95 transition-all
                        ${isRolling ? "animate-spin cursor-not-allowed" : ""}
                        ${isMyTurn ? "hover:scale-105 ring-4 ring-emerald-500/20 bg-white cursor-pointer" : "opacity-40 cursor-not-allowed"}
                      `}
                    >
                      {renderDiceDots(game?.last_roll || 0)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Activity Log / Chat */}
          <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col h-[280px] max-h-[280px]">
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450" /> {isLocalMode ? "Activity Log" : "Room Chat & Log"}
            </span>

            <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 custom-scrollbar text-zinc-700 dark:text-zinc-300">
              {(isLocalMode ? localLogs : chatMessages).length === 0 ? (
                <div className="text-zinc-400 dark:text-zinc-650 text-xs text-center mt-8 italic">No activity logs yet. Roll the dice to start!</div>
              ) : (
                (isLocalMode ? localLogs : chatMessages).map((msg, i) => {
                  if (msg.type === "system") {
                    return (
                      <div key={i} className="text-[11px] text-zinc-500 dark:text-zinc-500 bg-zinc-105 dark:bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center font-medium">
                        {msg.message}
                      </div>
                    );
                  }
                  
                  const themeInfo = msg.color ? COLOR_THEMES[msg.color] : null;
                  const isRollOrMove = msg.type === "roll" || msg.type === "move";
                  
                  return (
                    <div key={i} className={`text-xs rounded-xl px-3 py-2 border ${isRollOrMove ? "bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-100"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {themeInfo && <span className={`w-2 h-2 rounded-full ${themeInfo.bg}`} />}
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

            {/* Form */}
            {!isLocalMode && (
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Send message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-zinc-850 dark:text-zinc-200"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-505 text-white rounded-xl p-2.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
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
