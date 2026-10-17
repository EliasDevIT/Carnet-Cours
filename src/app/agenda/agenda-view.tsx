"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, GraduationCap, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AgendaItemDialog } from "@/components/agenda-item-dialog";
import { EvaluationForm } from "@/components/evaluation-form";
import { Dialog, type CourseOption } from "@/components/ui";
import { NEUTRAL_COLOR, tint } from "@/lib/colors";
import { capitalize } from "@/lib/format";
import type { AgendaItem, Evaluation } from "@/lib/types";
import { useNow } from "@/lib/use-now";

const HOUR_HEIGHT = 52;

type Props = {
  view: "semaine" | "mois";
  anchor: string;
  from: string;
  items: AgendaItem[];
  evaluations: Evaluation[];
  courses: (CourseOption & { room?: string })[];
  hasSources: boolean;
};

export function AgendaView({ view, anchor, from, items, evaluations, courses, hasSources }: Props) {
  const [selected, setSelected] = useState<AgendaItem | null>(null);
  const anchorDate = parseISO(anchor);
  const start = parseISO(from);

  const prev = format(view === "mois" ? addMonths(anchorDate, -1) : addWeeks(anchorDate, -1), "yyyy-MM-dd");
  const next = format(view === "mois" ? addMonths(anchorDate, 1) : addWeeks(anchorDate, 1), "yyyy-MM-dd");
  const href = (date: string, v = view) => `/agenda?vue=${v}&date=${date}`;

  const title =
    view === "mois"
      ? capitalize(format(anchorDate, "MMMM yyyy", { locale: fr }))
      : `Semaine ${format(start, "I")}`;
  const subtitle =
    view === "semaine"
      ? `Du ${format(start, "d MMMM", { locale: fr })} au ${format(addDays(start, 6), "d MMMM yyyy", { locale: fr })}`
      : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2rem] font-bold leading-tight sm:text-[2.4rem]">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line-strong bg-surface p-0.5" role="tablist" aria-label="Vue">
            {(["semaine", "mois"] as const).map((v) => (
              <Link
                key={v}
                href={href(anchor, v)}
                role="tab"
                aria-selected={view === v}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? "bg-ink text-surface" : "text-ink-soft hover:text-ink"}`}
              >
                {v === "semaine" ? "Semaine" : "Mois"}
              </Link>
            ))}
          </div>
          <div className="flex items-center">
            <Link href={href(prev)} className="btn btn-ghost btn-icon" aria-label="Période précédente">
              <ChevronLeft size={18} />
            </Link>
            <Link href={href(format(new Date(), "yyyy-MM-dd"))} className="btn btn-sm">
              Aujourd&apos;hui
            </Link>
            <Link href={href(next)} className="btn btn-ghost btn-icon" aria-label="Période suivante">
              <ChevronRight size={18} />
            </Link>
          </div>
          <Dialog
            title="Nouveau contrôle"
            trigger={(open) => (
              <button className="btn btn-primary" onClick={open} disabled={!courses.length} title={courses.length ? undefined : "Crée d'abord une matière"}>
                <Plus size={16} /> Contrôle
              </button>
            )}
          >
            {(close) => <EvaluationForm courses={courses} onDone={close} />}
          </Dialog>
        </div>
      </div>

      {!hasSources && (
        <p className="mb-4 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft">
          Ton emploi du temps n&apos;est pas encore importé. Ajoute ton lien ou ton fichier .ics plus bas sur cette page.
        </p>
      )}

      {view === "semaine" ? (
        <WeekGrid start={start} items={items} onSelect={setSelected} />
      ) : (
        <MonthGrid start={start} anchor={anchorDate} items={items} onSelect={setSelected} />
      )}

      <AgendaItemDialog
        item={selected}
        courses={courses}
        evaluation={selected?.type === "evaluation" ? evaluations.find((e) => e.id === selected.id) : undefined}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

/* ---------- Semaine ---------- */

type Placed = AgendaItem & { lane: number; lanes: number };

/** Répartit les séances qui se chevauchent en colonnes côte à côte. */
function layoutDay(items: AgendaItem[]): Placed[] {
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = 0;
  const flush = () => {
    cluster.forEach((p) => (p.lanes = laneEnds.length));
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const item of items) {
    const s = parseISO(item.start).getTime();
    const e = Math.max(parseISO(item.end).getTime(), s + 20 * 60000);
    if (cluster.length && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    clusterEnd = cluster.length ? Math.max(clusterEnd, e) : e;
    cluster.push({ ...item, lane, lanes: 1 });
  }
  flush();
  return placed;
}

function WeekGrid({ start, items, onSelect }: { start: Date; items: AgendaItem[]; onSelect: (item: AgendaItem) => void }) {
  const now = useNow();
  const timed = items.filter((i) => !i.allDay);
  const allDay = items.filter((i) => i.allDay);

  const weekendUsed = items.some((i) => [0, 6].includes(parseISO(i.start).getDay()));
  const days = Array.from({ length: weekendUsed ? 7 : 5 }, (_, i) => addDays(start, i));

  const { first, last } = useMemo(() => {
    let first = 8;
    let last = 18;
    for (const item of timed) {
      const s = parseISO(item.start);
      const e = parseISO(item.end);
      first = Math.min(first, s.getHours());
      last = Math.max(last, e.getHours() + (e.getMinutes() ? 1 : 0));
    }
    return { first, last: Math.min(24, last) };
  }, [timed]);
  const hours = Array.from({ length: last - first }, (_, i) => first + i);

  const top = (date: Date) => ((date.getHours() - first) * 60 + date.getMinutes()) * (HOUR_HEIGHT / 60);

  return (
    <div className="panel overflow-x-auto">
      <div className="min-w-[44rem]">
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="border-l border-line px-3 py-2.5">
              <span className={`text-xs ${isToday(day) ? "font-semibold text-accent" : "text-muted"}`}>
                {capitalize(format(day, "EEE", { locale: fr }))}
              </span>
              <span
                className={`display ml-1.5 inline-grid h-7 min-w-7 place-items-center rounded-full px-1 text-lg font-bold ${
                  isToday(day) ? "bg-accent text-accent-ink" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 grid gap-1">
                {allDay
                  .filter((i) => isSameDay(parseISO(i.start), day))
                  .map((i) => (
                    <button
                      key={i.key}
                      onClick={() => onSelect(i)}
                      className="truncate rounded px-1.5 py-0.5 text-left text-xs font-medium"
                      style={{ background: tint(i.color, 22) }}
                    >
                      {i.title}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}>
          <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {hours.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-muted" style={{ top: i * HOUR_HEIGHT }}>
                {i === 0 ? "" : `${h}h`}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const dayItems = layoutDay(timed.filter((i) => isSameDay(parseISO(i.start), day)));
            const showNow = now && isSameDay(now, day) && now.getHours() >= first && now.getHours() < last;
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-line ${isToday(day) ? "bg-accent/[0.03]" : ""}`}
                style={{
                  height: hours.length * HOUR_HEIGHT,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--line) ${HOUR_HEIGHT - 1}px, var(--line) ${HOUR_HEIGHT}px)`,
                }}
              >
                {dayItems.map((item) => {
                  const s = parseISO(item.start);
                  const e = parseISO(item.end);
                  const height = Math.max(22, (differenceInMinutes(e, s) * HOUR_HEIGHT) / 60 - 2);
                  const color = item.color ?? NEUTRAL_COLOR;
                  const isEval = item.type === "evaluation";
                  return (
                    <button
                      key={item.key}
                      onClick={() => onSelect(item)}
                      className="absolute overflow-hidden rounded-md px-2 py-1 text-left text-xs leading-tight transition-[filter] hover:brightness-95"
                      style={{
                        top: top(s) + 1,
                        height,
                        left: `calc(${(item.lane / item.lanes) * 100}% + 3px)`,
                        width: `calc(${100 / item.lanes}% - 6px)`,
                        background: isEval ? color : tint(color, 20),
                        color: isEval ? "#fff" : "var(--ink)",
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        {isEval && <GraduationCap size={12} className="shrink-0" />}
                        <span className="truncate">{item.courseName && !isEval ? item.courseName : item.title}</span>
                      </span>
                      {height > 34 && (
                        <span className="block truncate opacity-80">
                          {format(s, "HH:mm")}
                          {item.location && `, ${item.location}`}
                        </span>
                      )}
                      {height > 56 && item.courseName && !isEval && <span className="block truncate opacity-70">{item.title}</span>}
                    </button>
                  );
                })}
                {showNow && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: top(now) }}>
                    <span className="now-dot -ml-1 h-2 w-2 rounded-full bg-accent" />
                    <span className="h-px flex-1 bg-accent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Mois ---------- */

function MonthGrid({ start, anchor, items, onSelect }: { start: Date; anchor: Date; items: AgendaItem[]; onSelect: (item: AgendaItem) => void }) {
  const days = eachDayOfInterval({ start, end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) });

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-semibold text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((i) => isSameDay(parseISO(i.start), day));
          const evals = dayItems.filter((i) => i.type === "evaluation");
          const sessions = dayItems.filter((i) => i.type === "event");
          const shown = [...evals, ...sessions].slice(0, 4);
          const inMonth = isSameMonth(day, anchor);
          return (
            <div key={day.toISOString()} className={`min-h-28 border-b border-l border-line p-1.5 first:border-l-0 [&:nth-child(7n+1)]:border-l-0 ${inMonth ? "" : "bg-sunken/70"}`}>
              <Link
                href={`/agenda?vue=semaine&date=${format(day, "yyyy-MM-dd")}`}
                className={`mb-1 inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold ${
                  isToday(day) ? "bg-accent text-accent-ink" : inMonth ? "text-ink" : "text-muted"
                }`}
              >
                {format(day, "d")}
              </Link>
              <div className="grid gap-0.5">
                {shown.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onSelect(item)}
                    className="flex min-w-0 items-center gap-1 rounded px-1 py-px text-left text-[0.7rem] leading-snug hover:bg-sunken"
                    style={item.type === "evaluation" ? { background: item.color ?? NEUTRAL_COLOR, color: "#fff" } : undefined}
                  >
                    {item.type === "evaluation" ? (
                      <GraduationCap size={11} className="shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color ?? NEUTRAL_COLOR }} />
                    )}
                    <span className="truncate">
                      {!item.allDay && item.type === "event" && <span className="text-muted">{format(parseISO(item.start), "H'h'mm")} </span>}
                      {item.type === "event" ? (item.courseName ?? item.title) : item.title}
                    </span>
                  </button>
                ))}
                {dayItems.length > shown.length && (
                  <Link href={`/agenda?vue=semaine&date=${format(day, "yyyy-MM-dd")}`} className="px-1 text-[0.7rem] text-muted hover:text-ink">
                    +{dayItems.length - shown.length} de plus
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
