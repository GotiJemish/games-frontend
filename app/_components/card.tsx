"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, LucideIcon } from "lucide-react";
import { Button } from "./button";

interface CardProps {
  name: string;
  description: string;
  route: string;
  color: string;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  shadow: string;
  badge: string;
  icon?: LucideIcon;
  buttonText?: string;
}

export function Card({
  name,
  description,
  route,
  color,
  accentColor,
  bgGradient,
  borderColor,
  shadow,
  badge,
  icon: IconComponent,
  buttonText = "Play Game"
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 backdrop-blur-md border ${borderColor} rounded-3xl p-8 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between shadow-lg ${shadow}`}
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${bgGradient} ${accentColor}`}>
            <Sparkles className="w-3.5 h-3.5" />
            {badge}
          </span>
          {IconComponent && <IconComponent className={`w-8 h-8 ${accentColor}`} />}
        </div>

        <h2 className="text-2xl font-extrabold mb-3 text-zinc-900 dark:text-white">
          {name}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-8">
          {description}
        </p>
      </div>

      <Link href={route} className="block">
        <Button
          variant="primary"
          className={`w-full bg-gradient-to-r ${color} hover:opacity-95 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 group`}
        >
          <span>{buttonText}</span>
        </Button>
      </Link>
    </div>
  );
}
