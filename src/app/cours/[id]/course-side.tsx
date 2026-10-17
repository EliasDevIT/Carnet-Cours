"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCourse, deleteLink } from "@/app/actions";
import { CourseForm } from "@/components/course-form";
import { EvaluationForm } from "@/components/evaluation-form";
import { LinkForm } from "@/components/link-form";
import { LinkIcon } from "@/components/link-icon";
import { ConfirmButton, Dialog, type CourseOption } from "@/components/ui";
import { tint } from "@/lib/colors";
import { daysUntil, fmt, grade } from "@/lib/format";
import { EVALUATION_KINDS, labelOf, type Course, type Evaluation, type LinkRow, type Trimester } from "@/lib/types";

export function CourseActions({ course, trimesters }: { course: Course; trimesters: Trimester[] }) {
  return (
    <>
      <Dialog
        title="Modifier la matière"
        trigger={(open) => (
          <button className="btn" onClick={open}>
            <Pencil size={15} /> Modifier
          </button>
        )}
      >
        {(close) => <CourseForm course={course} trimesters={trimesters} onDone={close} />}
      </Dialog>
      <ConfirmButton
        onConfirm={() => deleteCourse(course.id)}
        question={`Supprimer « ${course.name} » avec tous ses fichiers, cartes et contrôles ?`}
        className="btn btn-danger btn-icon"
        label="Supprimer la matière"
      >
        <Trash2 size={16} />
      </ConfirmButton>
    </>
  );
}

export function CourseEvaluations({ course, evaluations, courses }: { course: Course; evaluations: Evaluation[]; courses: CourseOption[] }) {
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const now = new Date().toISOString();
  const upcoming = evaluations.filter((e) => e.date >= now);
  const past = evaluations.filter((e) => e.date < now).reverse();

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="panel-title">Contrôles</h2>
        <Dialog
          title="Nouveau contrôle"
          trigger={(open) => (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={open} aria-label="Ajouter un contrôle" title="Ajouter un contrôle">
              <Plus size={16} />
            </button>
          )}
        >
          {(close) => <EvaluationForm courses={courses} defaults={{ courseId: course.id, room: course.room }} onDone={close} />}
        </Dialog>
      </div>
      {evaluations.length === 0 && <p className="text-sm text-muted">Aucun contrôle prévu.</p>}
      <ul className="grid gap-1.5">
        {[...upcoming, ...past].map((evaluation) => {
          const days = daysUntil(evaluation.date);
          const isPast = evaluation.date < now;
          return (
            <li key={evaluation.id}>
              <button onClick={() => setEditing(evaluation)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sunken">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-center leading-none"
                  style={{ background: isPast ? "var(--sunken)" : tint(course.color, 18), color: isPast ? "var(--muted)" : "var(--ink)" }}
                >
                  {isPast && evaluation.grade != null ? (
                    <span className="display text-sm font-bold">{grade(evaluation.grade)}</span>
                  ) : isPast ? (
                    <span className="text-xs">—</span>
                  ) : (
                    <span className="display text-sm font-bold">{days === 0 ? "Auj." : `J-${days}`}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-semibold ${isPast ? "text-ink-soft" : ""}`}>{evaluation.title}</span>
                  <span className="block text-xs text-muted">
                    {labelOf(EVALUATION_KINDS, evaluation.kind)}, {fmt(evaluation.date, "EEE d MMM 'à' HH'h'mm")}
                    {isPast && evaluation.grade != null && `, sur ${grade(evaluation.grade_max)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Dialog title="Contrôle" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <EvaluationForm evaluation={editing} courses={courses} onDone={close} />}
      </Dialog>
    </section>
  );
}

export function CourseLinks({ course, links, courses }: { course: Course; links: LinkRow[]; courses: CourseOption[] }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="panel-title">Liens</h2>
        <Dialog
          title={`Lien pour ${course.name}`}
          trigger={(open) => (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={open} aria-label="Ajouter un lien" title="Ajouter un lien">
              <Plus size={16} />
            </button>
          )}
        >
          {(close) => <LinkForm courses={courses} categories={["Cours"]} defaultCourseId={course.id} link={{ category: "Cours", favorite: 0 }} onDone={close} />}
        </Dialog>
      </div>
      {links.length === 0 && <p className="text-sm text-muted">Moodle, drive du prof, sujet de projet…</p>}
      <ul className="grid gap-1">
        {links.map((link) => (
          <li key={link.id} className="group flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-sunken">
            <a href={link.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2.5">
              <LinkIcon url={link.url} title={link.title} size={28} />
              <span className="truncate text-sm font-medium">{link.title}</span>
            </a>
            <ConfirmButton
              onConfirm={() => deleteLink(link.id)}
              question={`Supprimer le lien « ${link.title} » ?`}
              label="Supprimer"
              className="btn btn-ghost btn-danger btn-icon btn-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 size={14} />
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
