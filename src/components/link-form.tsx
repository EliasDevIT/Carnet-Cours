"use client";

import { saveLink } from "@/app/actions";
import type { LinkRow } from "@/lib/types";
import { ActionForm, CourseSelect, Field, SubmitRow, type CourseOption } from "./ui";

export function LinkForm({
  link,
  courses,
  categories,
  defaultCourseId,
  onDone,
}: {
  link?: Partial<LinkRow>;
  courses: CourseOption[];
  categories: string[];
  defaultCourseId?: number;
  onDone: () => void;
}) {
  return (
    <ActionForm action={saveLink} onDone={onDone}>
      {(pending) => (
        <>
          {link?.id && <input type="hidden" name="id" value={link.id} />}
          <Field label="Adresse">
            <input name="url" className="input" required defaultValue={link?.url} placeholder="github.com/mon-profil" autoFocus />
          </Field>
          <Field label="Nom" hint="Laisse vide pour utiliser le nom du site.">
            <input name="title" className="input" defaultValue={link?.title} placeholder="GitHub" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <input name="category" className="input" list="link-categories" defaultValue={link?.category ?? "Général"} />
              <datalist id="link-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Matière">
              <CourseSelect courses={courses} defaultValue={link?.course_id ?? defaultCourseId} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="favorite" defaultChecked={link ? link.favorite === 1 : true} className="h-4 w-4 accent-[var(--accent)]" />
            Afficher dans les favoris de l&apos;accueil
          </label>
          <SubmitRow onCancel={onDone} pending={pending} />
        </>
      )}
    </ActionForm>
  );
}
