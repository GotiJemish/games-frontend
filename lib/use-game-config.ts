"use client";

import { useState, useEffect, useRef } from "react";
import api from "./axios";

// In-memory cache shared across all components using this hook.
// Avoids re-fetching config on every page navigation.
const configCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60_000; // 1 minute cache

export function clearGameConfigCache() {
  for (const key in configCache) {
    delete configCache[key];
  }
}

export function useGameConfig(gameId?: string) {
  const [config, setConfig] = useState<any>(() => {
    // Initialize from cache if available
    const key = gameId || "__all__";
    const cached = configCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    const key = gameId || "__all__";
    const cached = configCache[key];
    return !(cached && Date.now() - cached.timestamp < CACHE_TTL);
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const key = gameId || "__all__";
    const cached = configCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setConfig(cached.data);
      setLoading(false);
      return;
    }

    const url = gameId ? `/admin/configs/${gameId}` : "/admin/configs";
    api.get(url)
      .then(res => {
        configCache[key] = { data: res.data, timestamp: Date.now() };
        setConfig(res.data);
      })
      .catch(err => console.error(`Failed to load config for ${key}:`, err))
      .finally(() => setLoading(false));
  }, [gameId]);

  return { config, loading };
}
