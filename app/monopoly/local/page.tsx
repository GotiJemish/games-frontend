"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Building2, Users, Coins, ArrowLeft, RotateCcw, 
  Sparkles, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle, Flame
} from "lucide-react";
import { Dice } from "../../_components/dice";

interface Player {
  name: string;
  color: "RED" | "GREEN" | "BLUE" | "YELLOW";
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
}

interface PropertyState {
  owner: "RED" | "GREEN" | "BLUE" | "YELLOW" | null;
  houses: number; // 0-5 (5 is hotel)
  mortgaged: boolean;
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

const CHANCE_CARDS = [
  { text: "Advance to GO (Collect $200)", type: "move", target: 0 },
  { text: "Advance to Illinois Avenue", type: "move", target: 24 },
  { text: "Advance to St. Charles Place", type: "move", target: 11 },
  { text: "Bank pays you dividend of $50", type: "money", amount: 50 },
  { text: "Go directly to Jail", type: "jail" },
  { text: "Pay poor tax of $15", type: "money", amount: -15 },
  { text: "Advance to Boardwalk", type: "move", target: 39 },
  { text: "Your building loan matures. Collect $150", type: "money", amount: 150 },
  { text: "You won crossword competition. Collect $100", type: "money", amount: 100 }
];

const COMMUNITY_CHEST_CARDS = [
  { text: "Advance to GO (Collect $200)", type: "move", target: 0 },
  { text: "Bank error in your favor. Collect $200", type: "money", amount: 200 },
  { text: "Doctor's fees. Pay $50", type: "money", amount: -50 },
  { text: "From sale of stock you get $50", type: "money", amount: 50 },
  { text: "Income tax refund. Collect $200", type: "money", amount: 200 },
  { text: "Life insurance matures. Collect $100", type: "money", amount: 100 },
  { text: "Pay hospital fees of $100", type: "money", amount: -100 },
  { text: "Pay school fees of $50", type: "money", amount: -50 },
  { text: "You inherit $100", type: "money", amount: 100 },
  { text: "Holiday fund matures. Receive $100", type: "money", amount: 100 }
];

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

const PLAYER_COLORS_TEXT: Record<string, string> = {
  RED: "text-red-500",
  GREEN: "text-green-500",
  BLUE: "text-blue-500",
  YELLOW: "text-yellow-500 dark:text-yellow-400"
};

export default function MonopolyLocalPage() {
  const [phase, setPhase] = useState<"setup" | "roll" | "action" | "jail_decision" | "finished">("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [properties, setProperties] = useState<Record<string, PropertyState>>({});
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  
  // Setup config
  const [playersCount, setPlayersCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2", "Player 3", "Player 4"]);

  // Dice states
  const [dice1, setDice1] = useState<number>(1);
  const [dice2, setDice2] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [doubleRollCount, setDoubleRollCount] = useState<number>(0);

  // Card draw
  const [drawnCard, setDrawnCard] = useState<{ text: string; deck: "Chance" | "Community Chest" } | null>(null);

  // Selected property for mortgage/building management
  const [selectedSpaceIdx, setSelectedSpaceIdx] = useState<number | null>(null);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Initializing board properties
  const initializeProperties = () => {
    const props: Record<string, PropertyState> = {};
    SPACES.forEach((space, idx) => {
      if (["property", "railroad", "utility"].includes(space.type)) {
        props[idx.toString()] = {
          owner: null,
          houses: 0,
          mortgaged: false
        };
      }
    });
    setProperties(props);
  };

  const handleStartGame = () => {
    const list: Player[] = [];
    const colors: ("RED" | "GREEN" | "BLUE" | "YELLOW")[] = ["RED", "GREEN", "BLUE", "YELLOW"];
    for (let i = 0; i < playersCount; i++) {
      list.push({
        name: playerNames[i].trim() || `Player ${i + 1}`,
        color: colors[i],
        money: 1500,
        position: 0,
        inJail: false,
        jailTurns: 0,
        bankrupt: false
      });
    }
    initializeProperties();
    setPlayers(list);
    setCurrentTurn(0);
    setLogs(["Monopoly Royale local match started!"]);
    setDoubleRollCount(0);
    setPhase("roll");
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const getActivePlayers = () => players.filter(p => !p.bankrupt);

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

  // Roll dice trigger
  const handleRollDice = () => {
    if (isRolling || phase !== "roll") return;

    setIsRolling(true);
    let rolls = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls >= 10) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 80);
  };

  const finalizeRoll = () => {
    setIsRolling(false);
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    setDice1(r1);
    setDice2(r2);

    const rollTotal = r1 + r2;
    const double = r1 === r2;
    const currentPlayer = players[currentTurn];
    addLog(`${currentPlayer.name} rolled: ${r1} + ${r2} = ${rollTotal}.`);

    if (currentPlayer.inJail) {
      if (double) {
        currentPlayer.inJail = false;
        currentPlayer.jailTurns = 0;
        addLog(`${currentPlayer.name} rolled doubles and got out of Jail!`);
        movePlayer(currentPlayer, rollTotal);
      } else {
        currentPlayer.jailTurns++;
        if (currentPlayer.jailTurns >= 3) {
          currentPlayer.money -= 50;
          currentPlayer.inJail = false;
          currentPlayer.jailTurns = 0;
          addLog(`${currentPlayer.name} was forced to pay $50 jail fine after 3 turns. Released!`);
          movePlayer(currentPlayer, rollTotal);
        } else {
          addLog(`${currentPlayer.name} remains in Jail (turn ${currentPlayer.jailTurns}/3).`);
          setPhase("action"); // Forces end turn
        }
      }
      const updatedPlayers = [...players];
      updatedPlayers[currentTurn] = currentPlayer;
      setPlayers(updatedPlayers);
      return;
    }

    if (double) {
      const nextDoubleCount = doubleRollCount + 1;
      setDoubleRollCount(nextDoubleCount);
      if (nextDoubleCount === 3) {
        currentPlayer.inJail = true;
        currentPlayer.position = 10;
        currentPlayer.jailTurns = 0;
        addLog(`${currentPlayer.name} rolled doubles 3 times in a row! Sent directly to Jail.`);
        setDoubleRollCount(0);
        setPhase("action"); // force end turn
        const updatedPlayers = [...players];
        updatedPlayers[currentTurn] = currentPlayer;
        setPlayers(updatedPlayers);
        return;
      }
      addLog(`${currentPlayer.name} rolled doubles! Gets an extra roll after this turn.`);
    } else {
      setDoubleRollCount(0);
    }

    movePlayer(currentPlayer, rollTotal);
  };

  const movePlayer = (p: Player, steps: number) => {
    const oldPos = p.position;
    const newPos = (oldPos + steps) % 40;
    p.position = newPos;
    addLog(`${p.name} moved to ${SPACES[newPos].name}.`);

    if (newPos < oldPos) {
      p.money += 200;
      addLog(`${p.name} passed GO and collected $200!`);
    }

    const updatedPlayers = [...players];
    updatedPlayers[currentTurn] = p;
    setPlayers(updatedPlayers);

    landOnSpace(newPos, steps);
  };

  const landOnSpace = (pos: number, steps: number) => {
    const player = players[currentTurn];
    const space = SPACES[pos];

    if (space.type === "tax") {
      player.money -= space.price || 0;
      addLog(`${player.name} paid $${space.price} in taxes.`);
    } else if (space.type === "gotojail") {
      player.inJail = true;
      player.position = 10;
      player.jailTurns = 0;
      addLog(`${player.name} was sent directly to Jail!`);
    } else if (space.type === "chance" || space.type === "chest") {
      const isChance = space.type === "chance";
      const deck = isChance ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
      const card = deck[Math.floor(Math.random() * deck.length)];
      setDrawnCard({ text: card.text, deck: isChance ? "Chance" : "Community Chest" });
      applyCard(card, steps);
    } else if (["property", "railroad", "utility"].includes(space.type)) {
      const propState = properties[pos.toString()];
      if (propState.owner && propState.owner !== player.color && !propState.mortgaged) {
        const ownerPlayer = players.find(p => p.color === propState.owner);
        if (ownerPlayer && !ownerPlayer.bankrupt) {
          const rent = calculateRentAmount(pos, steps);
          player.money -= rent;
          ownerPlayer.money += rent;
          addLog(`${player.name} paid $${rent} rent to ${ownerPlayer.name}.`);
        }
      }
    }

    const updatedPlayers = [...players];
    setPlayers(updatedPlayers);
    setPhase("action");
  };

  const calculateRentAmount = (pos: number, rollTotal: number): number => {
    const space = SPACES[pos];
    const propState = properties[pos.toString()];
    const owner = propState.owner;
    if (!owner) return 0;

    if (space.type === "property") {
      const houses = propState.houses;
      if (houses > 0) {
        return space.rent ? space.rent[houses] : 0;
      }
      // Check monopoly double rent
      const group = space.color || "";
      const groupIndices = COLOR_GROUPS[group];
      const hasMonopoly = groupIndices.every(idx => properties[idx.toString()].owner === owner);
      const baseRent = space.rent ? space.rent[0] : 0;
      return hasMonopoly ? baseRent * 2 : baseRent;
    } else if (space.type === "railroad") {
      const groupIndices = COLOR_GROUPS.railroad;
      const count = groupIndices.filter(idx => properties[idx.toString()].owner === owner).length;
      return 25 * Math.pow(2, count - 1);
    } else if (space.type === "utility") {
      const groupIndices = COLOR_GROUPS.utility;
      const count = groupIndices.filter(idx => properties[idx.toString()].owner === owner).length;
      const multiplier = count === 2 ? 10 : 4;
      return multiplier * rollTotal;
    }
    return 0;
  };

  const applyCard = (card: any, rollTotal: number) => {
    const player = players[currentTurn];
    if (card.type === "money") {
      player.money += card.amount;
      addLog(`${player.name} got card effect: ${card.amount > 0 ? "+" : ""}$${card.amount}`);
    } else if (card.type === "move") {
      const oldPos = player.position;
      player.position = card.target;
      addLog(`${player.name} was moved to ${SPACES[card.target].name} by card.`);
      if (card.target < oldPos) {
        player.money += 200;
        addLog(`${player.name} passed GO and collected $200!`);
      }
      setTimeout(() => landOnSpace(card.target, rollTotal), 1200);
    } else if (card.type === "jail") {
      player.inJail = true;
      player.position = 10;
      player.jailTurns = 0;
      addLog(`${player.name} was sent directly to Jail by card.`);
    }
  };

  const handleBuyProperty = () => {
    const player = players[currentTurn];
    const pos = player.position;
    const space = SPACES[pos];
    const propState = properties[pos.toString()];

    if (!propState || propState.owner || player.money < (space.price || 0)) return;

    player.money -= space.price || 0;
    propState.owner = player.color;

    const updatedPlayers = [...players];
    updatedPlayers[currentTurn] = player;
    setPlayers(updatedPlayers);

    const updatedProps = { ...properties };
    updatedProps[pos.toString()] = propState;
    setProperties(updatedProps);

    addLog(`${player.name} bought ${space.name} for $${space.price}.`);
  };

  const handleEndTurn = () => {
    // If double was rolled and player is not jailed/bankrupt, let them roll again!
    if (doubleRollCount > 0 && !players[currentTurn].inJail && !players[currentTurn].bankrupt) {
      addLog(`${players[currentTurn].name} takes another roll from doubles!`);
      setPhase("roll");
      return;
    }

    // Go to next turn
    let nextTurn = (currentTurn + 1) % players.length;
    let loops = 0;
    while (players[nextTurn].bankrupt && loops < players.length) {
      nextTurn = (nextTurn + 1) % players.length;
      loops++;
    }

    if (loops >= players.length) {
      setPhase("finished");
      return;
    }

    // Check winner
    const active = players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      setPhase("finished");
      addLog(`Game over! ${active[0].name} has won the match!`);
      return;
    }

    setCurrentTurn(nextTurn);
    setDoubleRollCount(0);
    setPhase("roll");
  };

  const handlePayJailFine = () => {
    const player = players[currentTurn];
    if (!player.inJail || player.money < 50) return;

    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    addLog(`${player.name} paid $50 fine to get out of Jail.`);

    const updatedPlayers = [...players];
    updatedPlayers[currentTurn] = player;
    setPlayers(updatedPlayers);

    setPhase("roll");
  };

  // Build a house on selected property
  const handleBuildHouse = (idx: number) => {
    const player = players[currentTurn];
    const space = SPACES[idx];
    const propState = properties[idx.toString()];

    if (!propState || propState.owner !== player.color || propState.mortgaged) return;
    if (space.type !== "property" || propState.houses >= 5 || player.money < (space.house_cost || 0)) return;

    // Check Monopoly group
    const group = space.color || "";
    const groupIndices = COLOR_GROUPS[group];
    const ownsAll = groupIndices.every(i => properties[i.toString()].owner === player.color);
    if (!ownsAll) {
      alert("You must own all properties of this color group to build houses!");
      return;
    }

    // Check even building
    const currHouses = propState.houses;
    const canBuild = groupIndices.every(i => {
      if (i === idx) return true;
      return currHouses <= properties[i.toString()].houses;
    });

    if (!canBuild) {
      alert("You must build evenly! Add houses to other properties of this color group first.");
      return;
    }

    player.money -= space.house_cost || 0;
    propState.houses++;

    const updatedPlayers = [...players];
    setPlayers(updatedPlayers);

    const updatedProps = { ...properties };
    updatedProps[idx.toString()] = propState;
    setProperties(updatedProps);

    addLog(`${player.name} built house/hotel on ${space.name} (Houses: ${propState.houses}).`);
  };

  // Sell a house
  const handleSellHouse = (idx: number) => {
    const player = players[currentTurn];
    const space = SPACES[idx];
    const propState = properties[idx.toString()];

    if (!propState || propState.owner !== player.color || propState.houses <= 0) return;

    // Even selling check
    const group = space.color || "";
    const groupIndices = COLOR_GROUPS[group];
    const currHouses = propState.houses;
    const canSell = groupIndices.every(i => {
      if (i === idx) return true;
      return currHouses >= properties[i.toString()].houses;
    });

    if (!canSell) {
      alert("You must sell houses evenly! Remove houses from other properties of this group first.");
      return;
    }

    const refund = (space.house_cost || 0) / 2;
    player.money += refund;
    propState.houses--;

    const updatedPlayers = [...players];
    setPlayers(updatedPlayers);

    const updatedProps = { ...properties };
    updatedProps[idx.toString()] = propState;
    setProperties(updatedProps);

    addLog(`${player.name} sold a house on ${space.name} for $${refund}.`);
  };

  // Toggle mortgage
  const handleToggleMortgage = (idx: number) => {
    const player = players[currentTurn];
    const space = SPACES[idx];
    const propState = properties[idx.toString()];

    if (!propState || propState.owner !== player.color || propState.houses > 0) return;

    const mortgageValue = (space.price || 0) / 2;

    if (propState.mortgaged) {
      // Unmortgage costs mortgage + 10%
      const cost = Math.floor(mortgageValue * 1.1);
      if (player.money < cost) return;
      player.money -= cost;
      propState.mortgaged = false;
      addLog(`${player.name} unmortgaged ${space.name} for $${cost}.`);
    } else {
      player.money += mortgageValue;
      propState.mortgaged = true;
      addLog(`${player.name} mortgaged ${space.name} and collected $${mortgageValue}.`);
    }

    const updatedPlayers = [...players];
    setPlayers(updatedPlayers);

    const updatedProps = { ...properties };
    updatedProps[idx.toString()] = propState;
    setProperties(updatedProps);
  };

  // Bankrupt player
  const handleDeclareBankruptcy = () => {
    const player = players[currentTurn];
    player.bankrupt = true;
    addLog(`${player.name} declared bankruptcy! All properties returned to bank.`);

    // Reset properties owned by this player
    const updatedProps = { ...properties };
    Object.keys(updatedProps).forEach(k => {
      if (updatedProps[k].owner === player.color) {
        updatedProps[k].owner = null;
        updatedProps[k].houses = 0;
        updatedProps[k].mortgaged = false;
      }
    });
    setProperties(updatedProps);

    const updatedPlayers = [...players];
    setPlayers(updatedPlayers);

    // End turn automatically
    handleEndTurn();
  };

  const handleResetGame = () => {
    setPhase("setup");
    setPlayers([]);
    setProperties({});
    setCurrentTurn(0);
    setLogs([]);
  };

  const renderJailFineButton = () => {
    const p = players[currentTurn];
    if (p && p.inJail && p.money >= 50 && phase === "roll") {
      return (
        <button
          onClick={handlePayJailFine}
          className="flex-1 py-3.5 bg-yellow-600 hover:bg-yellow-750 text-white font-bold rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md"
        >
          Pay $50 Fine
        </button>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-4 md:p-6 transition-colors duration-300 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-red-500/5 dark:bg-red-500/10 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full max-w-7xl z-10 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/monopoly" className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl shadow-sm text-zinc-600 dark:text-zinc-350 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-555 dark:from-amber-400 via-orange-500 to-red-550 bg-clip-text text-transparent">
            Monopoly Royale (Local)
          </h1>
        </div>
        {phase !== "setup" && (
          <button
            onClick={handleResetGame}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 rounded-xl cursor-pointer border border-red-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </header>

      {phase === "setup" ? (
        // PLAYER SETUP SCREEN
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 z-10 shadow-xl space-y-8 mt-12 animate-fade-in">
          <div className="text-center space-y-2">
            <Users className="w-10 h-10 mx-auto text-amber-500 animate-pulse" />
            <h2 className="text-2xl font-extrabold">Pass & Play Setup</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Configure local players on this device</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-zinc-600 dark:text-zinc-400">Number of Players</label>
            <div className="grid grid-cols-3 gap-3">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPlayersCount(num)}
                  className={`py-3.5 rounded-2xl font-bold cursor-pointer transition-all border ${
                    playersCount === num 
                      ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/20 scale-102"
                      : "bg-white dark:bg-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-foreground border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  {num} Players
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-zinc-600 dark:text-zinc-400">Edit Player Names</label>
            <div className="space-y-3">
              {Array.from({ length: playersCount }).map((_, idx) => {
                const colors = ["RED", "GREEN", "BLUE", "YELLOW"];
                const color = colors[idx];
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full ${PLAYER_COLORS_BG[color]}`} />
                    <input
                      type="text"
                      value={playerNames[idx]}
                      maxLength={15}
                      onChange={(e) => {
                        const temp = [...playerNames];
                        temp[idx] = e.target.value;
                        setPlayerNames(temp);
                      }}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-750 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors"
                      placeholder={`Player ${idx + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:opacity-95 text-white font-bold rounded-2xl py-4.5 cursor-pointer shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Start Game</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        // GAMEBOARD & PANEL VIEW
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-start">
          
          {/* Left panel: Board (columns 1 to 7) */}
          <div className="lg:col-span-7 flex justify-center items-center">
            <div className="w-full max-w-[650px] aspect-square bg-zinc-200 dark:bg-zinc-900 border-4 border-zinc-850 dark:border-zinc-800 rounded-3xl p-1 relative shadow-2xl overflow-hidden grid grid-cols-11 grid-rows-11 gap-[2px]">
              
              {/* Center Overlay / Game Center Panel */}
              <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-white dark:bg-zinc-950 flex flex-col justify-between p-4 md:p-6 rounded-2xl m-0.5 relative border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-hidden select-none">
                
                {/* Center Header */}
                <div className="text-center space-y-1">
                  <div className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold">MONOPOLY</div>
                  <div className="text-[10px] text-zinc-400 font-bold dark:text-zinc-650">PASS & PLAY MULTIPLAYER</div>
                </div>

                {/* Main central display: Dice, card details, or phase results */}
                <div className="flex-1 flex flex-col justify-center items-center my-4 space-y-4">
                  {/* Dice Box */}
                  <div className="flex gap-4">
                    <Dice val={dice1} isRolling={isRolling} onClick={() => {}} disabled={true} color="RED" />
                    <Dice val={dice2} isRolling={isRolling} onClick={() => {}} disabled={true} color="BLUE" />
                  </div>

                  {/* Info prompt */}
                  <div className="text-center space-y-1 max-w-[280px]">
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                      {players[currentTurn]?.name}&apos;s Turn
                    </div>
                    <div className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${PLAYER_COLORS_BG[players[currentTurn]?.color]}`}>
                      {players[currentTurn]?.color}
                    </div>
                    {players[currentTurn]?.inJail && (
                      <div className="text-xs font-bold text-red-500 animate-pulse flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>IN JAIL ({players[currentTurn].jailTurns}/3)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase Actions */}
                <div className="space-y-2 select-none">
                  {phase === "roll" && (
                    <div className="flex gap-2">
                      {renderJailFineButton()}
                      <button
                        onClick={handleRollDice}
                        disabled={isRolling}
                        className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold rounded-2xl shadow-md cursor-pointer hover:opacity-95 active:scale-98 transition-all text-sm"
                      >
                        {isRolling ? "Rolling..." : "Roll Dice"}
                      </button>
                    </div>
                  )}

                  {phase === "action" && (
                    <div className="space-y-2">
                      {/* Check if property space and buyable */}
                      {["property", "railroad", "utility"].includes(SPACES[players[currentTurn].position].type) &&
                       properties[players[currentTurn].position.toString()]?.owner === null && (
                        <button
                          onClick={handleBuyProperty}
                          disabled={players[currentTurn].money < (SPACES[players[currentTurn].position].price || 0)}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md cursor-pointer active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Buy {SPACES[players[currentTurn].position].name} (${SPACES[players[currentTurn].position].price})
                        </button>
                      )}

                      <div className="flex gap-2">
                        {players[currentTurn].money < 0 && (
                          <button
                            onClick={handleDeclareBankruptcy}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Bankrupt
                          </button>
                        )}
                        <button
                          onClick={handleEndTurn}
                          disabled={players[currentTurn].money < 0}
                          className="flex-1 py-3.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-750 text-white font-extrabold rounded-2xl shadow-md cursor-pointer active:scale-95 transition-all text-sm disabled:opacity-50"
                        >
                          End Turn
                        </button>
                      </div>
                    </div>
                  )}

                  {phase === "finished" && (
                    <div className="text-center space-y-2">
                      <div className="text-sm font-bold text-emerald-500 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Winner Decided!</span>
                      </div>
                      <button
                        onClick={handleResetGame}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl cursor-pointer"
                      >
                        Back to Setup
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RENDER ALL 40 BOARD SPACES */}
              {SPACES.map((space, idx) => {
                const gridPos = getGridPosition(idx);
                const propState = properties[idx.toString()];
                
                // Color bar positions based on board section
                let colorBar = null;
                const spaceColor = space.color ? BOARD_COLOR_CLASSES[space.color] : "";
                if (spaceColor) {
                  if (idx > 0 && idx < 10) { // Bottom row -> Color bar at the top
                    colorBar = <div className={`w-full h-1.5 md:h-2.5 ${spaceColor}`} />;
                  } else if (idx > 10 && idx < 20) { // Left column -> Color bar on the right
                    colorBar = <div className={`h-full w-1.5 md:w-2.5 ${spaceColor} absolute right-0 top-0`} />;
                  } else if (idx > 20 && idx < 30) { // Top row -> Color bar at the bottom
                    colorBar = <div className={`w-full h-1.5 md:h-2.5 ${spaceColor} absolute bottom-0 left-0`} />;
                  } else if (idx > 30 && idx < 40) { // Right column -> Color bar on the left
                    colorBar = <div className={`h-full w-1.5 md:w-2.5 ${spaceColor} absolute left-0 top-0`} />;
                  }
                }

                // Collect tokens on this space
                const standingPlayers = players.filter(p => p.position === idx && !p.bankrupt);

                // Owner indicator outline/marker
                let ownerIndicator = null;
                if (propState && propState.owner) {
                  ownerIndicator = (
                    <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ${PLAYER_COLORS_BG[propState.owner]} border border-white`} />
                  );
                }

                // Check click handler to open property viewer modal
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
                    className={`border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-col justify-between items-center p-[2px] cursor-pointer hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors relative overflow-hidden select-none ${
                      [0, 10, 20, 30].includes(idx) ? "font-bold" : ""
                    }`}
                  >
                    {/* Top color stripe */}
                    {colorBar}

                    {/* Space Name */}
                    <div className={`text-[6px] md:text-[8px] leading-tight text-center font-bold break-words px-0.5 mt-1 text-zinc-700 dark:text-zinc-350 ${
                      [0, 10, 20, 30].includes(idx) ? "font-black" : ""
                    }`}>
                      {space.name}
                    </div>

                    {/* Price or custom icon */}
                    <div className="text-[5px] md:text-[7px] text-zinc-500 font-bold mb-1 select-none">
                      {space.price ? `$${space.price}` : ""}
                      {idx === 0 && <span className="text-red-500 font-bold">←</span>}
                    </div>

                    {/* Render players currently standing on this space */}
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
                              {p.name.substring(0, 1)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render property houses / mortgaged status */}
                    {propState && propState.houses > 0 && !propState.mortgaged && (
                      <div className="absolute top-1 left-1 flex gap-0.5 pointer-events-none">
                        {Array.from({ length: propState.houses }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              propState.houses === 5 ? "bg-red-650" : "bg-green-600"
                            }`} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Mortgage badge */}
                    {propState && propState.mortgaged && (
                      <div className="absolute top-0.5 left-0.5 px-0.5 bg-red-550 text-white text-[5px] font-black rounded pointer-events-none select-none">
                        M
                      </div>
                    )}

                    {/* Owner dot indicator */}
                    {ownerIndicator}
                  </div>
                );
              })}

            </div>
          </div>

          {/* Right panel: Game state dashboard & logs (columns 8 to 12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Players Panel */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500 animate-bounce" />
                <span>Players Assets</span>
              </h2>

              <div className="space-y-3">
                {players.map((p, idx) => (
                  <div
                    key={p.color}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      currentTurn === idx && phase !== "finished"
                        ? `${PLAYER_COLORS_BORDER[p.color]} bg-zinc-50 dark:bg-zinc-850/50 shadow-sm border-2`
                        : "border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900/20"
                    } ${p.bankrupt ? "opacity-45" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-2xl ${PLAYER_COLORS_BG[p.color]} flex items-center justify-center text-xs font-black`}>
                        {p.name.substring(0, 1)}
                      </span>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                          <span>{p.name}</span>
                          {p.bankrupt && <span className="text-[10px] text-red-550 font-black px-1.5 py-0.5 bg-red-500/10 rounded-full">Bankrupt</span>}
                        </div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-550">
                          Color: {p.color} • Pos: {p.position} ({SPACES[p.position].name})
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-zinc-900 dark:text-white">
                        ${p.money}
                      </div>
                      {currentTurn === idx && phase !== "finished" && (
                        <span className="text-[9px] font-extrabold text-amber-500 dark:text-amber-400 uppercase tracking-wider animate-pulse">
                          Active Turn
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Logs Panel */}
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span>Match Log</span>
              </h2>

              <div className="h-44 overflow-y-auto border border-zinc-150 dark:border-zinc-850/80 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-600 dark:text-zinc-350 space-y-2 select-text">
                {logs.map((log, i) => (
                  <div key={i} className="border-b border-zinc-100 dark:border-zinc-900 pb-1 last:border-b-0 leading-relaxed">
                    <span className="text-amber-550 font-bold select-none mr-1.5">&gt;</span>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PROPERTY VIEWER & MANAGEMENT MODAL */}
      {selectedSpaceIdx !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl relative animate-scale-up">
            
            {/* Header Color Group banner */}
            <div className={`p-4 rounded-2xl text-center space-y-1 relative ${
              SPACES[selectedSpaceIdx].color ? BOARD_COLOR_CLASSES[SPACES[selectedSpaceIdx].color || ""] : "bg-zinc-800"
            } text-white`}>
              <div className="text-xs uppercase tracking-widest opacity-80 font-extrabold">
                {SPACES[selectedSpaceIdx].type}
              </div>
              <h3 className="text-lg font-black">{SPACES[selectedSpaceIdx].name}</h3>
            </div>

            {/* Property Stats */}
            <div className="text-sm space-y-2 text-zinc-600 dark:text-zinc-350">
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
              {SPACES[selectedSpaceIdx].type === "property" && SPACES[selectedSpaceIdx].rent && (
                <div className="space-y-1 text-xs pt-1.5">
                  <div className="font-extrabold text-zinc-800 dark:text-zinc-250 mb-1">Rents list:</div>
                  <div className="flex justify-between"><span>Base:</span> <span>${SPACES[selectedSpaceIdx].rent?.[0]}</span></div>
                  <div className="flex justify-between"><span>1 House:</span> <span>${SPACES[selectedSpaceIdx].rent?.[1]}</span></div>
                  <div className="flex justify-between"><span>2 Houses:</span> <span>${SPACES[selectedSpaceIdx].rent?.[2]}</span></div>
                  <div className="flex justify-between"><span>3 Houses:</span> <span>${SPACES[selectedSpaceIdx].rent?.[3]}</span></div>
                  <div className="flex justify-between"><span>4 Houses:</span> <span>${SPACES[selectedSpaceIdx].rent?.[4]}</span></div>
                  <div className="flex justify-between text-amber-500 font-bold"><span>Hotel:</span> <span>${SPACES[selectedSpaceIdx].rent?.[5]}</span></div>
                </div>
              )}
              <div className="pt-2 text-xs border-t border-zinc-150 dark:border-zinc-800 mt-2 space-y-1">
                <div>Owner Color: <span className="font-bold text-zinc-900 dark:text-white">{properties[selectedSpaceIdx.toString()]?.owner || "Bank"}</span></div>
                <div>Mortgaged: <span className="font-bold text-zinc-900 dark:text-white">{properties[selectedSpaceIdx.toString()]?.mortgaged ? "Yes" : "No"}</span></div>
                <div>Houses/Hotels: <span className="font-bold text-zinc-900 dark:text-white">{properties[selectedSpaceIdx.toString()]?.houses || 0}</span></div>
              </div>
            </div>

            {/* Management Buttons for current turn owner */}
            {properties[selectedSpaceIdx.toString()]?.owner === players[currentTurn]?.color && !players[currentTurn]?.bankrupt && phase !== "finished" && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 dark:text-zinc-555">Asset Manager:</div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Buy houses */}
                  {SPACES[selectedSpaceIdx].type === "property" && (
                    <>
                      <button
                        onClick={() => handleBuildHouse(selectedSpaceIdx)}
                        disabled={properties[selectedSpaceIdx.toString()].houses >= 5 || properties[selectedSpaceIdx.toString()].mortgaged || players[currentTurn].money < (SPACES[selectedSpaceIdx].house_cost || 0)}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        Build House
                      </button>
                      <button
                        onClick={() => handleSellHouse(selectedSpaceIdx)}
                        disabled={properties[selectedSpaceIdx.toString()].houses <= 0}
                        className="py-2.5 bg-orange-500 hover:bg-orange-655 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        Sell House
                      </button>
                    </>
                  )}

                  {/* Mortgage */}
                  <button
                    onClick={() => handleToggleMortgage(selectedSpaceIdx)}
                    disabled={properties[selectedSpaceIdx.toString()].houses > 0}
                    className="col-span-2 py-2.5 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-750 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {properties[selectedSpaceIdx.toString()].mortgaged ? "Unmortgage (Pay +10%)" : "Mortgage Property"}
                  </button>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedSpaceIdx(null)}
              className="w-full py-3 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 font-bold rounded-2xl cursor-pointer text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CARD DRAW DIALOG */}
      {drawnCard !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center shadow-2xl relative animate-scale-up">
            <div className={`text-xs uppercase font-extrabold tracking-widest ${
              drawnCard.deck === "Chance" ? "text-orange-555" : "text-blue-550"
            }`}>
              {drawnCard.deck} Card Drawn!
            </div>
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-700 dark:text-zinc-250 font-bold">
              ?
            </div>
            <p className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 px-4 leading-relaxed">
              &ldquo;{drawnCard.text}&rdquo;
            </p>
            <button
              onClick={() => setDrawnCard(null)}
              className="w-full py-3 bg-zinc-800 dark:bg-zinc-750 hover:bg-zinc-700 text-white font-bold rounded-2xl cursor-pointer text-xs"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
