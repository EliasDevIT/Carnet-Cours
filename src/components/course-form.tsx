"use client";

import { saveCourse } from "@/app/actions";
import { pickColor } from "@/lib/colors";
import type { Course, Trimester } from "@/lib/types";
import { ActionForm, ColorPicker, Field, SubmitRow } from "./ui";

export function CourseForm({
  course,
  trimesters,
  defaultTrimesterId,
  colorIndex = 0,
  onDone,
}: {
  course?: Course;
  trimesters: Trimester[];
  defaultTrimesterId?: number;
  colorIndex?: number;
  onDone: () => void;
}) {
  return (
    <ActionForm action={saveCourse} onDone={onDone}>
      {(pending) => (
        <>
          {course && <input type="hidden" name="id" value={course.id} />}
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field label="Nom de la matière">
              <input name="name" className="input" required defaultValue={course?.name} placeholder="Algèbre linéaire" autoFocus />
            </Field>
            <Field label="Abréviation">
              <input name="short_name" className="input" defaultValue={course?.short_name} placeholder="ALG" maxLength={8} />
            </Field>
          </div>
          <ColorPicker name="color" defaultValue={course?.color ?? pickColor(colorIndex)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trimestre">
              <select name="trimester_id" className="input" defaultValue={course?.trimester_id ?? defaultTrimesterId}>
                {trimesters.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Coefficient">
              <input name="coefficient" className="input" inputMode="decimal" defaultValue={course?.coefficient ?? 1} />
            </Field>
            <Field label="Enseignant·e">
              <input name="teacher" className="input" defaultValue={course?.teacher} />
            </Field>
            <Field label="Salle habituelle">
              <input name="room" className="input" defaultValue={course?.room} />
            </Field>
          </div>
          <Field
            label="Mots-clés de l'emploi du temps"
            hint="Séparés par des virgules. Une séance dont le titre contient le nom, l'abréviation ou un mot-clé est rattachée à cette matière."
          >
            <input name="keywords" className="input" defaultValue={course?.keywords} placeholder="Algèbre, MAT101" />
          </Field>
          <Field label="Notes">
            <textarea name="notes" className="input" defaultValue={course?.notes} placeholder="Modalités d'évaluation, liens utiles…" />
          </Field>
          <SubmitRow onCancel={onDone} pending={pending} />
        </>
      )}
    </ActionForm>
  );
}
