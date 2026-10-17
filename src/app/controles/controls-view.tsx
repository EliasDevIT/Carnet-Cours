"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EvaluationForm } from "@/components/evaluation-form";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Dialog, type CourseOption } from "@/components/ui";
import { tint } from "@/lib/colors";
import { capitalize, daysUntil, fmt, grade } from "@/lib/format";
import type { CourseWithTrimester, EvaluationWithCourse } from "@/lib/queries";
import { EVALUATION_KINDS, labelOf, type Trimester } from "@/lib/types";

type Average = {
  trimester: Trimester;
  rows: { course: CourseWithTrimester; average: number | null; count: number }[];
  average: number | null;
};

const round = (value: number) => grade(Math.round(value * 100) / 100);

export function ControlsView({ evaluations, averages, courses }: { evaluations: EvaluationWithCourse[]; averages: Average[]; courses: CourseOption[] }) {
  const [editing, setEditing] = useState<EvaluationWithCourse | null>(null);
  const now = new Date().toISOString();
  const upcoming = evaluations.filter((e) => e.date >= now);
  const past = evaluations.filter((e) => e.date < now).reverse();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contrôles"
        subtitle={upcoming.length ? `${upcoming.length} à venir` : "Contrôles, oraux et TP notés, avec tes notes. Les partiels et les rendus ont leur propre page."}
        actions={
          <Dialog
            title="Nouveau contrôle"
            trigger={(open) => (
              <button className="btn btn-primary" onClick={open} disabled={!courses.length}>
                <Plus size={16} /> Ajouter un contrôle
              </button>
            )}
          >
            {(close) => <EvaluationForm courses={courses} onDone={close} />}
          </Dialog>
        }
      />

      {!courses.length && (
        <EmptyState title="Commence par créer tes matières" action={<Link href="/cours" className="btn btn-primary">Créer une matière</Link>}>
          Chaque contrôle est rattaché à une matière.
        </EmptyState>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-8">
          <section>
            <h2 className="panel-title mb-3">À venir</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Rien de prévu. Ajoute un contrôle dès qu&apos;il est annoncé.</p>
            ) : (
              <ul className="grid gap-2">
                {upcoming.map((e) => {
                  const days = daysUntil(e.date);
                  return (
                    <li key={e.id}>
                      <button onClick={() => setEditing(e)} className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-3 text-left hover:border-line-strong">
                        <span className="grid w-16 shrink-0 justify-items-center rounded-lg py-2 leading-none" style={{ background: tint(e.color, 20) }}>
                          <span className="display text-2xl font-bold">{days <= 0 ? "0" : days}</span>
                          <span className="mt-1 text-[0.68rem] text-ink-soft">{days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours"}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: e.color }}>
                            {e.course_name}
                            <span className="font-normal text-muted">{labelOf(EVALUATION_KINDS, e.kind)}</span>
                          </span>
                          <span className="block truncate font-semibold">{e.title}</span>
                          <span className="block text-sm text-muted">
                            {capitalize(fmt(e.date, "EEEE d MMMM 'à' HH'h'mm"))}
                            {e.room && `, ${e.room}`}
                          </span>
                        </span>
                        {e.coefficient !== 1 && <span className="hidden text-sm text-muted sm:block">coef. {grade(e.coefficient)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="panel-title mb-3">Passés</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted">Aucun contrôle passé.</p>
            ) : (
              <div className="panel overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-xs text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Contrôle</th>
                      <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Date</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Coef.</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {past.map((e) => (
                      <tr key={e.id} onClick={() => setEditing(e)} className="cursor-pointer hover:bg-sunken">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{e.title}</span>
                              <span className="block truncate text-xs text-muted">{e.course_name}</span>
                            </span>
                          </span>
                        </td>
                        <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{fmt(e.date, "d MMM yyyy")}</td>
                        <td className="px-4 py-2.5 text-right text-muted">{grade(e.coefficient)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {e.grade !== null ? (
                            <span className="display font-semibold">
                              {grade(e.grade)}
                              <span className="text-xs font-normal text-muted">/{grade(e.grade_max)}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-accent">Ajouter la note</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <p className="px-1 text-sm text-muted">Moyennes sur 20, partiels et rendus notés compris.</p>
          {averages.map(({ trimester, rows, average }) => (
            <section key={trimester.id} className="panel p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="panel-title">{trimester.name}</h2>
                <span className="display text-2xl font-bold">
                  {average !== null ? round(average) : "–"}
                  <span className="text-sm font-normal text-muted">/20</span>
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted">Aucune matière.</p>
              ) : (
                <ul className="grid gap-2">
                  {rows.map(({ course, average: avg, count }) => (
                    <li key={course.id} className="text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link href={`/cours/${course.id}`} className="truncate hover:underline">
                          {course.name}
                        </Link>
                        <span className={avg !== null ? "font-semibold" : "text-muted"}>{avg !== null ? round(avg) : "–"}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: tint(course.color, 18) }}>
                        <div className="h-full rounded-full" style={{ width: `${((avg ?? 0) / 20) * 100}%`, background: course.color }} />
                      </div>
                      {count > 0 && (
                        <span className="text-xs text-muted">
                          {count} note{count > 1 ? "s" : ""}, coef. {grade(course.coefficient)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </aside>
      </div>

      <Dialog title="Contrôle" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <EvaluationForm evaluation={editing} courses={courses} onDone={close} />}
      </Dialog>
    </div>
  );
}
