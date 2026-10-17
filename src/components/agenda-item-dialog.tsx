"use client";

import Link from "next/link";
import { ClipboardList, GraduationCap, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { assignSummary } from "@/app/actions";
import { EvaluationForm } from "./evaluation-form";
import { TaskForm } from "./task-form";
import { Dialog, type CourseOption } from "./ui";
import { capitalize, fmt, fmtTime } from "@/lib/format";
import type { AgendaItem, Evaluation } from "@/lib/types";

type Mode = "details" | "evaluation" | "task";

/** Détail d'une séance de l'emploi du temps, avec les actions pour la rattacher ou la compléter. */
export function AgendaItemDialog({
  item,
  courses,
  evaluation,
  onClose,
}: {
  item: AgendaItem | null;
  courses: (CourseOption & { room?: string })[];
  evaluation?: Evaluation;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("details");
  const [pending, startTransition] = useTransition();
  const close = () => {
    setMode("details");
    onClose();
  };

  const title =
    item?.type === "evaluation" ? "Contrôle" : mode === "evaluation" ? "Nouveau contrôle" : mode === "task" ? "Nouvelle carte" : (item?.title ?? "");

  return (
    <Dialog title={title} open={item !== null} onOpenChange={(open) => !open && close()}>
      {() => {
        if (!item) return null;
        if (item.type === "evaluation" && evaluation) return <EvaluationForm evaluation={evaluation} courses={courses} onDone={close} />;
        if (mode === "evaluation")
          return (
            <EvaluationForm
              courses={courses}
              defaults={{ courseId: item.courseId, date: item.start, room: item.location }}
              onDone={close}
            />
          );
        if (mode === "task")
          return (
            <TaskForm
              courses={courses}
              defaults={{ courseId: item.courseId, title: item.title, dueDate: item.start.slice(0, 10), kind: "revision" }}
              onDone={close}
            />
          );

        return (
          <div className="grid gap-5">
            <div className="grid gap-1.5 text-sm">
              <p className="font-semibold">
                {capitalize(fmt(item.start, "EEEE d MMMM"))}
                {!item.allDay && `, ${fmtTime(item.start)} – ${fmtTime(item.end)}`}
              </p>
              {item.location && (
                <p className="flex items-center gap-1.5 text-ink-soft">
                  <MapPin size={14} className="text-muted" /> {item.location}
                </p>
              )}
            </div>

            {item.courseId ? (
              <Link
                href={`/cours/${item.courseId}`}
                className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-line-strong"
                onClick={close}
              >
                <span className="h-8 w-1.5 rounded-full" style={{ background: item.color ?? undefined }} />
                <span>
                  <span className="block text-xs text-muted">Matière</span>
                  <span className="font-semibold">{item.courseName}</span>
                </span>
              </Link>
            ) : (
              <form
                className="grid gap-2 rounded-xl border border-dashed border-line-strong p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const courseId = Number(new FormData(e.currentTarget).get("course"));
                  if (courseId) startTransition(async () => {
                    await assignSummary(item.title, courseId);
                    close();
                  });
                }}
              >
                <p className="text-sm">
                  Cette séance n&apos;est rattachée à aucune matière. Choisis-en une : toutes les séances intitulées pareil suivront.
                </p>
                <div className="flex gap-2">
                  <select name="course" className="input" defaultValue="" required>
                    <option value="" disabled>
                      Choisir une matière
                    </option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary shrink-0" disabled={pending}>
                    Rattacher
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn justify-start" onClick={() => setMode("evaluation")} disabled={!courses.length}>
                <GraduationCap size={16} /> Contrôle sur ce créneau
              </button>
              <button className="btn justify-start" onClick={() => setMode("task")}>
                <ClipboardList size={16} /> Carte au kanban
              </button>
            </div>
          </div>
        );
      }}
    </Dialog>
  );
}
