"use client";

import { useEffect } from "react";
import { autoSyncCalendars } from "@/app/actions";

/** Met à jour en arrière-plan les emplois du temps en ligne quand l'app s'ouvre. */
export function AutoSync() {
  useEffect(() => {
    autoSyncCalendars().catch(() => {});
  }, []);
  return null;
}
