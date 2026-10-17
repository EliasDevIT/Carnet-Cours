"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { EvaluationForm } from "@/components/evaluation-form";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { Dialog, type CourseOption } from "@/components/ui";
import { tint } from "@/lib/colors";
import { capitalize, daysUntil, fmt, grade } from "@/lib/format";
import type { EvaluationWithCourse } from "@/lib/queries";
import { EVALUATION_KINDS, TASK_STATUSES, labelOf } from "@/lib/types";

export type RevisionState = { total: number; done: number; remaining: { id: number; title: string; status: string }[] };

export function ExamsView({
  exams,
  courses,
  revision,
}: {
  exams: EvaluationWithCourse[];
  courses: CourseOption[];
  revision: Record<number, RevisionState>;
}) {
  const [editing, setEditing] = useState<EvaluationWithCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [revisionFor, setRevisionFor] = useState<EvaluationWithCourse | null>(null);

  const now = new Date().toISOString();
  const upcoming = exams.filter((e) => e.date >= now);
  const past = exams.filter((e) => e.date < now).reverse();
  const next = upcoming[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Partiels"
        subtitle={
          next
            ? `Prochain partiel ${daysUntil(next.date) === 0 ? "aujourd'hui" : `dans ${daysUntil(next.date)} jour${daysUntil(next.date) > 1 ? "s" : ""}`}, ${next.course_name}.`
            : "Partiels et examens de fin de trimestre, avec ce qu'il te reste à réviser."
        }
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!courses.length}>
            <Plus size={16} /> Ajouter un partiel
          </button>
        }
      />

      {upcoming.length === 0 ? (
        <EmptyState title="Aucun partiel à venir">
          Ajoute tes partiels dès que les dates tombent : tu verras le compte à rebours et les chapitres qu&apos;il te reste à revoir.
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {upcoming.map((exam) => {
            const days = daysUntil(exam.date);
            const state = revision[exam.course_id];
            const ratio = state?.total ? state.done / state.total : 0;
            return (
              <li key={exam.id} className="panel overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <button
                    onClick={() => setEditing(exam)}
                    className="flex shrink-0 items-center gap-4 p-5 text-left sm:w-60 sm:flex-col sm:items-start sm:justify-between"
                    style={{ background: days <= 7 ? exam.color : tint(exam.color, 16), color: days <= 7 ? "#fff" : "var(--ink)" }}
                  >
                    <span className="leading-none">
                      <span className="display block text-5xl font-bold">{days}</span>
                      <span className="mt-1 block text-sm font-medium opacity-85">{days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours"}</span>
                    </span>
                    <span className="text-sm font-medium opacity-90">{capitalize(fmt(exam.date, "EEEE d MMMM 'à' H'h'mm"))}</span>
                  </button>

                  <div className="min-w-0 flex-1 p-5">
                    <p className="text-sm font-semibold" style={{ color: exam.color }}>
                      <Link href={`/cours/${exam.course_id}`} className="hover:underline">
                        {exam.course_name}
                      </Link>
                    </p>
                    <button onClick={() => setEditing(exam)} className="display mt-0.5 block text-left text-xl font-bold hover:underline">
                      {exam.title}
                    </button>
                    <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                      <span>{labelOf(EVALUATION_KINDS, exam.kind)}, coef. {grade(exam.coefficient)}</span>
                      {exam.room && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} /> {exam.room}
                        </span>
                      )}
                    </p>

                    {exam.notes && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold text-muted">À réviser</h3>
                        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{exam.notes}</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-xs font-semibold text-muted">
                          {state?.total ? `Chapitres et révisions : ${state.done} sur ${state.total} faits` : "Aucun chapitre suivi pour cette matière"}
                        </h3>
                        <button className="text-xs font-medium text-accent hover:underline" onClick={() => setRevisionFor(exam)}>
                          Planifier une révision
                        </button>
                      </div>
                      {state?.total ? (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: tint(exam.color, 20) }}>
                          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: exam.color }} />
                        </div>
                      ) : null}
                      {state && state.remaining.length > 0 && (
                        <ul className="mt-2.5 flex flex-wrap gap-1.5">
                          {state.remaining.slice(0, 8).map((t) => (
                            <li key={t.id} className="chip h-auto border border-line py-0.5 font-medium text-ink-soft" title={labelOf(TASK_STATUSES, t.status)}>
                              {t.title}
                            </li>
                          ))}
                          {state.remaining.length > 8 && <li className="chip text-muted">+{state.remaining.length - 8}</li>}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="panel-title mb-3">Passés</h2>
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
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
        </section>
      )}

      <Dialog title="Partiel" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <EvaluationForm evaluation={editing} courses={courses} onDone={close} />}
      </Dialog>
      <Dialog title="Nouveau partiel" open={creating} onOpenChange={setCreating}>
        {(close) => <EvaluationForm courses={courses} defaults={{ kind: "partiel", title: "Partiel" }} onDone={close} />}
      </Dialog>
      <Dialog title="Nouvelle révision" open={revisionFor !== null} onOpenChange={(o) => !o && setRevisionFor(null)}>
        {(close) =>
          revisionFor && (
            <TaskForm
              courses={courses}
              defaults={{
                courseId: revisionFor.course_id,
                kind: "revision",
                title: `Réviser pour ${revisionFor.title.toLowerCase()}`,
                dueDate: format(subDays(parseISO(revisionFor.date), 1), "yyyy-MM-dd"),
              }}
              onDone={close}
            />
          )
        }
      </Dialog>
    </div>
  );
}
