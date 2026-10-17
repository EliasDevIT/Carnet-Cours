import Link from "next/link";
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { GraduationCap } from "lucide-react";
import { DayHero } from "./day-hero";
import { FocusTasks } from "./focus-tasks";
import { LinkIcon } from "@/components/link-icon";
import { getSetting } from "@/lib/db";
import { NEUTRAL_COLOR, tint } from "@/lib/colors";
import { fileBadge } from "@/lib/files";
import { capitalize, daysUntil, fmt, grade, weekNumber } from "@/lib/format";
import {
  getAgendaItems,
  getCourseStats,
  getCourses,
  getCurrentTrimester,
  getEvaluations,
  getFavoriteLinks,
  getRecentFiles,
  getSources,
  getTasks,
} from "@/lib/queries";
import { EVALUATION_KINDS, labelOf, type AgendaItem } from "@/lib/types";

/** Le jour à afficher : aujourd'hui s'il reste des cours, sinon le prochain jour de cours de la semaine. */
function focusDay(now: Date) {
  const today = startOfDay(now);
  const todayItems = getAgendaItems(today, addDays(today, 1));
  if (todayItems.some((i) => !i.allDay && parseISO(i.end) > now)) return { items: todayItems, label: "aujourd'hui" };
  for (let d = 1; d <= 7; d++) {
    const day = addDays(today, d);
    const items = getAgendaItems(day, addDays(day, 1));
    if (items.some((i) => !i.allDay)) return { items, label: d === 1 ? "demain" : format(day, "EEEE d MMMM", { locale: fr }) };
  }
  return { items: todayItems, label: "aujourd'hui" };
}

