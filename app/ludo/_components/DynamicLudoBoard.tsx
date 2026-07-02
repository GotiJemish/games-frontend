"use client";

import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { useTheme } from "@/lib/use-theme";
import PlayerToken from "@/app/_components/PlayerToken";

interface DynamicLudoBoardProps {
  numPlayers: number;
  numPawns: number;
  activeColors: string[];
  boardState: Record<string, number[]>;
  onTokenClick: (color: string, tokenIdx: number) => void;
  currentTurn: string | null;
  pawnTheme?: string;
}

const HSLToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return parseInt(`0x${f(0)}${f(8)}${f(4)}`);
};

const getPixiColor = (color: string) => {
    if (color === "RED") return 0xef4444;
    if (color === "GREEN") return 0x10b981;
    if (color === "YELLOW") return 0xf59e0b;
    if (color === "BLUE") return 0x3b82f6;
    
    if (color.startsWith("COLOR_")) {
        const num = parseInt(color.replace("COLOR_", ""), 10);
        // Golden angle to distribute hues evenly across 360 degrees
        const hue = (num * 137.5) % 360;
        return HSLToHex(hue, 70, 50);
    }

    let hash = 0;
    for (let i = 0; i < color.length; i++) hash = color.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return HSLToHex(hue, 70, 50);
};

