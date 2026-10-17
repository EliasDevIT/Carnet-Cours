"use client";

import Link from "next/link";
import { Check, FileText, GraduationCap, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { addDays, endOfWeek, format, startOfDay } from "date-fns";
import { setTaskStatus } from "@/app/actions";
import { EvaluationForm } from "@/components/evaluation-form";
import { EmptyState, PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { Dialog, type CourseOption } from "@/components/ui";
import { NEUTRAL_COLOR } from "@/lib/colors";
import { capitalize, daysUntil, fmt, grade } from "@/lib/format";
import type { EvaluationWithCourse, FileOption, TaskWithCourse } from "@/lib/queries";
import { EVALUATION_KINDS, TASK_KINDS, labelOf } from "@/lib/types";

type Item =
  | { key: string; type: "task"; due: string | null; done: boolean; courseId: number | null; task: TaskWithCourse }
  | { key: string; type: "graded"; due: string; done: boolean; courseId: number; evaluation: EvaluationWithCourse };

type Group = { id: string; label: string; items: Item[]; tone?: "danger" };

/** Regroupe les devoirs à faire par échéance, du plus urgent au plus lointain. */
function groupByDue(items: Item[]): Group[] {
  const today = startOfDay(new Date());
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  const todayIso = iso(today);
  const tomorrowIso = iso(addDays(today, 1));
  const weekEnd = iso(endOfWeek(today, { weekStartsOn: 1 }));
  const nextWeekEnd = iso(addDays(endOfWeek(today, { weekStartsOn: 1 }), 7));

  const groups: Group[] = [
    { id: "late", label: "En retard", items: [], tone: "danger" },
    { id: "today", label: "Pour aujourd'hui", items: [] },
    { id: "tomorrow", label: "Pour demain", items: [] },
    { id: "week", label: "Cette semaine", items: [] },
    { id: "next", label: "La semaine prochaine", items: [] },
    { id: "later", label: "Plus tard", items: [] },
    { id: "none", label: "Sans échéance", items: [] },
  ];
  const at = (id: string) => groups.find((g) => g.id === id)!.items;

  for (const item of items) {
    const day = item.due?.slice(0, 10) ?? null;
    if (!day) at("none").push(item);
    else if (day < todayIso) at("late").push(item);
    else if (day === todayIso) at("today").push(item);
    else if (day === tomorrowIso) at("tomorrow").push(item);
    else if (day <= weekEnd) at("week").push(item);
    else if (day <= nextWeekEnd) at("next").push(item);
    else at("later").push(item);
  }
  for (const g of groups) g.items.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  return groups.filter((g) => g.items.length);
}

export function HomeworkView({
  tasks,
  gradedWork,
  courses,
  files,
}: {
  tasks: TaskWithCourse[];
  gradedWork: EvaluationWithCourse[];
  courses: CourseOption[];
  files: FileOption[];
}) {
  const [view, setView] = useState<"todo" | "done">("todo");
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithCourse | null>(null);
  const [editingGraded, setEditingGraded] = useState<EvaluationWithCourse | null>(null);
  const [creating, setCreating] = useState<"task" | "graded" | null>(null);

  const startOfToday = startOfDay(new Date()).toISOString();
  const items: Item[] = [
    ...tasks.map((task) => ({
      key: `t${task.id}`,
      type: "task" as const,
      due: task.due_date,
      done: task.status === "done",
      courseId: task.course_id,
      task,
    })),
    ...gradedWork.map((evaluation) => ({
      key: `e${evaluation.id}`,
      type: "graded" as const,
      due: evaluation.date,
      done: evaluation.date < startOfToday,
      courseId: evaluation.course_id,
      evaluation,
    })),
  ].filter((item) => !courseFilter || item.courseId === courseFilter);

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done).sort((a, b) => (b.due ?? "").localeCompare(a.due ?? ""));
  const late = todo.filter((i) => i.due && i.due.slice(0, 10) < format(new Date(), "yyyy-MM-dd")).length;
  const groups = groupByDue(todo);

  const subtitle = todo.length
    ? `${todo.length} à faire${late ? `, dont ${late} en retard` : ""}`
    : "Exercices, rendus et projets, classés par échéance.";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Devoirs"
        subtitle={subtitle}
        actions={
          <>
            <button className="btn" onClick={() => setCreating("graded")} disabled={!courses.length} title="Un rendu ou projet qui sera noté">
              <GraduationCap size={16} /> Rendu noté
            </button>
            <button className="btn btn-primary" onClick={() => setCreating("task")}>
              <Plus size={16} /> Ajouter un devoir
            </button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line-strong bg-surface p-0.5" role="tablist" aria-label="Afficher">
          {(["todo", "done"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? "bg-ink text-surface" : "text-ink-soft hover:text-ink"}`}
            >
              {v === "todo" ? `À faire (${todo.length})` : `Faits (${done.length})`}
            </button>
          ))}
        </div>
        <select
          className="input h-9 w-auto text-sm"
          value={courseFilter ?? ""}
          onChange={(e) => setCourseFilter(Number(e.target.value) || null)}
          aria-label="Filtrer par matière"
        >
          <option value="">Toutes les matières</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {view === "todo" &&
        (groups.length === 0 ? (
          <EmptyState
            title="Aucun devoir à faire"
            action={
              <button className="btn btn-primary" onClick={() => setCreating("task")}>
                <Plus size={16} /> Ajouter un devoir
              </button>
            }
          >
            Note ici chaque exercice ou rendu dès qu&apos;il est donné, avec la date et le fichier de l&apos;énoncé.
          </EmptyState>
        ) : (
          <div className="grid gap-8">
            {groups.map((group) => (
              <section key={group.id}>
                <h2 className={`mb-2 flex items-baseline gap-2 font-semibold ${group.tone === "danger" ? "text-danger" : ""}`}>
                  {group.label}
                  <span className="text-sm font-normal text-muted">{group.items.length}</span>
                </h2>
                <ul className="grid gap-2">
                  {group.items.map((item) => (
                    <Row key={item.key} item={item} onEditTask={setEditingTask} onEditGraded={setEditingGraded} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}

      {view === "done" &&
        (done.length === 0 ? (
          <p className="text-sm text-muted">Rien de terminé pour l&apos;instant.</p>
        ) : (
          <ul className="grid gap-2">
            {done.map((item) => (
              <Row key={item.key} item={item} onEditTask={setEditingTask} onEditGraded={setEditingGraded} />
            ))}
          </ul>
        ))}

      <Dialog title="Devoir" open={editingTask !== null} onOpenChange={(o) => !o && setEditingTask(null)}>
        {(close) => editingTask && <TaskForm task={editingTask} courses={courses} files={files} onDone={close} />}
      </Dialog>
      <Dialog title="Rendu noté" open={editingGraded !== null} onOpenChange={(o) => !o && setEditingGraded(null)}>
        {(close) => editingGraded && <EvaluationForm evaluation={editingGraded} courses={courses} onDone={close} />}
      </Dialog>
      <Dialog title="Nouveau devoir" open={creating === "task"} onOpenChange={(o) => !o && setCreating(null)}>
        {(close) => <TaskForm courses={courses} files={files} defaults={{ kind: "devoir", courseId: courseFilter }} onDone={close} />}
      </Dialog>
      <Dialog title="Nouveau rendu noté" open={creating === "graded"} onOpenChange={(o) => !o && setCreating(null)}>
        {(close) => <EvaluationForm courses={courses} defaults={{ kind: "rendu", courseId: courseFilter }} onDone={close} />}
      </Dialog>
    </div>
  );
}

function dueLabel(due: string, withTime: boolean) {
  const days = daysUntil(due);
  const date = capitalize(fmt(due, withTime ? "EEE d MMM 'à' H'h'mm" : "EEE d MMM"));
  if (days < 0) return { text: `${date}, il y a ${-days} j`, late: true };
  if (days === 0) return { text: withTime ? `Aujourd'hui à ${fmt(due, "H'h'mm")}` : "Aujourd'hui", late: false };
  if (days === 1) return { text: withTime ? `Demain à ${fmt(due, "H'h'mm")}` : "Demain", late: false };
  return { text: `${date}, dans ${days} j`, late: false };
}

function Row({
  item,
  onEditTask,
  onEditGraded,
}: {
  item: Item;
  onEditTask: (task: TaskWithCourse) => void;
  onEditGraded: (evaluation: EvaluationWithCourse) => void;
}) {
  const [pending, startTransition] = useTransition();

  if (item.type === "graded") {
    const e = item.evaluation;
    const due = dueLabel(e.date, true);
    return (
      <li>
        <button
          onClick={() => onEditGraded(e)}
          className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface py-3 pl-4 pr-4 text-left hover:border-line-strong"
        >
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: e.color }} />
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-white" style={{ background: e.color }}>
            <GraduationCap size={13} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{e.title}</span>
            <span className="mt-0.5 block text-xs text-muted">
              <span className="font-semibold" style={{ color: e.color }}>
                {e.course_name}
              </span>
              , {labelOf(EVALUATION_KINDS, e.kind).toLowerCase()} noté, coef. {grade(e.coefficient)}
            </span>
            {e.notes && <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{e.notes}</span>}
          </span>
          <span className="shrink-0 text-right text-sm">
            {item.done ? (
              e.grade !== null ? (
                <span className="display font-semibold">
                  {grade(e.grade)}
                  <span className="text-xs font-normal text-muted">/{grade(e.grade_max)}</span>
                </span>
              ) : (
                <span className="text-xs text-accent">Ajouter la note</span>
              )
            ) : (
              <span className={due.late ? "font-semibold text-danger" : "text-ink-soft"}>{due.text}</span>
            )}
          </span>
        </button>
      </li>
    );
  }

  const t = item.task;
  const color = t.color ?? NEUTRAL_COLOR;
  const due = t.due_date ? dueLabel(t.due_date, false) : null;
  return (
    <li className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface py-3 pl-4 pr-4 hover:border-line-strong">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <button
        disabled={pending}
        onClick={() => startTransition(() => setTaskStatus(t.id, item.done ? "todo" : "done"))}
        className="group mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2"
        style={{ borderColor: color, background: item.done ? color : "transparent" }}
        aria-label={item.done ? `Remettre « ${t.title} » à faire` : `Marquer « ${t.title} » comme fait`}
        title={item.done ? "Remettre à faire" : "Marquer comme fait"}
      >
        <Check size={13} strokeWidth={3} className={item.done ? "text-white" : "opacity-0 group-hover:opacity-50"} style={item.done ? undefined : { color }} />
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={() => onEditTask(t)} className={`block text-left font-semibold leading-snug hover:underline ${item.done ? "text-muted line-through" : ""}`}>
          {t.title}
        </button>
        <p className="mt-0.5 text-xs text-muted">
          <span className="font-semibold" style={{ color: t.color ?? undefined }}>
            {t.course_name ?? "Sans matière"}
          </span>
          , {labelOf(TASK_KINDS, t.kind).toLowerCase()}
          {t.status === "doing" && ", en cours"}
        </p>
        {t.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{t.description}</p>}
        {t.file_id && t.file_name && (
          <Link
            href={`/fichiers/${t.file_id}`}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-sunken px-2 py-1 text-xs font-medium hover:bg-line"
          >
            <FileText size={13} className="shrink-0 text-accent" />
            <span className="truncate">{t.file_name}</span>
          </Link>
        )}
      </div>
      {due && <span className={`shrink-0 text-right text-sm ${due.late && !item.done ? "font-semibold text-danger" : "text-ink-soft"}`}>{due.text}</span>}
    </li>
  );
}
