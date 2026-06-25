"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { 
  User, Copy, Plus, Play, Check, LogOut, Send, 
  MessageSquare, AlertCircle, Sparkles, Monitor, Globe,
  Sun, Moon
} from "lucide-react";

// Track coordinate points around the Ludo board (0-51)
const TRACK_COORDINATES: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

const YARD_SEAT_OFFSETS = [0, 1, 2, 3];

const HOME_COLUMN_COORDINATES: Record<string, [number, number][]> = {
  RED: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  GREEN: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  YELLOW: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  BLUE: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const STARTING_TRACK_INDICES: Record<string, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39
};

const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_THEMES: Record<string, { bg: string; text: string; border: string; token: string; hover: string }> = {
  RED: { 
    bg: "bg-red-600", 
    text: "text-red-600 dark:text-red-500", 
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
    text: "text-amber-600 dark:text-amber-500", 
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
}

interface ChatMessage {
  type: "system" | "chat" | "roll" | "move";
  username?: string;
  color?: string;
  message: string;
}

// Local mode utilities
const getLocalAbsolutePosition = (color: string, stepCount: number): number => {
  if (stepCount < 0 || stepCount > 50) return -1;
  const start = STARTING_TRACK_INDICES[color];
  return (start + stepCount) % 52;
};

const getLocalNextTurn = (current: string, activeColors: string[]): string => {
  const ORDER = ["RED", "GREEN", "YELLOW", "BLUE"];
  const filtered = ORDER.filter(c => activeColors.includes(c));
  if (!filtered.length) return current;
  const idx = filtered.indexOf(current);
  return filtered[(idx + 1) % filtered.length];
};

const executeLocalMove = (
  boardState: Record<string, number[]>,
  color: string,
  tokenIdx: number,
  roll: number
): { boardState: Record<string, number[]>; captured: boolean; message: string } => {
  const tokens = [...boardState[color]];
  const currPos = tokens[tokenIdx];
  let newPos = currPos;

  if (currPos === -1) {
    if (roll === 6) newPos = 0;
  } else {
    newPos = currPos + roll;
  }

  tokens[tokenIdx] = newPos;
  
  const nextBoardState = { ...boardState, [color]: tokens };
  let captured = false;
  let captureMsg = "";
  const absPos = getLocalAbsolutePosition(color, newPos);

  if (absPos !== -1 && !SAFE_TRACK_INDICES.has(absPos)) {
    Object.entries(nextBoardState).forEach(([oppColor, oppTokens]) => {
      if (oppColor === color) return;
      const updatedOppTokens = [...oppTokens];
      let oppUpdated = false;
      
      updatedOppTokens.forEach((oppPos, oppIdx) => {
        const oppAbs = getLocalAbsolutePosition(oppColor, oppPos);
        if (oppAbs === absPos) {
          updatedOppTokens[oppIdx] = -1; // Reset to yard
          oppUpdated = true;
          captured = true;
          captureMsg = ` Captured ${oppColor}'s token ${oppIdx + 1}!`;
        }
      });
      
      if (oppUpdated) {
        nextBoardState[oppColor] = updatedOppTokens;
      }
    });
  }

  let message = `${color} token ${tokenIdx + 1} moved to step ${newPos}.`;
  if (newPos === 56) message += " Reached Home!";
  if (captured) message += captureMsg;

  return { boardState: nextBoardState, captured, message };
};

export default function LudoPage() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Mode selection state
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
      // 1. Check join parameters
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get("join");
      if (joinId) {
        setGameId(joinId.toUpperCase());
        setEntryTab("online");
      }

      // 2. Detect and set browser mode
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
        color
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
        game_type: "ludo"
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

  // Start Local Game Engine
  const handleStartLocalGame = (e: React.FormEvent) => {
    e.preventDefault();
    
    let colors: string[] = [];
    if (localPlayerCount === 2) colors = ["RED", "YELLOW"];
    else if (localPlayerCount === 3) colors = ["RED", "GREEN", "YELLOW"];
    else colors = ["RED", "GREEN", "YELLOW", "BLUE"];

    const board: Record<string, number[]> = {};
    colors.forEach(col => {
      board[col] = [-1, -1, -1, -1];
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
      players: playersList
    });
    setLocalLogs([{ type: "system", message: "Local Pass & Play Match Started!" }]);
    setIsLocalMode(true);
    setIsJoined(true);
  };

  // Unified Gameplay Actions
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

  const handleMoveToken = (tokenIdx: number) => {
    if (isLocalMode) {
      handleLocalMoveToken(tokenIdx);
    } else {
      if (!wsRef.current || !onlineGame) return;
      wsRef.current.send(JSON.stringify({
        action: "move_token",
        token_idx: tokenIdx
      }));
    }
  };

  // Offline Engine Roll dice
  const handleLocalRoll = () => {
    if (!localGame || localGame.status !== "playing") return;
    setIsRolling(true);
    
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const turnColor = localGame.current_turn!;
      const tokens = localGame.board_state[turnColor];
      const activePlayer = localGame.players.find(p => p.color === turnColor)!;

      const updatedGame: GameState = { ...localGame, last_roll: roll, has_rolled: true };
      let logMsg = `${activePlayer.username} (${turnColor}) rolled a ${roll}.`;

      // Check valid moves locally
      const canMove = getEligibleMoves(turnColor, tokens, roll).length > 0;
      
      if (!canMove) {
        const activeColors = localGame.players.map(p => p.color);
        const nextColor = getLocalNextTurn(turnColor, activeColors);
        updatedGame.current_turn = nextColor;
        updatedGame.has_rolled = false;
        updatedGame.last_roll = null;
        logMsg += ` No moves available. Turn passes to ${nextColor}.`;
        
        setLocalLogs(prev => [...prev, {
          type: "roll",
          username: activePlayer.username,
          color: turnColor,
          message: logMsg
        }]);
      } else {
        setLocalLogs(prev => [...prev, {
          type: "roll",
          username: activePlayer.username,
          color: turnColor,
          message: logMsg
        }]);
      }

      setLocalGame(updatedGame);
      setIsRolling(false);
    }, 800);
  };

  // Offline Engine Move Token
  const handleLocalMoveToken = (tokenIdx: number) => {
    if (!localGame || !localGame.has_rolled || localGame.last_roll === null) return;

    const turnColor = localGame.current_turn!;
    const roll = localGame.last_roll;
    const activePlayer = localGame.players.find(p => p.color === turnColor)!;

    const boardStateCopy: Record<string, number[]> = {};
    Object.entries(localGame.board_state).forEach(([k, v]) => {
      boardStateCopy[k] = [...v];
    });

    const { boardState: nextBoardState, captured, message } = executeLocalMove(
      boardStateCopy, turnColor, tokenIdx, roll
    );

    let updatedGame: GameState = { ...localGame, board_state: nextBoardState };
    let logMsg = message;

    // Check winner
    const hasWon = nextBoardState[turnColor].every(pos => pos === 56);
    if (hasWon) {
      updatedGame.status = "finished";
      updatedGame.winner = turnColor;
      updatedGame.current_turn = null;
      logMsg += ` ${activePlayer.username} (${turnColor}) HAS WON THE GAME!`;
    } else {
      if (roll === 6 || captured) {
        logMsg += ` ${turnColor} gets another roll!`;
      } else {
        const activeColors = localGame.players.map(p => p.color);
        const nextColor = getLocalNextTurn(turnColor, activeColors);
        updatedGame.current_turn = nextColor;
      }
    }

    updatedGame.has_rolled = false;
    updatedGame.last_roll = null;

    setLocalGame(updatedGame);
    setLocalLogs(prev => [...prev, {
      type: "move",
      username: activePlayer.username,
      color: turnColor,
      message: logMsg
    }]);
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

  // Compute eligible moves
  const getEligibleMoves = (col: string, tokens: number[], roll: number | null): number[] => {
    if (roll === null) return [];
    const eligible: number[] = [];
    tokens.forEach((pos, idx) => {
      if (pos === 56) return;
      if (pos === -1) {
        if (roll === 6) eligible.push(idx);
      } else if (pos + roll <= 56) {
        eligible.push(idx);
      }
    });
    return eligible;
  };

  const eligibleMoves = useMemo(() => {
    if (!game || !myColor || !isMyTurn || !game.has_rolled || game.last_roll === null) return [];
    return getEligibleMoves(myColor, game.board_state[myColor], game.last_roll);
  }, [game, myColor, isMyTurn]);

  // Aggregate active path & home column tokens
  const tokensByCell = useMemo(() => {
    const cells: Record<string, { color: string; tokenIdx: number; stepCount: number }[]> = {};
    if (!game || game.status === "waiting") return cells;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      tokens.forEach((stepCount, tokenIdx) => {
        if (stepCount === -1 || stepCount === 56) return;

        let r = -1;
        let c = -1;

        if (stepCount >= 51 && stepCount <= 55) {
          const coord = HOME_COLUMN_COORDINATES[color][stepCount - 51];
          r = coord[0];
          c = coord[1];
        } else if (stepCount >= 0 && stepCount <= 50) {
          const absIdx = (STARTING_TRACK_INDICES[color] + stepCount) % 52;
          const coord = TRACK_COORDINATES[absIdx];
          r = coord[0];
          c = coord[1];
        }

        if (r !== -1 && c !== -1) {
          const key = `${r}_${c}`;
          if (!cells[key]) cells[key] = [];
          cells[key].push({ color, tokenIdx, stepCount });
        }
      });
    });

    return cells;
  }, [game]);

  // Aggregate home tokens
  const tokensAtHome = useMemo(() => {
    const home: Record<string, { tokenIdx: number }[]> = { RED: [], GREEN: [], YELLOW: [], BLUE: [] };
    if (!game || game.status === "waiting") return home;

    Object.entries(game.board_state).forEach(([color, tokens]) => {
      tokens.forEach((stepCount, tokenIdx) => {
        if (stepCount === 56) {
          home[color].push({ tokenIdx });
        }
      });
    });
    return home;
  }, [game]);

  // Generate Invite URL
  const inviteUrl = useMemo(() => {
    if (typeof window !== "undefined" && game && !isLocalMode) {
      return `${window.location.origin}/ludo?join=${game.id}`;
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
        return <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">ROLL</div>;
    }
  };

  // Shared token component
  const Token = ({ 
    color: tokenColor, 
    tokenIdx, 
    isInteractive, 
    onClick 
  }: { 
    color: string; 
    tokenIdx: number; 
    isInteractive: boolean; 
    onClick?: () => void 
  }) => {
    const themeInfo = COLOR_THEMES[tokenColor];
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isInteractive && onClick) onClick();
        }}
        disabled={!isInteractive}
        title={`${tokenColor} Token ${tokenIdx + 1}`}
        className={`w-6 h-6 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center font-bold text-xs select-none transition-all duration-200 z-20 shadow-md
          ${themeInfo.token}
          ${isInteractive ? "ring-4 ring-indigo-500 dark:ring-white animate-pulse scale-110 cursor-pointer" : "cursor-default"}
        `}
      >
        {tokenIdx + 1}
      </button>
    );
  };

  // Render path space
  const renderPathCell = (r: number, c: number) => {
    const key = `${r}_${c}`;
    const cellTokens = tokensByCell[key] || [];

    let cellBg = "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400";
    let isStar = false;
    let label = "";

    if (SAFE_TRACK_INDICES.has(TRACK_COORDINATES.findIndex(coord => coord[0] === r && coord[1] === c))) {
      isStar = true;
      cellBg = "bg-slate-200 dark:bg-zinc-800 border border-slate-350 dark:border-zinc-700 text-amber-500 dark:text-amber-400";
    }

    if (r === 6 && c === 1) {
      cellBg = "bg-red-600 dark:bg-red-500 border border-red-700 dark:border-red-600 text-white font-extrabold";
      label = "➔";
    } else if (r === 7 && c >= 1 && c <= 5) {
      cellBg = "bg-red-500/10 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400";
    }
    else if (r === 1 && c === 8) {
      cellBg = "bg-emerald-600 dark:bg-emerald-500 border border-emerald-700 dark:border-emerald-600 text-white font-extrabold";
      label = "➔";
    } else if (c === 7 && r >= 1 && r <= 5) {
      cellBg = "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
    }
    else if (r === 8 && c === 13) {
      cellBg = "bg-amber-500 dark:bg-amber-400 border border-amber-600 dark:border-amber-500 text-zinc-950 font-extrabold";
      label = "➔";
    } else if (r === 7 && c >= 9 && c <= 13) {
      cellBg = "bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-650 dark:text-amber-400";
    }
    else if (r === 13 && c === 6) {
      cellBg = "bg-blue-600 dark:bg-blue-500 border border-blue-700 dark:border-blue-600 text-white font-extrabold";
      label = "➔";
    } else if (c === 7 && r >= 9 && r <= 13) {
      cellBg = "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-650 dark:text-blue-400";
    }

    return (
      <div 
        key={key} 
        style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
        className={`w-full aspect-square flex items-center justify-center relative rounded-md select-none transition-all ${cellBg}`}
      >
        {isStar && !cellTokens.length && <Sparkles className="w-4 h-4 animate-pulse text-amber-500 dark:text-amber-400/60" />}
        {label && !cellTokens.length && <span className="text-[10px] opacity-75">{label}</span>}
        
        {cellTokens.length > 0 && (
          <div className={`grid gap-0.5 justify-center items-center ${cellTokens.length > 1 ? "grid-cols-2 p-0.5" : "grid-cols-1"}`}>
            {cellTokens.map((t) => (
              <Token 
                key={`${t.color}_${t.tokenIdx}`} 
                color={t.color} 
                tokenIdx={t.tokenIdx} 
                isInteractive={!!(isMyTurn && game?.has_rolled && eligibleMoves.includes(t.tokenIdx) && myColor === t.color)}
                onClick={() => handleMoveToken(t.tokenIdx)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Yard Container
  const renderYard = (yardColor: string, colStart: number, rowStart: number) => {
    const themeInfo = COLOR_THEMES[yardColor];
    const isYardOwner = myColor === yardColor;

    return (
      <div 
        style={{ gridColumn: `${colStart} / span 6`, gridRow: `${rowStart} / span 6` }}
        className={`bg-slate-100/90 dark:bg-zinc-950/60 border-2 ${themeInfo.border} rounded-2xl relative flex items-center justify-center p-3 transition-all duration-300 shadow-lg`}
      >
        <div className={`absolute top-2 left-3 text-xs font-bold tracking-widest ${themeInfo.text}`}>
          {yardColor} {isYardOwner && "(ACTIVE)"}
        </div>
        
        <div className={`w-3/4 h-3/4 rounded-xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 grid-rows-2 gap-3 p-3 bg-white dark:bg-zinc-900/90 shadow-inner`}>
          {YARD_SEAT_OFFSETS.map((seatIdx) => {
            const hasToken = game?.board_state[yardColor]?.[seatIdx] === -1;
            return (
              <div 
                key={seatIdx} 
                className="bg-slate-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-850 border-dashed rounded-full flex items-center justify-center aspect-square shadow-inner"
              >
                {hasToken && (
                  <Token 
                    color={yardColor} 
                    tokenIdx={seatIdx} 
                    isInteractive={!!(isMyTurn && game?.has_rolled && eligibleMoves.includes(seatIdx) && myColor === yardColor)}
                    onClick={() => handleMoveToken(seatIdx)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Registration setup lobby screen
  if (!isJoined) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex items-center justify-center p-4 transition-colors duration-305 relative">
        <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 dark:from-indigo-900/20 via-zinc-50/80 dark:via-zinc-950/60 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
        
        {/* Toggle Theme Button in Lobby */}
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/35 mb-4 animate-bounce">
              <span className="font-extrabold text-3xl tracking-tighter">L</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 dark:from-indigo-400 via-purple-505 dark:via-purple-400 to-indigo-600 dark:to-indigo-400 bg-clip-text text-transparent">
              Ludo Board
            </h1>
            <p className="text-zinc-500 dark:text-zinc-450 text-sm mt-1">Multiplayer Online or Offline Pass & Play</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 bg-zinc-100 dark:bg-zinc-950 mb-6 transition-colors duration-300">
            <button
              onClick={() => setEntryTab("online")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all
                ${entryTab === "online" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }
              `}
            >
              <Globe className="w-4 h-4" /> Online Match
            </button>
            <button
              onClick={() => setEntryTab("local")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all
                ${entryTab === "local" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pl-10 text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
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
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-450 hover:border-zinc-350 dark:hover:border-zinc-700"
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
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Create Lobby
                    </button>
                  </form>
                  <form onSubmit={handlePlayVsComputer} className="w-full">
                    <button
                      type="submit"
                      disabled={!username.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 font-semibold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center uppercase tracking-widest text-zinc-900 dark:text-zinc-100 font-mono transition-colors duration-300"
                  />
                  <button
                    type="submit"
                    disabled={!username.trim() || !gameId.trim()}
                    className="w-full bg-zinc-850 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-200 border border-zinc-750 dark:border-zinc-700 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 text-indigo-400" /> Join Room
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Offline Pass & Play setup
            <form onSubmit={handleStartLocalGame} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2">Total Players</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLocalPlayerCount(num as 2 | 3 | 4)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer
                        ${localPlayerCount === num 
                          ? "bg-indigo-600 text-white border-transparent scale-105 shadow-md" 
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
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>

                  {localPlayerCount >= 3 ? (
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Player 2 (GREEN)</span>
                      <input
                        type="text"
                        value={localPlayerNames.GREEN}
                        onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, GREEN: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
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
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>

                  {localPlayerCount === 4 ? (
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Player 4 (BLUE)</span>
                      <input
                        type="text"
                        value={localPlayerNames.BLUE}
                        onChange={(e) => setLocalPlayerNames(prev => ({ ...prev, BLUE: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
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
      <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 via-zinc-50/50 dark:via-zinc-950/40 to-zinc-100 dark:to-zinc-950 pointer-events-none z-0" />
      
      {/* Visual Header bar for active game screen */}
      <header className="w-full flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/20">
            L
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white">Ludo Room</h2>
            <p className="text-[10px] text-zinc-500">{isLocalMode ? "Pass & Play" : "Real-time Lobby"}</p>
          </div>
        </div>

        {/* Header Right controllers */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl text-zinc-650 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white cursor-pointer active:scale-90 transition-all"
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
          <div className="w-full max-w-[620px] aspect-square bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 md:p-6 shadow-xl dark:shadow-2xl relative transition-all">
            <div 
              className="grid w-full h-full gap-0.5 md:gap-1"
              style={{ 
                gridTemplateColumns: "repeat(15, minmax(0, 1fr))", 
                gridTemplateRows: "repeat(15, minmax(0, 1fr))" 
              }}
            >
              {/* Yards */}
              {renderYard("RED", 1, 1)}
              {renderYard("GREEN", 10, 1)}
              {renderYard("YELLOW", 10, 10)}
              {renderYard("BLUE", 1, 10)}

              {/* Path mapping */}
              {/* Top path */}
              {Array.from({ length: 6 }).flatMap((_, r) => 
                Array.from({ length: 3 }).map((__, cIndex) => renderPathCell(r, cIndex + 6))
              )}
              {/* Right path */}
              {Array.from({ length: 3 }).flatMap((_, rIndex) => 
                Array.from({ length: 6 }).map((__, cIndex) => renderPathCell(rIndex + 6, cIndex + 9))
              )}
              {/* Bottom path */}
              {Array.from({ length: 6 }).flatMap((_, rIndex) => 
                Array.from({ length: 3 }).map((__, cIndex) => renderPathCell(rIndex + 9, cIndex + 6))
              )}
              {/* Left path */}
              {Array.from({ length: 3 }).flatMap((_, rIndex) => 
                Array.from({ length: 6 }).map((__, cIndex) => renderPathCell(rIndex + 6, cIndex))
              )}

              {/* Center Home Triangle */}
              <div 
                style={{ gridColumn: "7 / span 3", gridRow: "7 / span 3" }}
                className="relative w-full h-full border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 rounded-xl"
              >
                <div className="absolute inset-0 bg-red-600/15 dark:bg-red-600/35 border-r border-red-500/10" style={{ clipPath: "polygon(0% 0%, 50% 50%, 0% 100%)" }} />
                <div className="absolute inset-0 bg-emerald-600/15 dark:bg-emerald-600/35 border-b border-emerald-500/10" style={{ clipPath: "polygon(0% 0%, 100% 0%, 50% 50%)" }} />
                <div className="absolute inset-0 bg-amber-500/15 dark:bg-amber-500/35 border-l border-amber-500/10" style={{ clipPath: "polygon(100% 0%, 100% 100%, 50% 50%)" }} />
                <div className="absolute inset-0 bg-blue-600/15 dark:bg-blue-600/35 border-t border-blue-500/10" style={{ clipPath: "polygon(0% 100%, 100% 100%, 50% 50%)" }} />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full z-15 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" />
                </div>

                {/* Finished Tokens */}
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-wrap gap-1 max-w-[32px] justify-center z-10">
                  {tokensAtHome.RED.map((t) => (
                    <Token key={t.tokenIdx} color="RED" tokenIdx={t.tokenIdx} isInteractive={false} />
                  ))}
                </div>
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-wrap gap-1 max-h-[32px] justify-center z-10">
                  {tokensAtHome.GREEN.map((t) => (
                    <Token key={t.tokenIdx} color="GREEN" tokenIdx={t.tokenIdx} isInteractive={false} />
                  ))}
                </div>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-wrap gap-1 max-w-[32px] justify-center z-10">
                  {tokensAtHome.YELLOW.map((t) => (
                    <Token key={t.tokenIdx} color="YELLOW" tokenIdx={t.tokenIdx} isInteractive={false} />
                  ))}
                </div>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-wrap gap-1 max-h-[32px] justify-center z-10">
                  {tokensAtHome.BLUE.map((t) => (
                    <Token key={t.tokenIdx} color="BLUE" tokenIdx={t.tokenIdx} isInteractive={false} />
                  ))}
                </div>
              </div>

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
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Monitor className="w-3.5 h-3.5" /> Local Play
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 font-mono text-indigo-650 dark:text-indigo-400 text-sm font-semibold select-all">
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
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Players</span>
                
                {!isLocalMode && game && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setErrorMsg("Copied Invite Link!");
                      setTimeout(() => setErrorMsg(""), 2000);
                    }}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <Copy className="w-3 h-3" /> Share Invite
                  </button>
                )}
              </div>

              <div className="space-y-1.5 text-zinc-800 dark:text-zinc-200">
                {game?.players.map((p) => {
                  const isTurn = game?.status === "playing" && game?.current_turn === p.color;
                  const isMe = isLocalMode ? false : p.username === username;
                  return (
                    <div 
                      key={p.username} 
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200
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
                      {isTurn && (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${COLOR_THEMES[p.color].bg} text-white animate-pulse`}>
                          Turn
                        </span>
                      )}
                    </div>
                  );
                })}
                {!isLocalMode && Array.from({ length: 4 - (game?.players.length || 0) }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 border-dashed bg-zinc-50/30 dark:bg-zinc-950/20 text-zinc-400 dark:text-zinc-600 text-xs font-medium">
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

            {/* Controller details */}
            {game?.status === "waiting" ? (
              <div className="space-y-3">
                <button
                  onClick={handleStartGame}
                  disabled={(game?.players?.length || 0) < 2}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Ludo Match
                </button>
                <p className="text-[10px] text-zinc-500 text-center">Requires at least 2 players in the lobby</p>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-850">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl gap-4">
                  <div className="flex-1">
                    <div className="text-zinc-500 dark:text-zinc-450 text-xs font-bold uppercase tracking-wider mb-0.5">Game Play</div>
                    {game?.status === "finished" ? (
                      <div className="text-amber-600 dark:text-amber-400 font-extrabold text-sm flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-4 h-4" /> {game?.winner} Wins!
                      </div>
                    ) : isMyTurn ? (
                      <div className="text-indigo-650 dark:text-indigo-400 font-bold text-sm">
                        {game?.has_rolled ? "Select token to move" : "Your Turn: Roll!"}
                      </div>
                    ) : (
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Waiting for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{game?.current_turn}</span>
                      </div>
                    )}
                  </div>

                  {game?.status === "playing" && (
                    <button
                      disabled={!isMyTurn || !!game?.has_rolled || isRolling}
                      onClick={handleRollDice}
                      className={`w-14 h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl flex items-center justify-center select-none active:scale-95 transition-all
                        ${isRolling ? "animate-spin cursor-not-allowed" : ""}
                        ${isMyTurn && !game?.has_rolled ? "hover:scale-105 ring-4 ring-indigo-500/20 bg-white cursor-pointer" : "opacity-40 cursor-not-allowed"}
                      `}
                    >
                      {renderDiceDots(game?.last_roll || 0)}
                    </button>
                  )}
                </div>

                {/* Show helper selector for tokens */}
                {isMyTurn && game?.has_rolled && eligibleMoves.length > 0 && (
                  <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl">
                    <div className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-2">Available Token Moves</div>
                    <div className="flex flex-wrap gap-2">
                      {eligibleMoves.map((tIdx) => {
                        const pos = game?.board_state[myColor || ""][tIdx];
                        return (
                          <button
                            key={tIdx}
                            onClick={() => handleMoveToken(tIdx)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            Token {tIdx + 1}
                            <span className="text-[10px] font-normal text-indigo-200">
                              ({pos === -1 ? "Yard ➔ 0" : `${pos} ➔ ${pos + (game?.last_roll || 0)}`})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Log / Live Chat box */}
          <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col h-[280px] max-h-[280px]">
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {isLocalMode ? "Activity Log" : "Room Chat & Log"}
            </span>

            <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 custom-scrollbar text-zinc-700 dark:text-zinc-300">
              {(isLocalMode ? localLogs : chatMessages).length === 0 ? (
                <div className="text-zinc-450 dark:text-zinc-600 text-xs text-center mt-8 italic">No activity logs yet. Roll the dice to start!</div>
              ) : (
                (isLocalMode ? localLogs : chatMessages).map((msg, i) => {
                  if (msg.type === "system") {
                    return (
                      <div key={i} className="text-[11px] text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 text-center font-medium">
                        {msg.message}
                      </div>
                    );
                  }
                  
                  const themeInfo = msg.color ? COLOR_THEMES[msg.color] : null;
                  const isRollOrMove = msg.type === "roll" || msg.type === "move";
                  
                  return (
                    <div key={i} className={`text-xs rounded-xl px-3 py-2 border ${isRollOrMove ? "bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-205 dark:border-zinc-850 text-zinc-600 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-100"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {themeInfo && <span className={`w-2 h-2 rounded-full ${themeInfo.bg}`} />}
                        <span className="font-bold text-zinc-405 dark:text-zinc-400">{msg.username}</span>
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
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-800 dark:text-zinc-200"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl p-2.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
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
