"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { saveTask, setTaskStatus } from "@/app/actions";
import { TaskForm } from "@/components/task-form";
import { Dialog, type CourseOption } from "@/components/ui";
import { tint } from "@/lib/colors";
import { daysUntil, fmt } from "@/lib/format";
import type { FileOption } from "@/lib/queries";
import { TASK_KINDS, TASK_STATUSES, labelOf, type Task } from "@/lib/types";

export function CourseTasks({
  courseId,
  color,
  tasks,
  courses,
  files,
}: {
  courseId: number;
  color: string;
  tasks: Task[];
  courses: CourseOption[];
  files: FileOption[];
}) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="panel-title">Suivi</h2>
        <Link href={`/kanban?cours=${courseId}`} className="text-sm text-muted hover:text-ink">
          Voir dans le kanban
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted">
        {tasks.length ? `${done} sur ${tasks.length} terminé${done > 1 ? "s" : ""}` : "Ajoute les chapitres, devoirs et révisions de cette matière."}
      </p>

      {tasks.length > 0 && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: tint(color, 22) }}>
          <div className="h-full rounded-full transition-[width]" style={{ width: `${(done / tasks.length) * 100}%`, background: color }} />
        </div>
      )}

      <form
        ref={formRef}
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (!String(fd.get("title")).trim()) return;
          startTransition(async () => {
            await saveTask(fd);
            formRef.current?.reset();
          });
        }}
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input name="title" className="input" placeholder="Nouveau chapitre ou devoir" aria-label="Nouvelle carte" />
        <button className="btn btn-icon shrink-0" disabled={pending} aria-label="Ajouter">
          <Plus size={16} />
        </button>
      </form>

      <div className="grid gap-4">
        {TASK_STATUSES.map((status) => {
          const list = tasks.filter((t) => t.status === status.id);
          if (!list.length) return null;
          return (
            <div key={status.id}>
              <h3 className="mb-1 text-xs font-semibold text-muted">
                {status.label} <span className="font-normal">{list.length}</span>
              </h3>
              <ul className="grid gap-px">
                {list.map((task) => {
                  const isDone = task.status === "done";
                  const late = task.due_date && !isDone && daysUntil(task.due_date) < 0;
                  return (
                    <li key={task.id} className="flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-sunken">
                      <button
                        onClick={() => startTransition(() => setTaskStatus(task.id, isDone ? "todo" : "done"))}
                        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-2"
                        style={{ borderColor: color, background: isDone ? color : "transparent" }}
                        aria-label={isDone ? "Marquer à faire" : "Marquer comme fait"}
                      >
                        {isDone && <Check size={12} strokeWidth={3} className="text-white" />}
                      </button>
                      <button onClick={() => setEditing(task)} className={`min-w-0 flex-1 truncate text-left text-sm ${isDone ? "text-muted line-through" : ""}`}>
                        {task.title}
                      </button>
                      <span className="hidden text-xs text-muted sm:inline">{labelOf(TASK_KINDS, task.kind)}</span>
                      {task.due_date && (
                        <span className={`text-xs ${late ? "font-semibold text-danger" : "text-muted"}`}>{fmt(task.due_date, "d MMM")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <Dialog title="Carte" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <TaskForm task={editing} courses={courses} files={files} onDone={close} />}
      </Dialog>
    </section>
  );
}
