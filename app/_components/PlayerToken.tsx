"use client";

import React from "react";

// Helper to check if a color is a valid hex, if not fallback to red for shading
const isHex = (color: any) => typeof color === 'string' && color.startsWith("#");

// 1. CuteBoyCookie (Gingerbread Boy)
export function CuteBoyCookie({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-lg transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="url(#cookieBg)" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>
      <circle cx="50" cy="50" r="40" fill="#d97706" />
      <path d="M50 20C40 20 35 28 35 35C35 45 42 45 42 55C32 55 25 60 25 70C25 78 35 80 40 75C45 70 45 80 50 80C55 80 55 70 60 75C65 80 75 78 75 70C75 60 68 55 58 55C58 45 65 45 65 35C65 28 60 20 50 20Z" fill="#f59e0b" stroke="#b45309" strokeWidth="3" strokeLinejoin="round"/>
      {/* Icing */}
      <path d="M35 70 Q 40 65 45 70 M55 70 Q 60 65 65 70 M35 35 Q 40 30 45 35 M55 35 Q 60 30 65 35" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
      {/* Eyes */}
      <circle cx="43" cy="35" r="4" fill="#451a03"/>
      <circle cx="57" cy="35" r="4" fill="#451a03"/>
      {/* Smile */}
      <path d="M44 42 Q50 48 56 42" stroke="#451a03" strokeWidth="3" strokeLinecap="round"/>
      {/* Buttons */}
      <circle cx="50" cy="52" r="4" fill={c} stroke="white" strokeWidth="2"/>
      <circle cx="50" cy="65" r="4" fill={c} stroke="white" strokeWidth="2"/>
      <defs>
        <radialGradient id="cookieBg" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef3c7" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// 2. CyberRobotToken
export function CyberRobotToken({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#3b82f6";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="70" height="70" rx="15" fill="url(#botMetal)" stroke="#334155" strokeWidth="4"/>
      {/* Screen */}
      <rect x="25" y="30" width="50" height="30" rx="6" fill="#0f172a" stroke={c} strokeWidth="2"/>
      {/* Eyes */}
      <rect x="30" y="38" width="12" height="12" rx="3" fill={c} className="animate-pulse"/>
      <rect x="58" y="38" width="12" height="12" rx="3" fill={c} className="animate-pulse"/>
      {/* Antenna */}
      <rect x="47" y="0" width="6" height="15" fill="#64748b"/>
      <circle cx="50" cy="5" r="5" fill={c}/>
      {/* Bolts */}
      <circle cx="25" cy="25" r="2" fill="#94a3b8"/>
      <circle cx="75" cy="25" r="2" fill="#94a3b8"/>
      <circle cx="25" cy="75" r="2" fill="#94a3b8"/>
      <circle cx="75" cy="75" r="2" fill="#94a3b8"/>
      <defs>
        <linearGradient id="botMetal" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 3. WoodlandFoxToken
export function WoodlandFoxToken({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#ea580c";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-md transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <polygon points="20,50 15,10 45,35" fill={c} stroke="#431407" strokeWidth="2" strokeLinejoin="round"/>
      <polygon points="80,50 85,10 55,35" fill={c} stroke="#431407" strokeWidth="2" strokeLinejoin="round"/>
      {/* Ear Inner */}
      <polygon points="23,45 19,18 40,35" fill="#fef08a" />
      <polygon points="77,45 81,18 60,35" fill="#fef08a" />
      {/* Face Base */}
      <polygon points="10,45 90,45 50,95" fill={c} stroke="#431407" strokeWidth="3" strokeLinejoin="round"/>
      {/* Face White */}
      <polygon points="12,47 50,60 50,92" fill="#fff" />
      <polygon points="88,47 50,60 50,92" fill="#fff" />
      {/* Nose */}
      <circle cx="50" cy="92" r="5" fill="#171717"/>
      {/* Eyes */}
      <path d="M 30 55 Q 35 50 40 55" stroke="#171717" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M 60 55 Q 65 50 70 55" stroke="#171717" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// 4. CosmicAstronautToken
export function CosmicAstronautToken({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#a855f7";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-lg transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2"/>
      <circle cx="50" cy="50" r="42" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="4"/>
      {/* Visor */}
      <rect x="20" y="30" width="60" height="40" rx="20" fill="url(#visorGrad)" stroke="#334155" strokeWidth="4"/>
      {/* Visor Reflection */}
      <path d="M 30 40 Q 50 30 70 40 Q 60 45 40 45 Z" fill="rgba(255,255,255,0.4)"/>
      {/* Accents */}
      <circle cx="30" cy="80" r="4" fill={c}/>
      <circle cx="45" cy="80" r="4" fill={c}/>
      <circle cx="70" cy="80" r="6" fill="#ef4444"/>
      <path d="M 15 50 L 5 50 M 95 50 L 85 50" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round"/>
      <defs>
        <linearGradient id="visorGrad" x1="20" y1="30" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 5. CuteSakuraBunny
export function CuteSakuraBunny({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#f472b6";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-md transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <ellipse cx="35" cy="30" rx="12" ry="30" fill="white" stroke="#e2e8f0" strokeWidth="2" transform="rotate(-15 35 30)"/>
      <ellipse cx="65" cy="30" rx="12" ry="30" fill="white" stroke="#e2e8f0" strokeWidth="2" transform="rotate(15 65 30)"/>
      <ellipse cx="35" cy="30" rx="6" ry="20" fill={c} transform="rotate(-15 35 30)"/>
      <ellipse cx="65" cy="30" rx="6" ry="20" fill={c} transform="rotate(15 65 30)"/>
      {/* Head */}
      <ellipse cx="50" cy="65" rx="35" ry="28" fill="white" stroke="#e2e8f0" strokeWidth="3"/>
      {/* Eyes */}
      <circle cx="38" cy="60" r="4" fill="#0f172a"/>
      <circle cx="62" cy="60" r="4" fill="#0f172a"/>
      {/* Cheeks */}
      <ellipse cx="28" cy="68" rx="6" ry="4" fill={c} opacity="0.6"/>
      <ellipse cx="72" cy="68" rx="6" ry="4" fill={c} opacity="0.6"/>
      {/* Mouth */}
      <path d="M 45 68 Q 50 72 55 68" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// 6. SweetCupcakeToken
export function SweetCupcakeToken({ color, size = "100%", style }: any) {
  const c = isHex(color) ? color : "#8b5cf6";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} className="drop-shadow-xl transition-transform hover:scale-110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wrapper */}
      <polygon points="30,95 70,95 80,50 20,50" fill={c} stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M 30 50 L 35 95 M 40 50 L 43 95 M 50 50 L 50 95 M 60 50 L 57 95 M 70 50 L 65 95" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
      {/* Frosting Base */}
      <path d="M 15 55 C 15 25 35 25 50 20 C 65 25 85 25 85 55 Q 85 65 75 60 Q 65 65 50 60 Q 35 65 25 60 Q 15 65 15 55 Z" fill="url(#frostingGrad)"/>
      <path d="M 15 55 C 15 25 35 25 50 20 C 65 25 85 25 85 55 Q 85 65 75 60 Q 65 65 50 60 Q 35 65 25 60 Q 15 65 15 55 Z" stroke="rgba(0,0,0,0.1)" strokeWidth="3"/>
      {/* Sprinkles */}
      <rect x="30" y="35" width="6" height="3" rx="1.5" fill="#ef4444" transform="rotate(15 30 35)"/>
      <rect x="60" y="30" width="6" height="3" rx="1.5" fill="#3b82f6" transform="rotate(-30 60 30)"/>
      <rect x="45" y="45" width="6" height="3" rx="1.5" fill="#eab308" transform="rotate(45 45 45)"/>
      <rect x="70" y="45" width="6" height="3" rx="1.5" fill="#22c55e" transform="rotate(-15 70 45)"/>
      <rect x="25" y="50" width="6" height="3" rx="1.5" fill="#f43f5e" transform="rotate(75 25 50)"/>
      {/* Cherry */}
      <circle cx="50" cy="18" r="8" fill="#dc2626" stroke="#991b1b" strokeWidth="2"/>
      <path d="M 50 10 Q 55 0 65 5" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <defs>
        <linearGradient id="frostingGrad" x1="15" y1="20" x2="85" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdf4ff" />
          <stop offset="1" stopColor="#fbcfe8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Router Component
export default function PlayerToken({ theme = "CuteBoyCookie", color, size = "100%", style }: any) {
  switch (theme) {
    case "CyberRobotToken":
      return <CyberRobotToken color={color} size={size} style={style} />;
    case "WoodlandFoxToken":
      return <WoodlandFoxToken color={color} size={size} style={style} />;
    case "CosmicAstronautToken":
      return <CosmicAstronautToken color={color} size={size} style={style} />;
    case "CuteSakuraBunny":
      return <CuteSakuraBunny color={color} size={size} style={style} />;
    case "SweetCupcakeToken":
      return <SweetCupcakeToken color={color} size={size} style={style} />;
    case "CuteBoyCookie":
    default:
      return <CuteBoyCookie color={color} size={size} style={style} />;
  }
}