export function DynamicLudoBoard({
  numPlayers,
  numPawns,
  activeColors,
  boardState,
  onTokenClick,
  currentTurn,
  pawnTheme = "CuteBoyCookie"
}: DynamicLudoBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const { theme } = useTheme();
  
  const [tokensData, setTokensData] = useState<{color: string, tx: number, ty: number, idx: number, isTurn: boolean, tokenHex: string}[]>([]);

  const CANVAS_SIZE = 800; 
  const isDark = theme === "dark";

  // Re-run setup whenever props change
  useEffect(() => {
    let isMounted = true;
    
    const initPixi = async () => {
      if (!containerRef.current) return;

      // If app exists, we can reuse it, or we destroy and recreate. 
      // For simplicity and to ensure clean state with changing N, we recreate or just clear stage.
      if (!appRef.current) {
        const app = new PIXI.Application();
        await app.init({
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!isMounted) {
          app.destroy(true, { children: true });
          return;
        }

        appRef.current = app;
        containerRef.current.appendChild(app.canvas);
      }

      const app = appRef.current;
      app.stage.removeChildren();

      const cx = CANVAS_SIZE / 2;
      const cy = CANVAS_SIZE / 2;
      const mathN = Math.max(3, numPlayers);
      const A = (2 * Math.PI) / mathN;
      const base_angle = -Math.PI / 2; 

      const R_out = 300;
      const R_in = 70;
      const yardHeight = 60;
      const R_yard = R_out + yardHeight;

      // Colors
      const trackLineColor = isDark ? 0x3f3f46 : 0xe4e4e7;
      const trackBgColor = isDark ? 0x27272a : 0xffffff;
      const safeColor = isDark ? 0x3f3f46 : 0xf4f4f5;

      // Helpers
      const getCellCenter = (col: number, row: number, sectorIdx: number) => {
          const a1 = base_angle + sectorIdx * A - A/2;
          const a_start = a1 + col * (A/3);
          const a_end = a1 + (col+1) * (A/3);
          const a_mid = (a_start + a_end) / 2;
          
          const r_start = R_in + row * (R_out - R_in) / 6;
          const r_end = R_in + (row + 1) * (R_out - R_in) / 6;
          const r_mid = (r_start + r_end) / 2;
          
          return { x: cx + r_mid * Math.cos(a_mid), y: cy + r_mid * Math.sin(a_mid) };
      };

      // Draw Center Polygon
      const centerPoly = new PIXI.Graphics();
      const centerPoints: number[] = [];
      for(let i=0; i<numPlayers; i++) {
         const a = base_angle + i * A - A/2;
         centerPoints.push(cx + R_in * Math.cos(a), cy + R_in * Math.sin(a));
      }
      centerPoly.poly(centerPoints);
      centerPoly.fill(isDark ? 0x18181b : 0xf4f4f5);
      centerPoly.stroke({ width: 2, color: trackLineColor });
      app.stage.addChild(centerPoly);

      // Draw Sectors
      for (let i = 0; i < numPlayers; i++) {
        const sectorColorHex = getPixiColor(activeColors[i] || `COLOR_${i}`);
        const a1 = base_angle + i * A - A/2;
        const a2 = base_angle + i * A + A/2;

        // Draw Yard
        const y1 = { x: cx + R_out * Math.cos(a1), y: cy + R_out * Math.sin(a1) };
        const y2 = { x: cx + R_yard * Math.cos(a1 + A/10), y: cy + R_yard * Math.sin(a1 + A/10) };
        const y3 = { x: cx + R_yard * Math.cos(a2 - A/10), y: cy + R_yard * Math.sin(a2 - A/10) };
        const y4 = { x: cx + R_out * Math.cos(a2), y: cy + R_out * Math.sin(a2) };
        
        const yard = new PIXI.Graphics();
        yard.poly([y1.x, y1.y, y2.x, y2.y, y3.x, y3.y, y4.x, y4.y]);
        yard.fill({ color: sectorColorHex, alpha: 0.15 });
        yard.stroke({ width: 3, color: sectorColorHex, alpha: 0.8 });
        app.stage.addChild(yard);

        // Draw 3x6 Grid for Sector
        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 6; row++) {
            const a_start = a1 + col * (A/3);
            const a_end = a1 + (col+1) * (A/3);
            const r_start = R_in + row * (R_out - R_in) / 6;
            const r_end = R_in + (row + 1) * (R_out - R_in) / 6;

            const v1 = { x: cx + r_start * Math.cos(a_start), y: cy + r_start * Math.sin(a_start) };
            const v2 = { x: cx + r_end * Math.cos(a_start), y: cy + r_end * Math.sin(a_start) };
            const v3 = { x: cx + r_end * Math.cos(a_end), y: cy + r_end * Math.sin(a_end) };
            const v4 = { x: cx + r_start * Math.cos(a_end), y: cy + r_start * Math.sin(a_end) };

            const cell = new PIXI.Graphics();
            cell.poly([v1.x, v1.y, v2.x, v2.y, v3.x, v3.y, v4.x, v4.y]);
            
            // Determine Cell Color
            let fillAlpha = 1;
            let cColor = trackBgColor;

            // Is Home path?
            if (col === 1 && row < 5) {
              cColor = sectorColorHex;
              fillAlpha = 0.3;
            } 
            // Is Start cell? (Inner-most left cell based on bot.py)
            else if (col === 0 && row === 0) {
              cColor = sectorColorHex;
              fillAlpha = 0.6;
            }
            // Is Safe Star? (8 steps from start -> col 2, row 4)
            else if (col === 2 && row === 4) {
              cColor = safeColor;
            }

            cell.fill({ color: cColor, alpha: fillAlpha });
            cell.stroke({ width: 1, color: trackLineColor });
            app.stage.addChild(cell);
          }
        }
      }

      // Collect Tokens Data for React Overlay
      const trackSize = numPlayers * 13;
      const tData: any[] = [];
      
      const processToken = (color: string, tx: number, ty: number, tIdx: number) => {
          const isTurn = currentTurn === color;
          const tokenHex = getPixiColor(color);
          tData.push({ color, tx, ty, idx: tIdx, isTurn, tokenHex });
      };

      activeColors.forEach((color) => {
        const tokens = boardState[color] || [];
        tokens.forEach((pos, idx) => {
           let tx = cx, ty = cy;
           const sectorIdx = activeColors.indexOf(color);

           if (pos === -1) {
              // In Yard
              const a = base_angle + sectorIdx * A;
              const r = R_out + yardHeight / 2;
              const yx = cx + r * Math.cos(a);
              const yy = cy + r * Math.sin(a);
              
              // Arrange in a small circle around yard center
              const angle = idx * (2 * Math.PI / numPawns);
              const radius = 16;
              tx = yx + Math.sin(angle) * radius;
              ty = yy - Math.cos(angle) * radius;
           } 
           else if (pos === trackSize + 5 || pos === 56) {
              // Reached Home - just don't render or render in center
              return; 
           }
           else if (pos >= trackSize) {
              // Home path
              const step = pos - trackSize; // 0 to 4
              const center = getCellCenter(1, 4 - step, sectorIdx);
              tx = center.x;
              ty = center.y;
           }
           else {
              // Common Track
              const ownerSector = Math.floor(pos / 13);
              const cellIdx = pos % 13;
              
              let col = 0, row = 0;
              if (cellIdx <= 5) {
                 col = 0; row = cellIdx;
              } else if (cellIdx === 6) {
                 col = 1; row = 5;
              } else {
                 col = 2; row = 12 - cellIdx;
              }
              
              const center = getCellCenter(col, row, ownerSector);
              tx = center.x;
              ty = center.y;

              // Offset if shared?
              let sharedCount = 0;
              let myIdx = 0;
              activeColors.forEach(c => {
                 (boardState[c] || []).forEach((p, i) => {
                    if (p === pos) {
                       if (c === color && i === idx) myIdx = sharedCount;
                       sharedCount++;
                    }
                 });
              });

              if (sharedCount > 1) {
                 const angle = myIdx * (2 * Math.PI / sharedCount);
                 tx += Math.sin(angle) * 5;
                 ty -= Math.cos(angle) * 5;
              }
           }

           processToken(color, tx, ty, idx);
        });
      });
      setTokensData(tData);
    };

    initPixi();

    return () => {
      isMounted = false;
      // We don't necessarily destroy app on unmount to prevent canvas flickering,
      // but if we do, we need to handle it. 
      // For Next.js strict mode, it's safer to destroy.
      if (appRef.current) {
         appRef.current.destroy(true, { children: true });
         appRef.current = null;
      }
    };
  }, [numPlayers, numPawns, activeColors, boardState, currentTurn, theme]);

  return (
    <div className="w-full max-w-3xl aspect-square bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-2 flex items-center justify-center relative overflow-hidden">
       {/* Pixi Canvas injects here */}
       <div 
         ref={containerRef} 
         className="w-full h-full flex items-center justify-center [&>canvas]:max-w-full [&>canvas]:max-h-full [&>canvas]:object-contain"
       />
       {/* React SVG Tokens Overlay */}
       <div className="absolute inset-0 pointer-events-none w-full h-full flex items-center justify-center">
         <div style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, position: 'relative' }} className="max-w-full max-h-full aspect-square">
            {tokensData.map((t, i) => (
              <div 
                key={`${t.color}-${t.idx}-${i}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform ${t.isTurn ? 'z-10 scale-125 cursor-pointer animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'z-0 scale-100 cursor-default'}`}
                style={{ left: `${(t.tx / CANVAS_SIZE) * 100}%`, top: `${(t.ty / CANVAS_SIZE) * 100}%`, width: '40px', height: '40px' }}
                onClick={() => { if (t.isTurn) onTokenClick(t.color, t.idx); }}
              >
                <PlayerToken theme={pawnTheme} color={`#${t.tokenHex.toString(16).padStart(6, '0')}`} size="100%" />
              </div>
            ))}
         </div>
       </div>
    </div>
  );
}
