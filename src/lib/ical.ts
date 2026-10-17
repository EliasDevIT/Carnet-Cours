import ical, { type ParameterValue, type VEvent } from "node-ical";
import { all, get, run, transaction } from "./db";
import { normalize } from "./format";
import type { CalendarSource, Course, Trimester } from "./types";

const SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const text = (value: ParameterValue | undefined) =>
  (typeof value === "string" ? value : (value?.val ?? "")).trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Associe un intitulé de séance à une matière : nom de la matière ou mots-clés,
 * en mot entier, sans accents. Si plusieurs trimestres ont la même matière,
 * on garde celle dont le trimestre contient la date.
 */
function buildMatcher() {
  const courses = all<Course>("SELECT * FROM courses");
  const trimesters = new Map(all<Trimester>("SELECT * FROM trimesters").map((t) => [t.id, t]));

  const entries = courses
    .flatMap((course) =>
      [course.name, course.short_name, ...course.keywords.split(",")]
        .map(normalize)
        .filter((keyword) => keyword.length >= 2)
        .map((keyword) => ({
          keyword,
          course,
          pattern: new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`),
        })),
    )
    .sort((a, b) => b.keyword.length - a.keyword.length);

  return (summary: string, startIso: string): number | null => {
    const haystack = normalize(summary);
    const matches = entries.filter((entry) => entry.pattern.test(haystack));
    if (!matches.length) return null;
    const day = startIso.slice(0, 10);
    const inTrimester = matches.find((m) => {
      const t = trimesters.get(m.course.trimester_id);
      return t && t.start_date <= day && day <= t.end_date;
    });
    return (inTrimester ?? matches[0]).course.id;
  };
}

export function rematchEvents() {
  const match = buildMatcher();
  const events = all<{ id: number; summary: string; start: string }>("SELECT id, summary, start FROM events");
  transaction(() => {
    for (const event of events) run("UPDATE events SET course_id = ? WHERE id = ?", match(event.summary, event.start), event.id);
  });
}

/** Remplace toutes les séances d'une source par celles du fichier .ics. Renvoie le nombre de séances. */
export function importIcs(sourceId: number, body: string) {
  const parsed = ical.sync.parseICS(body);
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  const to = new Date();
  to.setMonth(to.getMonth() + 18);

  const rows: { uid: string; summary: string; location: string; description: string; start: string; end: string; allDay: boolean }[] = [];
  // Certains ENT publient deux fois la même séance (deux groupes, double inscription) : on n'en garde qu'une.
  const seen = new Set<string>();
  for (const component of Object.values(parsed)) {
    if (!component || typeof component !== "object" || !("type" in component) || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    // Les occurrences modifiées (RECURRENCE-ID) sont appliquées par l'expansion de l'événement parent.
    if (event.recurrenceid) continue;
    for (const instance of ical.expandRecurringEvent(event, { from, to })) {
      const start = instance.start;
      const end = instance.end ?? start;
      const summary = text(instance.summary) || "Sans titre";
      const key = `${summary}|${start.toISOString()}|${end.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        uid: event.uid ?? `${summary}-${start.toISOString()}`,
        summary,
        location: text(instance.event.location),
        description: text(instance.event.description),
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: instance.isFullDay,
      });
    }
  }

  const match = buildMatcher();
  transaction(() => {
    run("DELETE FROM events WHERE source_id = ?", sourceId);
    for (const row of rows) {
      run(
        `INSERT INTO events (source_id, uid, summary, location, description, start, end, all_day, course_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sourceId,
        row.uid,
        row.summary,
        row.location,
        row.description,
        row.start,
        row.end,
        row.allDay ? 1 : 0,
        match(row.summary, row.start),
      );
    }
    run("UPDATE calendar_sources SET last_sync = ?, last_error = NULL WHERE id = ?", new Date().toISOString(), sourceId);
  });
  return rows.length;
}

export async function syncSource(sourceId: number) {
  const source = get<CalendarSource>("SELECT * FROM calendar_sources WHERE id = ?", sourceId);
  if (!source?.url) return 0;
  try {
    const url = source.url.trim().replace(/^webcal:\/\//i, "https://");
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!response.ok) throw new Error(`Le serveur a répondu ${response.status}`);
    const body = await response.text();
    if (!body.includes("BEGIN:VCALENDAR")) throw new Error("Ce lien ne renvoie pas un calendrier .ics");
    return importIcs(sourceId, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    run("UPDATE calendar_sources SET last_error = ? WHERE id = ?", message, sourceId);
    throw new Error(message);
  }
}

/** Synchronise les sources en ligne qui n'ont pas été mises à jour depuis 6 heures. */
export async function syncStaleSources() {
  const limit = new Date(Date.now() - SYNC_MAX_AGE_MS).toISOString();
  const stale = all<CalendarSource>(
    "SELECT * FROM calendar_sources WHERE url IS NOT NULL AND (last_sync IS NULL OR last_sync < ?)",
    limit,
  );
  let synced = 0;
  for (const source of stale) {
    try {
      await syncSource(source.id);
      synced++;
    } catch {
      // L'erreur est enregistrée sur la source et affichée dans l'agenda.
    }
  }
  return synced;
}
