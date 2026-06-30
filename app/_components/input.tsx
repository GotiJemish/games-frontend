"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  className = "",
  label,
  error,
  leftIcon,
  rightIcon,
  id,
  type = "text",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-[10px] font-bold uppercase tracking-wider text-zinc-450"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-zinc-550">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          type={type}
          className={`w-full bg-zinc-950 border text-xs text-white rounded-xl py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200
            ${leftIcon ? "pl-10" : "pl-4"}
            ${rightIcon ? "pr-10" : "pr-4"}
            ${error ? "border-red-500/50 hover:border-red-500 focus:ring-red-500/30" : "border-zinc-850 hover:border-zinc-800"}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center justify-center pointer-events-none text-zinc-550">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <span className="text-[10px] font-semibold text-red-400 mt-1 pl-1 flex items-center gap-1.5 animate-pulse">
          {error}
        </span>
      )}
    </div>
  );
}
