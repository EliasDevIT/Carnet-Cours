"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteEvaluation, saveEvaluation } from "@/app/actions";
import { SessionPicker } from "./session-picker";
import { toLocalInput } from "@/lib/format";
import { EVALUATION_KINDS, type Evaluation } from "@/lib/types";
import { ActionForm, ConfirmButton, CourseSelect, Field, SubmitRow, type CourseOption } from "./ui";

export function EvaluationForm({
  evaluation,
  courses,
  defaults,
  onDone,
}: {
  evaluation?: Evaluation;
  courses: CourseOption[];
  defaults?: { courseId?: number | null; date?: string; room?: string; kind?: string; title?: string };
  onDone: () => void;
}) {
  const [courseId, setCourseId] = useState<number | null>(evaluation?.course_id ?? defaults?.courseId ?? null);
  const [date, setDate] = useState(evaluation ? toLocalInput(evaluation.date) : defaults?.date ? toLocalInput(defaults.date) : "");
  const [room, setRoom] = useState(evaluation?.room ?? defaults?.room ?? "");

  return (
    <ActionForm action={saveEvaluation} onDone={onDone}>
      {(pending) => (
        <>
          {evaluation && <input type="hidden" name="id" value={evaluation.id} />}
          <Field label="Intitulé">
            <input name="title" className="input" required defaultValue={evaluation?.title ?? defaults?.title} placeholder="Contrôle chapitre 2" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Matière">
              <CourseSelect courses={courses} allowEmpty={false} required defaultValue={courseId} onChange={setCourseId} />
            </Field>
            <Field label="Type">
              <select name="kind" className="input" defaultValue={evaluation?.kind ?? defaults?.kind ?? "controle"}>
                {EVALUATION_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date et heure">
              <input
                type="datetime-local"
                name="date"
                className="input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Salle">
              <input name="room" className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
            </Field>
          </div>
          <SessionPicker
            courseId={courseId}
            mode="slot"
            value={date}
            onPick={(session) => {
              setDate(toLocalInput(session.start));
              if (session.location) setRoom(session.location);
            }}
          />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Coefficient">
              <input name="coefficient" className="input" inputMode="decimal" defaultValue={evaluation?.coefficient ?? 1} />
            </Field>
            <Field label="Note">
              <input name="grade" className="input" inputMode="decimal" defaultValue={evaluation?.grade ?? ""} placeholder="—" />
            </Field>
            <Field label="Sur">
              <input name="grade_max" className="input" inputMode="decimal" defaultValue={evaluation?.grade_max ?? 20} />
            </Field>
          </div>
          <Field label="À réviser">
            <textarea name="notes" className="input" defaultValue={evaluation?.notes} placeholder="Chapitres 1 à 3, fiches de TD…" />
          </Field>
          <SubmitRow onCancel={onDone} pending={pending}>
            {evaluation && (
              <ConfirmButton onConfirm={async () => { await deleteEvaluation(evaluation.id); onDone(); }} question="Supprimer cette évaluation ?">
                <Trash2 size={15} /> Supprimer
              </ConfirmButton>
            )}
          </SubmitRow>
        </>
      )}
    </ActionForm>
  );
}
