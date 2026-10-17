"use client";

import Link from "next/link";
import { CalendarRange, Copy, Plus } from "lucide-react";
import { useTransition } from "react";
import { copyCourses, saveTrimester } from "@/app/actions";
import { CourseForm } from "@/components/course-form";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Dialog, Field, SubmitRow } from "@/components/ui";
import { tint } from "@/lib/colors";
import { fmt, grade } from "@/lib/format";
import type { CourseStats, CourseWithTrimester } from "@/lib/queries";
import type { Trimester } from "@/lib/types";

export function CoursesBoard({
  trimesters,
  courses,
  currentTrimesterId,
  stats,
}: {
  trimesters: Trimester[];
  courses: CourseWithTrimester[];
  currentTrimesterId: number | null;
  stats: Record<number, CourseStats>;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Mes cours"
        subtitle="L'année en trois trimestres. Chaque matière a sa couleur, qu'on retrouve partout dans l'app."
        actions={
          <Dialog
            title="Nouvelle matière"
            trigger={(open) => (
              <button className="btn btn-primary" onClick={open}>
                <Plus size={16} /> Ajouter une matière
              </button>
            )}
          >
            {(close) => (
              <CourseForm trimesters={trimesters} defaultTrimesterId={currentTrimesterId ?? undefined} colorIndex={courses.length} onDone={close} />
            )}
          </Dialog>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trimesters.map((trimester) => {
          const list = courses.filter((c) => c.trimester_id === trimester.id);
          const current = trimester.id === currentTrimesterId;
          const donor = trimesters.find((t) => t.id !== trimester.id && courses.some((c) => c.trimester_id === t.id));
          return (
            <section
              key={trimester.id}
              className={`rounded-2xl border p-4 ${current ? "border-accent/40 bg-surface" : "border-line bg-sunken/60"}`}
            >
              <header className="mb-4 flex items-start justify-between gap-2 px-1">
                <div>
                  <h2 className="display flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-bold">
                    {trimester.name}
                    {current && <span className="chip bg-accent text-accent-ink">En cours</span>}
                  </h2>
                  <p className="text-sm text-muted">
                    Du {fmt(trimester.start_date, "d MMM")} au {fmt(trimester.end_date, "d MMM yyyy")}
                  </p>
                </div>
                <TrimesterDialog trimester={trimester} />
              </header>

              <ul className="grid gap-2">
                {list.map((course) => {
                  const s = stats[course.id];
                  const progress = s?.total ? s.done / s.total : 0;
                  return (
                    <li key={course.id}>
                      <Link
                        href={`/cours/${course.id}`}
                        className="group relative block overflow-hidden rounded-xl border border-line bg-surface py-3 pl-5 pr-4 transition-colors hover:border-line-strong"
                      >
                        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: course.color }} />
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-semibold">{course.name}</span>
                          {s?.average != null && (
                            <span className="display shrink-0 text-sm font-semibold" title="Moyenne sur 20">
                              {grade(Math.round(s.average * 100) / 100)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {[
                            course.teacher,
                            `${s?.fileCount ?? 0} fichier${(s?.fileCount ?? 0) > 1 ? "s" : ""}`,
                            s?.total ? `${s.done} sur ${s.total} fait${s.done > 1 ? "s" : ""}` : "",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {s?.total ? (
                          <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: tint(course.color, 22) }}>
                            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: course.color }} />
                          </div>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <Dialog
                  title={`Nouvelle matière en ${trimester.name}`}
                  trigger={(open) => (
                    <button className="btn btn-ghost btn-sm" onClick={open}>
                      <Plus size={15} /> Matière
                    </button>
                  )}
                >
                  {(close) => <CourseForm trimesters={trimesters} defaultTrimesterId={trimester.id} colorIndex={courses.length} onDone={close} />}
                </Dialog>
                {list.length === 0 && donor && <CopyButton from={donor} to={trimester} />}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CopyButton({ from, to }: { from: Trimester; to: Trimester }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => startTransition(() => copyCourses(from.id, to.id))}>
      <Copy size={15} /> Reprendre les matières du {from.name.toLowerCase()}
    </button>
  );
}

function TrimesterDialog({ trimester }: { trimester: Trimester }) {
  return (
    <Dialog
      title={`Dates du ${trimester.name.toLowerCase()}`}
      trigger={(open) => (
        <button className="btn btn-ghost btn-icon btn-sm" onClick={open} aria-label="Modifier les dates" title="Modifier les dates">
          <CalendarRange size={16} />
        </button>
      )}
    >
      {(close) => (
        <ActionForm action={saveTrimester} onDone={close}>
          {(pending) => (
            <>
              <input type="hidden" name="id" value={trimester.id} />
              <Field label="Nom">
                <input name="name" className="input" defaultValue={trimester.name} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Début">
                  <input type="date" name="start_date" className="input" defaultValue={trimester.start_date} required />
                </Field>
                <Field label="Fin">
                  <input type="date" name="end_date" className="input" defaultValue={trimester.end_date} required />
                </Field>
              </div>
              <SubmitRow onCancel={close} pending={pending} />
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}