export default function Dashboard() {
  const now = new Date();
  const firstName = getSetting("first_name");
  const trimester = getCurrentTrimester();
  const courses = getCourses();
  const courseOptions = courses.map(({ id, name, color, trimester_name, room }) => ({ id, name, color, trimester_name, room }));
  const stats = getCourseStats();
  const hasSources = getSources().length > 0;

  const focus = focusDay(now);
  const evaluations = getEvaluations({ from: now.toISOString(), to: addDays(now, 45).toISOString() });

  // Semaine en cours : heures de cours par jour, découpées par matière.
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekItems = getAgendaItems(weekStart, addDays(weekStart, 7));
  const weekDays = Array.from({ length: weekItems.some((i) => parseISO(i.start).getDay() === 6) ? 6 : 5 }, (_, i) => addDays(weekStart, i));
  const week = weekDays.map((day) => {
    const items = weekItems.filter((i) => isSameDay(parseISO(i.start), day));
    const segments = new Map<string, { color: string; minutes: number; name: string }>();
    for (const i of items.filter((i) => i.type === "event" && !i.allDay)) {
      const key = String(i.courseId ?? i.title);
      const minutes = (parseISO(i.end).getTime() - parseISO(i.start).getTime()) / 60000;
      const seg = segments.get(key) ?? { color: i.color ?? NEUTRAL_COLOR, minutes: 0, name: i.courseName ?? i.title };
      seg.minutes += minutes;
      segments.set(key, seg);
    }
    return { day, segments: [...segments.values()], evaluations: items.filter((i) => i.type === "evaluation") as AgendaItem[] };
  });
  const weekMinutes = week.reduce((sum, d) => sum + d.segments.reduce((s, x) => s + x.minutes, 0), 0);
  const maxMinutes = Math.max(8 * 60, ...week.map((d) => d.segments.reduce((s, x) => s + x.minutes, 0)));

  const todayIso = format(now, "yyyy-MM-dd");
  const inAWeek = format(addDays(now, 7), "yyyy-MM-dd");
  const focusTasks = getTasks()
    .filter((t) => t.status !== "done" && (t.status === "doing" || (t.due_date && t.due_date <= inAWeek)))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 7);
  const lateCount = focusTasks.filter((t) => t.due_date && t.due_date < todayIso).length;

  const trimesterCourses = trimester ? courses.filter((c) => c.trimester_id === trimester.id) : [];
  const trimesterTotal = trimester ? differenceInCalendarDays(parseISO(trimester.end_date), parseISO(trimester.start_date)) + 1 : 0;
  const trimesterElapsed = trimester ? Math.min(trimesterTotal, Math.max(0, differenceInCalendarDays(now, parseISO(trimester.start_date)) + 1)) : 0;
  const trimesterWeek = Math.max(1, Math.ceil(trimesterElapsed / 7));
  const trimesterWeeks = Math.ceil(trimesterTotal / 7);

  const links = getFavoriteLinks();
  const recentFiles = getRecentFiles(5);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="display text-[2.1rem] font-bold leading-tight sm:text-[2.6rem]">{firstName ? `Bonjour ${firstName}` : "Bonjour"}</h1>
          <p className="mt-1 text-muted">
            {capitalize(fmt(now, "EEEE d MMMM"))}, semaine {weekNumber(now)}
          </p>
        </div>
        {trimester && (
          <div className="w-full max-w-xs sm:w-72">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold">{trimester.name}</span>
              <span className="text-muted">
                semaine {Math.min(trimesterWeek, trimesterWeeks)} sur {trimesterWeeks}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round((trimesterElapsed / trimesterTotal) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du trimestre">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(trimesterElapsed / trimesterTotal) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <DayHero
        serverNow={now.toISOString()}
        dayLabel={focus.label}
        items={focus.items}
        courses={courseOptions}
        evaluations={evaluations}
        hasSources={hasSources}
      />

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Contrôles à venir */}
        <section className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="panel-title">Contrôles à venir</h2>
            <Link href="/controles" className="text-sm text-muted hover:text-ink">
              Tout voir
            </Link>
          </div>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted">Aucun contrôle dans les six prochaines semaines.</p>
          ) : (
            <ul className="grid gap-3">
              {evaluations.slice(0, 4).map((e) => {
                const days = daysUntil(e.date);
                return (
                  <li key={e.id}>
                    <Link href={`/cours/${e.course_id}`} className="flex items-center gap-3.5">
                      <span
                        className="grid w-[3.4rem] shrink-0 justify-items-center rounded-xl py-1.5 leading-none"
                        style={{ background: days <= 3 ? e.color : tint(e.color, 18), color: days <= 3 ? "#fff" : "var(--ink)" }}
                      >
                        <span className="display text-[1.6rem] font-bold">{days}</span>
                        <span className="text-[0.65rem] font-medium opacity-80">{days === 0 ? "auj." : days === 1 ? "jour" : "jours"}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold" title={e.title}>
                          {e.title}
                        </span>
                        <span className="block truncate text-xs text-muted" title={`${labelOf(EVALUATION_KINDS, e.kind)}, ${e.course_name}`}>
                          {capitalize(fmt(e.date, "EEE d MMM 'à' H'h'mm"))}, {e.course_name}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* À faire */}
        <section className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="panel-title">
              À faire
              {lateCount > 0 && <span className="ml-2 text-sm font-semibold text-danger">{lateCount} en retard</span>}
            </h2>
            <Link href="/devoirs" className="text-sm text-muted hover:text-ink">
              Devoirs
            </Link>
          </div>
          <FocusTasks tasks={focusTasks} />
        </section>

        {/* Semaine */}
        <section className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="panel-title">Cette semaine</h2>
            <Link href="/agenda" className="text-sm text-muted hover:text-ink">
              {weekMinutes ? `${grade(Math.round((weekMinutes / 60) * 10) / 10)} h de cours` : "Agenda"}
            </Link>
          </div>
          <div className="grid h-40 items-end gap-2" style={{ gridTemplateColumns: `repeat(${week.length}, 1fr)` }}>
            {week.map(({ day, segments, evaluations: evals }) => {
              const minutes = segments.reduce((s, x) => s + x.minutes, 0);
              const today = isSameDay(day, now);
              return (
                <Link
                  key={day.toISOString()}
                  href={`/agenda?vue=semaine&date=${format(day, "yyyy-MM-dd")}`}
                  className="group flex h-full flex-col items-center justify-end gap-1.5"
                  title={segments.map((s) => `${s.name} ${grade(Math.round((s.minutes / 60) * 10) / 10)} h`).join("\n") || "Pas de cours"}
                >
                  {evals.length > 0 && (
                    <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: evals[0].color ?? NEUTRAL_COLOR }} title={evals.map((e) => e.title).join(", ")}>
                      <GraduationCap size={12} />
                    </span>
                  )}
                  <span className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-md bg-sunken" style={{ height: `${Math.max(6, (minutes / maxMinutes) * 100)}%` }}>
                    {segments.map((s, i) => (
                      <span key={i} style={{ height: `${(s.minutes / Math.max(minutes, 1)) * 100}%`, background: s.color }} className="border-t border-surface/70 first:border-t-0" />
                    ))}
                  </span>
                  <span className={`text-xs ${today ? "rounded-full bg-accent px-1.5 font-semibold text-accent-ink" : "text-muted group-hover:text-ink"}`}>
                    {capitalize(format(day, "EEEEEE", { locale: fr }))} {format(day, "d")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* Progression par matière */}
        <section className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="panel-title">{trimester ? `Matières du ${trimester.name.toLowerCase()}` : "Matières"}</h2>
            <Link href="/cours" className="text-sm text-muted hover:text-ink">
              Gérer
            </Link>
          </div>
          {trimesterCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong p-5 text-sm">
              <p className="font-semibold">Aucune matière pour ce trimestre.</p>
              <p className="mt-1 text-muted">Crée tes matières pour ranger tes fichiers et suivre ta progression.</p>
              <Link href="/cours" className="btn btn-primary mt-4">
                Créer mes matières
              </Link>
            </div>
          ) : (
            <ul className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {trimesterCourses.map((course) => {
                const s = stats.get(course.id);
                const ratio = s?.total ? s.done / s.total : 0;
                const next = s?.nextEvaluation ? daysUntil(s.nextEvaluation) : null;
                return (
                  <li key={course.id}>
                    <Link href={`/cours/${course.id}`} className="group block">
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-semibold group-hover:underline">{course.name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {s?.average != null && <span className="mr-2 font-semibold text-ink">{grade(Math.round(s.average * 10) / 10)}</span>}
                          {s?.total ? `${s.done}/${s.total}` : "aucune carte"}
                        </span>
                      </span>
                      <span className="mt-1.5 block h-2 overflow-hidden rounded-full" style={{ background: tint(course.color, 20) }}>
                        <span className="block h-full rounded-full" style={{ width: `${ratio * 100}%`, background: course.color }} />
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {s?.fileCount ? `${s.fileCount} fichier${s.fileCount > 1 ? "s" : ""}` : "aucun fichier"}
                        {next !== null && `, contrôle dans ${next} j`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid content-start gap-5">
          {/* Liens favoris */}
          <section>
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="panel-title">Liens</h2>
              <Link href="/liens" className="text-sm text-muted hover:text-ink">
                Tous les liens
              </Link>
            </div>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5">
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center hover:bg-surface"
                    title={link.url}
                  >
                    <LinkIcon url={link.url} title={link.title} size={40} />
                    <span className="w-full truncate text-xs font-medium">{link.title}</span>
                  </a>
                </li>
              ))}
              <li>
                <Link href="/liens" className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center text-muted hover:bg-surface hover:text-ink">
                  <span className="grid h-10 w-10 place-items-center rounded-[9px] border border-dashed border-line-strong text-lg">+</span>
                  <span className="text-xs">Ajouter</span>
                </Link>
              </li>
            </ul>
          </section>

          {/* Fichiers récents */}
          <section className="panel p-5">
            <h2 className="panel-title mb-3">Fichiers récents</h2>
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted">Les cours que tu importes et ouvres apparaîtront ici.</p>
            ) : (
              <ul className="-mx-2 grid gap-px">
                {recentFiles.map((file) => {
                  const badge = fileBadge(file.ext);
                  return (
                    <li key={file.id}>
                      <Link href={`/fichiers/${file.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-sunken">
                        <span className="grid h-7 w-9 shrink-0 place-items-center rounded text-[0.6rem] font-bold text-white" style={{ background: badge.color }}>
                          {badge.label}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{file.name}</span>
                          <span className="block truncate text-xs" style={{ color: file.color ?? undefined }}>
                            {file.course_name}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
