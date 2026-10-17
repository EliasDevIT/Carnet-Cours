"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { deleteTask, saveTask } from "@/app/actions";
import { SessionPicker } from "./session-picker";
import type { FileOption } from "@/lib/queries";
import { TASK_KINDS, TASK_STATUSES, type Task, type TaskStatus } from "@/lib/types";
import { ActionForm, ConfirmButton, CourseSelect, Field, SubmitRow, type CourseOption } from "./ui";

export function TaskForm({
  task,
  courses,
  files,
  defaults,
  onDone,
}: {
  task?: Task;
  courses: CourseOption[];
  /** Fichiers de cours proposés pour retrouver l'énoncé ; sans eux, le champ n'est pas affiché. */
  files?: FileOption[];
  defaults?: { courseId?: number | null; status?: TaskStatus; title?: string; dueDate?: string; kind?: string };
  onDone: () => void;
}) {
  const [courseId, setCourseId] = useState<number | null>(task?.course_id ?? defaults?.courseId ?? null);
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaults?.dueDate ?? "");
  const fileChoices = files?.filter((f) => !courseId || f.course_id === courseId || f.id === task?.file_id) ?? [];

  return (
    <ActionForm action={saveTask} onDone={onDone}>
      {(pending) => (
        <>
          {task && <input type="hidden" name="id" value={task.id} />}
          <Field label="Titre">
            <input name="title" className="input" required defaultValue={task?.title ?? defaults?.title} placeholder="Exercice 5.6, chapitre 3, TP à rendre…" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matière">
              <CourseSelect courses={courses} defaultValue={courseId} onChange={setCourseId} />
            </Field>
            <Field label="Type">
              <select name="kind" className="input" defaultValue={task?.kind ?? defaults?.kind ?? "chapitre"}>
                {TASK_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Colonne">
              <select name="status" className="input" defaultValue={task?.status ?? defaults?.status ?? "todo"}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pour le">
              <input type="date" name="due_date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <SessionPicker
            courseId={courseId}
            mode="day"
            value={dueDate}
            onPick={(session) => setDueDate(format(parseISO(session.start), "yyyy-MM-dd"))}
          />
          {files && (
            <Field
              label="Fichier lié"
              hint={fileChoices.length ? "L'énoncé ou le support où se trouve l'exercice." : "Importe d'abord le fichier sur la page de la matière pour pouvoir le lier."}
            >
              <select name="file_id" className="input" defaultValue={task?.file_id ?? ""} disabled={!fileChoices.length && !task?.file_id}>
                <option value="">Aucun fichier</option>
                {fileChoices.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.folder ? `${f.folder} / ${f.name}` : f.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Détails">
            <textarea name="description" className="input" defaultValue={task?.description} placeholder="Pages, numéros d'exercices, consignes du prof…" />
          </Field>
          <SubmitRow onCancel={onDone} pending={pending}>
            {task && (
              <ConfirmButton onConfirm={async () => { await deleteTask(task.id); onDone(); }} question="Supprimer cette carte ?">
                <Trash2 size={15} /> Supprimer
              </ConfirmButton>
            )}
          </SubmitRow>
        </>
      )}
    </ActionForm>
  );
}
