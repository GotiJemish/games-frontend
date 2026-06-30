"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 select-none outline-none active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "bg-gradient-to-r from-indigo-650 to-purple-650 hover:opacity-95 text-white shadow-md shadow-indigo-500/10 cursor-pointer border border-transparent",
    secondary: "bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700/60 text-zinc-200 cursor-pointer",
    outline: "bg-transparent border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-300 cursor-pointer",
    danger: "bg-gradient-to-r from-red-600 to-rose-650 hover:opacity-95 text-white shadow-md cursor-pointer border border-transparent",
    ghost: "bg-transparent hover:bg-zinc-900/60 text-zinc-450 hover:text-zinc-200 cursor-pointer"
  };

  const sizes = {
    sm: "px-3.5 py-2 text-[10px] tracking-wider uppercase rounded-xl",
    md: "px-4.5 py-3 text-xs rounded-xl",
    lg: "px-6 py-3.5 text-sm rounded-2xl"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
    </button>
  );
}
