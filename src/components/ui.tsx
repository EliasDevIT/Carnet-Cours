"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { COURSE_COLORS } from "@/lib/colors";

/** Fenêtre modale native. `children` reçoit `close` pour se fermer après une action. */
export function Dialog({
  trigger,
  title,
  children,
  open: controlledOpen,
  onOpenChange,
  wide,
}: {
  trigger?: (open: () => void) => ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (value: boolean) => (onOpenChange ? onOpenChange(value) : setInnerOpen(value));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() donne le focus au bouton Fermer : on le place plutôt sur le premier champ.
      dialog.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      {trigger?.(() => setOpen(true))}
      <dialog
        ref={ref}
        className="sheet"
        style={wide ? { width: "min(46rem, calc(100vw - 2rem))" } : undefined}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === ref.current) setOpen(false);
        }}
      >
        {open && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="display text-xl font-semibold">{title}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            {children(() => setOpen(false))}
          </div>
        )}
      </dialog>
    </>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <fieldset className="field">
      <legend className="mb-1.5">Couleur</legend>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {COURSE_COLORS.map((color) => (
          <button
            type="button"
            key={color.value}
            title={color.name}
            aria-label={color.name}
            aria-pressed={value === color.value}
            onClick={() => setValue(color.value)}
            className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: color.value,
              borderColor: value === color.value ? "var(--ink)" : "transparent",
              boxShadow: value === color.value ? "inset 0 0 0 2px var(--surface)" : undefined,
            }}
          />
        ))}
        <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-line-strong" title="Autre couleur">
          <input
            type="color"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choisir une autre couleur"
          />
          <span className="pointer-events-none grid h-full place-items-center text-xs text-muted">+</span>
        </label>
      </div>
    </fieldset>
  );
}

export type CourseOption = { id: number; name: string; color: string; trimester_name?: string };

export function CourseSelect({
  courses,
  name = "course_id",
  defaultValue,
  allowEmpty = true,
  required,
  onChange,
}: {
  courses: CourseOption[];
  name?: string;
  defaultValue?: number | null;
  allowEmpty?: boolean;
  required?: boolean;
  onChange?: (courseId: number | null) => void;
}) {
  const groups = Map.groupBy(courses, (c) => c.trimester_name ?? "");
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="input"
      required={required}
      onChange={(e) => onChange?.(Number(e.target.value) || null)}
    >
      {allowEmpty && <option value="">Aucune matière</option>}
      {!allowEmpty && !defaultValue && (
        <option value="" disabled>
          Choisir une matière
        </option>
      )}
      {[...groups].map(([group, list]) =>
        group ? (
          <optgroup key={group} label={group}>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        ) : (
          list.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))
        ),
      )}
    </select>
  );
}

/** Bouton qui demande une confirmation avant d'exécuter une action destructive. */
export function ConfirmButton({
  onConfirm,
  children,
  question = "Supprimer définitivement ?",
  className = "btn btn-ghost btn-danger btn-sm",
  label,
}: {
  onConfirm: () => Promise<unknown> | unknown;
  children: ReactNode;
  question?: string;
  className?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-label={label}
      title={label}
      onClick={() => {
        if (window.confirm(question)) startTransition(async () => void (await onConfirm()));
      }}
    >
      {children}
    </button>
  );
}

export function SubmitRow({ children, onCancel, pending }: { children?: ReactNode; onCancel: () => void; pending?: boolean }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {children}
      <div className="ml-auto flex gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/** Formulaire qui appelle une action serveur puis se ferme. */
export function ActionForm({
  action,
  onDone,
  children,
  className = "grid gap-4",
}: {
  action: (fd: FormData) => Promise<unknown>;
  onDone?: () => void;
  children: (pending: boolean) => ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        startTransition(async () => {
          await action(fd);
          onDone?.();
        });
      }}
    >
      {children(pending)}
    </form>
  );
}
