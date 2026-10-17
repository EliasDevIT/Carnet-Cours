"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { capitalize, fmt, toLocalInput } from "@/lib/format";
import type { CourseSession } from "@/lib/types";

const hour = (iso: string) => fmt(iso, parseISO(iso).getMinutes() ? "H'h'mm" : "H'h'");

/** Prochaines séances d'une matière, chargées à chaque changement de matière. `null` pendant le chargement. */
function useCourseSessions(courseId: number | null) {
  const [loaded, setLoaded] = useState<{ courseId: number; sessions: CourseSession[] } | null>(null);
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    fetch(`/api/cours/${courseId}/seances`, { cache: "no-store" })
      .then((response) => response.json() as Promise<CourseSession[]>)
      .catch(() => [])
      .then((sessions) => {
        if (!cancelled) setLoaded({ courseId, sessions });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);
  return courseId && loaded?.courseId === courseId ? loaded.sessions : null;
}

/**
 * Propose les prochains cours de la matière choisie pour remplir une date en un clic.
 * - `day` : un choix par jour de cours (échéance d'un devoir) ; `value` au format yyyy-MM-dd.
 * - `slot` : un choix par créneau (date et heure d'un contrôle) ; `value` au format datetime-local.
 */
export function SessionPicker({
  courseId,
  mode,
  value,
  onPick,
}: {
  courseId: number | null;
  mode: "day" | "slot";
  value: string;
  onPick: (session: CourseSession) => void;
}) {
  const sessions = useCourseSessions(courseId);
  if (!courseId) return null;

  let choices: { key: string; value: string; label: string; detail: string; session: CourseSession }[] = [];
  if (sessions && mode === "day") {
    const days = Map.groupBy(sessions, (s) => format(parseISO(s.start), "yyyy-MM-dd"));
    choices = [...days].slice(0, 6).map(([day, list]) => ({
      key: day,
      value: day,
      label: capitalize(fmt(list[0].start, "EEE d MMM")),
      detail: `${hour(list[0].start)} – ${hour(list.at(-1)!.end)}`,
      session: list[0],
    }));
  } else if (sessions) {
    choices = sessions.slice(0, 8).map((s) => ({
      key: s.start,
      value: toLocalInput(s.start),
      label: capitalize(fmt(s.start, "EEE d MMM")),
      detail: `${hour(s.start)} – ${hour(s.end)}`,
      session: s,
    }));
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted">Prochains cours de cette matière</span>
      {sessions === null ? (
        <span className="text-sm text-muted">Recherche dans l&apos;emploi du temps…</span>
      ) : choices.length === 0 ? (
        <span className="text-sm text-muted">Aucun cours de cette matière à venir dans l&apos;emploi du temps.</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice, index) => {
            const selected = choice.value === value;
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => onPick(choice.session)}
                aria-pressed={selected}
                className={`rounded-lg border px-2.5 py-1.5 text-left leading-tight transition-colors ${
                  selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong hover:border-accent hover:bg-sunken"
                }`}
              >
                <span className="block text-[0.8rem] font-semibold">
                  {index === 0 ? `Prochain cours, ${choice.label.toLowerCase()}` : choice.label}
                </span>
                <span className={`block text-[0.7rem] ${selected ? "opacity-85" : "text-muted"}`}>
                  {choice.detail}
                  {mode === "slot" && choice.session.location && `, ${choice.session.location}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
