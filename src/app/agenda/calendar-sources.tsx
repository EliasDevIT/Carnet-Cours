"use client";

import { LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { addCalendarSource, assignSummary, deleteCalendarSource, syncCalendarSource, type FormState } from "@/app/actions";
import { ConfirmButton, Field, type CourseOption } from "@/components/ui";
import { ago } from "@/lib/format";
import type { CalendarSource } from "@/lib/types";

type Source = CalendarSource & { event_count: number };

export function CalendarSources({
  sources,
  unmatched,
  courses,
}: {
  sources: Source[];
  unmatched: { summary: string; count: number }[];
  courses: CourseOption[];
}) {
  const [state, formAction, adding] = useActionState<FormState, FormData>(addCalendarSource, null);
  const [mode, setMode] = useState<"url" | "file">("url");

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-2">
      <section className="panel p-5">
        <h2 className="panel-title">Emploi du temps</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Un lien .ics (souvent dans l&apos;ENT, Hyperplanning ou ADE, rubrique « exporter » ou « s&apos;abonner ») se met à jour tout seul. Un fichier .ics est importé une fois.
        </p>

        {sources.length > 0 && (
          <ul className="mb-5 grid gap-2">
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
        )}

        <form action={formAction} className="grid gap-3 rounded-xl bg-sunken p-4">
          <div className="flex gap-1 text-sm" role="tablist">
            {(["url", "file"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 font-medium ${mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {m === "url" ? "Lien" : "Fichier"}
              </button>
            ))}
          </div>
          <Field label="Nom">
            <input name="name" className="input" placeholder="Emploi du temps de l'école" />
          </Field>
          {mode === "url" ? (
            <Field label="Lien .ics">
              <input name="url" className="input" type="url" placeholder="https://…/calendar.ics" required />
            </Field>
          ) : (
            <Field label="Fichier .ics">
              <input name="file" type="file" accept=".ics,text/calendar" className="input py-1.5" required />
            </Field>
          )}
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.message && <p className="text-sm text-ok">{state.message}</p>}
          <div>
            <button className="btn btn-primary" disabled={adding}>
              {adding && <LoaderCircle size={15} className="animate-spin" />}
              Importer
            </button>
          </div>
        </form>
      </section>

      <section className="panel p-5">
        <h2 className="panel-title">Séances sans matière</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Rattache chaque intitulé à une matière pour qu&apos;il prenne sa couleur. Les séances suivantes au même nom suivront.
        </p>
        {unmatched.length === 0 ? (
          <p className="text-sm text-muted">{sources.length ? "Toutes les séances sont rattachées." : "Rien à rattacher pour l'instant."}</p>
        ) : (
          <ul className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
            {unmatched.map((u) => (
              <UnmatchedRow key={u.summary} summary={u.summary} count={u.count} courses={courses} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SourceRow({ source }: { source: Source }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{source.name}</p>
        <p className="truncate text-xs text-muted">
          {source.event_count} séances, {source.url ? (source.last_sync ? `mis à jour ${ago(source.last_sync)}` : "jamais synchronisé") : "fichier importé"}
        </p>
        {(error ?? source.last_error) && <p className="mt-1 text-xs text-danger">{error ?? source.last_error}</p>}
      </div>
      {source.url && (
        <button
          className="btn btn-ghost btn-icon btn-sm"
          disabled={pending}
          aria-label="Synchroniser"
          title="Synchroniser"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await syncCalendarSource(source.id);
              } catch (e) {
                setError((e as Error).message);
              }
            })
          }
        >
          <RefreshCw size={15} className={pending ? "animate-spin" : ""} />
        </button>
      )}
      <ConfirmButton
        onConfirm={() => deleteCalendarSource(source.id)}
        question={`Retirer « ${source.name} » et ses ${source.event_count} séances ?`}
        label="Retirer"
        className="btn btn-ghost btn-danger btn-icon btn-sm"
      >
        <Trash2 size={15} />
      </ConfirmButton>
    </li>
  );
}

function UnmatchedRow({ summary, count, courses }: { summary: string; count: number; courses: CourseOption[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={summary}>
          {summary}
        </span>
        <span className="text-xs text-muted">{count} séance{count > 1 ? "s" : ""}</span>
      </span>
      <select
        className="input h-8 w-auto max-w-[12rem] text-sm"
        defaultValue=""
        disabled={pending || !courses.length}
        aria-label={`Matière pour ${summary}`}
        onChange={(e) => {
          const courseId = Number(e.target.value);
          if (courseId) startTransition(() => assignSummary(summary, courseId));
        }}
      >
        <option value="" disabled>
          {courses.length ? "Rattacher à…" : "Crée d'abord une matière"}
        </option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </li>
  );
}
