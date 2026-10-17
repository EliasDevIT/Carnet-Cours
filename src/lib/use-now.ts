"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
};

// Arrondi à la demi-minute pour que l'instantané reste stable entre deux lectures.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** L'heure courante, rafraîchie toutes les 30 secondes. `serverNow` évite un écart à l'hydratation. */
export function useNow(serverNow?: string): Date | null {
  const ms = useSyncExternalStore(subscribe, getSnapshot, () => (serverNow ? Date.parse(serverNow) : null));
  return ms === null ? null : new Date(ms);
}
