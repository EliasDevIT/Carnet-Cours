"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { differenceInMinutes, format, isSameDay, parseISO } from "date-fns";
import { AgendaItemDialog } from "@/components/agenda-item-dialog";
import type { CourseOption } from "@/components/ui";
import { NEUTRAL_COLOR, tint } from "@/lib/colors";
import { capitalize } from "@/lib/format";
import type { AgendaItem, Evaluation } from "@/lib/types";
import { useNow } from "@/lib/use-now";

const hourLabel = (date: Date) => format(date, date.getMinutes() ? "H'h'mm" : "H'h'");

function untilLabel(minutes: number) {
  if (minutes < 1) return "maintenant";
  if (minutes < 60) return `dans ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `dans ${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * La journée sous forme de ruban horaire : chaque séance à sa place, à la couleur de sa matière,
 * avec le curseur « maintenant ». Si la journée est finie, on montre le prochain jour de cours.
 */
export function DayHero({
  serverNow,
  dayLabel,
  items,
  courses,
  evaluations,
  hasSources,
}: {
  serverNow: string;
  dayLabel: string;
  items: AgendaItem[];
  courses: CourseOption[];
  evaluations: Evaluation[];
  hasSources: boolean;
}) {
  const now = useNow(serverNow) ?? parseISO(serverNow);
  const [selected, setSelected] = useState<AgendaItem | null>(null);

  const timed = items.filter((i) => !i.allDay);
  const day = timed[0] ? parseISO(timed[0].start) : now;
  const isTodayShown = isSameDay(day, now);

  const current = timed.find((i) => parseISO(i.start) <= now && now < parseISO(i.end));
  const upcoming = timed.find((i) => parseISO(i.start) > now);

  // Bornes du ruban : au moins 8h–18h, élargies si besoin.
  let first = 8;
  let last = 18;
  for (const i of timed) {
    first = Math.min(first, parseISO(i.start).getHours());
    const end = parseISO(i.end);
    last = Math.max(last, end.getHours() + (end.getMinutes() ? 1 : 0));
  }
  const span = (last - first) * 60;
  const pos = (date: Date) => Math.min(100, Math.max(0, (((date.getHours() - first) * 60 + date.getMinutes()) / span) * 100));
  const nowVisible = isTodayShown && now.getHours() >= first && now.getHours() < last;

  const label = (i: AgendaItem) => (i.type === "evaluation" ? i.title : (i.courseName ?? i.title));

  let headline: React.ReactNode;
  let detail: string | null = null;
  if (!hasSources && timed.length === 0) {
    headline = "Ta journée s'affichera ici.";
    detail = null;
  } else if (current) {
    headline = (
      <>
        En ce moment, <Highlight color={current.color}>{label(current)}</Highlight>
      </>
    );
    detail = `Jusqu'à ${hourLabel(parseISO(current.end))}${current.location ? `, ${current.location}` : ""}${
      upcoming ? `. Ensuite ${label(upcoming)} à ${hourLabel(parseISO(upcoming.start))}.` : ". C'est le dernier cours."
    }`;
  } else if (upcoming) {
    const start = parseISO(upcoming.start);
    headline = (
      <>
        {isTodayShown ? "Prochain" : `${capitalize(dayLabel)}, premier cours`} :{" "}
        <Highlight color={upcoming.color}>{label(upcoming)}</Highlight> à {hourLabel(start)}
      </>
    );
    detail = [upcoming.location, isTodayShown ? untilLabel(differenceInMinutes(start, now)) : null].filter(Boolean).join(", ");
  } else if (timed.length) {
    headline = "Journée terminée.";
    detail = "Plus aucun cours aujourd'hui.";
  } else {
    headline = "Aucun cours cette semaine.";
    detail = "Profite, ou avance le kanban.";
  }

  return (
    <section className="panel relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-muted">{isTodayShown ? "Aujourd'hui" : capitalize(dayLabel)}</p>
          <h2 className="display text-[1.65rem] font-bold leading-[1.15] sm:text-[2.2rem]">{headline}</h2>
          {detail && <p className="mt-2 text-[0.95rem] text-ink-soft">{detail}</p>}
        </div>
        {!hasSources && (
          <Link href="/agenda" className="btn btn-primary">
            Importer mon emploi du temps
          </Link>
        )}
      </div>

      {timed.length > 0 && (
        <>
          {/* Ruban horizontal (écrans moyens et grands) */}
          <div className="mt-8 hidden sm:block">
            <div className="relative h-[4.5rem] rounded-xl bg-sunken">
              {timed.map((item) => {
                const s = parseISO(item.start);
                const e = parseISO(item.end);
                const past = isTodayShown && e <= now;
                const color = item.color ?? NEUTRAL_COLOR;
                const isEval = item.type === "evaluation";
                return (
                  <button
                    key={item.key}
                    onClick={() => setSelected(item)}
                    className="absolute inset-y-1.5 overflow-hidden rounded-lg px-2.5 py-1.5 text-left transition-opacity hover:brightness-95"
                    style={{
                      left: `calc(${pos(s)}% + 2px)`,
                      width: `calc(${pos(e) - pos(s)}% - 4px)`,
                      background: isEval ? color : tint(color, past ? 10 : 26),
                      color: isEval ? "#fff" : "var(--ink)",
                      borderLeft: `3px solid ${color}`,
                      opacity: past ? 0.55 : 1,
                    }}
                    title={`${label(item)}, ${format(s, "HH:mm")} – ${format(e, "HH:mm")}`}
                  >
                    <span className="flex items-center gap-1 truncate text-[0.8rem] font-semibold leading-tight">
                      {isEval && <GraduationCap size={13} className="shrink-0" />}
                      {label(item)}
                    </span>
                    <span className="block truncate text-[0.72rem] leading-tight opacity-75">
                      {format(s, "HH:mm")}
                      {item.location && `, ${item.location}`}
                    </span>
                  </button>
                );
              })}
              {nowVisible && (
                <div className="pointer-events-none absolute -inset-y-1.5 z-10 w-0" style={{ left: `${pos(now)}%` }}>
                  <span className="absolute inset-y-0 -left-px w-0.5 rounded-full bg-accent" />
                  <span className="now-dot absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                </div>
              )}
            </div>
            <div className="relative mt-1.5 h-4 text-[0.7rem] text-muted">
              {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h - first) / (last - first)) * 100}%` }}>
                  {h}h
                </span>
              ))}
            </div>
          </div>

          {/* Liste verticale sur téléphone */}
          <ol className="mt-6 grid gap-2 sm:hidden">
            {timed.map((item) => {
              const s = parseISO(item.start);
              const e = parseISO(item.end);
              const past = isTodayShown && e <= now;
              const isCurrent = current?.key === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => setSelected(item)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left"
                    style={{ background: isCurrent ? tint(item.color, 18) : undefined, opacity: past ? 0.55 : 1 }}
                  >
                    <span className="w-12 shrink-0 text-sm font-semibold">{format(s, "HH:mm")}</span>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: item.color ?? NEUTRAL_COLOR }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{label(item)}</span>
                      <span className="block truncate text-xs text-muted">
                        jusqu&apos;à {format(e, "HH:mm")}
                        {item.location && `, ${item.location}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <AgendaItemDialog
        item={selected}
        courses={courses}
        evaluation={selected?.type === "evaluation" ? evaluations.find((e) => e.id === selected.id) : undefined}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function Highlight({ color, children }: { color: string | null; children: React.ReactNode }) {
  return (
    <span
      className="box-decoration-clone px-0.5"
      style={{ backgroundImage: `linear-gradient(transparent 60%, ${tint(color, 42)} 60%, ${tint(color, 42)} 94%, transparent 94%)` }}
    >
      {children}
    </span>
  );
}
