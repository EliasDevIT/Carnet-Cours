"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignLeft, CalendarClock, Paperclip, Plus } from "lucide-react";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveTask } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { Dialog, type CourseOption } from "@/components/ui";
import { NEUTRAL_COLOR } from "@/lib/colors";
import { daysUntil, fmt } from "@/lib/format";
import type { FileOption, TaskWithCourse } from "@/lib/queries";
import { TASK_KINDS, TASK_STATUSES, labelOf, type TaskStatus, type Trimester } from "@/lib/types";

type Columns = Record<TaskStatus, TaskWithCourse[]>;

const group = (tasks: TaskWithCourse[]): Columns => {
  const columns = Object.fromEntries(TASK_STATUSES.map((s) => [s.id, [] as TaskWithCourse[]])) as Columns;
  for (const task of tasks) (columns[task.status] ?? columns.todo).push(task);
  return columns;
};

export function KanbanBoard({
  tasks,
  courses,
  files,
  trimesters,
  filter,
}: {
  tasks: TaskWithCourse[];
  courses: (CourseOption & { trimester_id: number })[];
  files: FileOption[];
  trimesters: Trimester[];
  filter: { courseId: number | null; trimesterId: number | null };
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(() => group(tasks));
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editing, setEditing] = useState<TaskWithCourse | null>(null);
  const [creating, setCreating] = useState<TaskStatus | null>(null);

  // Les données serveur font foi dès qu'elles changent (ajout, modification…).
  const [syncedTasks, setSyncedTasks] = useState(tasks);
  if (tasks !== syncedTasks) {
    setSyncedTasks(tasks);
    setColumns(group(tasks));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id: number | string): TaskStatus | null => {
    if (typeof id === "string" && id in columns) return id as TaskStatus;
    return (Object.keys(columns) as TaskStatus[]).find((status) => columns[status].some((t) => t.id === id)) ?? null;
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(Number(active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(active.id as number);
    const to = findColumn(over.id as number | string);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const moving = prev[from].find((t) => t.id === active.id);
      if (!moving) return prev;
      const overIndex = prev[to].findIndex((t) => t.id === over.id);
      const index = overIndex >= 0 ? overIndex : prev[to].length;
      const target = [...prev[to]];
      target.splice(index, 0, { ...moving, status: to });
      return { ...prev, [from]: prev[from].filter((t) => t.id !== active.id), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const status = findColumn(active.id as number);
    if (!status) return;
    let column = columns[status];
    const oldIndex = column.findIndex((t) => t.id === active.id);
    const newIndex = column.findIndex((t) => t.id === over.id);
    if (newIndex >= 0 && oldIndex !== newIndex) {
      column = arrayMove(column, oldIndex, newIndex);
      setColumns((prev) => ({ ...prev, [status]: column }));
    }
    moveTask(Number(active.id), status, column.map((t) => t.id)).then(() => router.refresh());
  };

  const active = activeId ? Object.values(columns).flat().find((t) => t.id === activeId) : null;
  const visibleCourses = filter.trimesterId ? courses.filter((c) => c.trimester_id === filter.trimesterId) : courses;
  const total = tasks.length;
  const done = columns.done.length;

  return (
    <div className="mx-auto max-w-[96rem]">
      <PageHeader
        title="Kanban"
        subtitle={total ? `${done} carte${done > 1 ? "s" : ""} terminée${done > 1 ? "s" : ""} sur ${total}` : "Chapitres, devoirs et révisions, de « à faire » à « fait »."}
        actions={
          <button className="btn btn-primary" onClick={() => setCreating("todo")}>
            <Plus size={16} /> Nouvelle carte
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {trimesters.map((t) => (
          <FilterChip key={t.id} href={`/kanban?trimestre=${t.id}`} active={filter.trimesterId === t.id && !filter.courseId}>
            {t.name}
          </FilterChip>
        ))}
        <FilterChip href="/kanban?trimestre=tous" active={!filter.trimesterId && !filter.courseId}>
          Toute l&apos;année
        </FilterChip>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <select
          className="input h-8 w-auto text-sm"
          value={filter.courseId ?? ""}
          onChange={(e) => router.push(e.target.value ? `/kanban?cours=${e.target.value}` : "/kanban")}
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <Column key={status.id} status={status.id} label={status.label} tasks={columns[status.id]} onAdd={() => setCreating(status.id)} onOpen={setEditing} />
          ))}
        </div>
        <DragOverlay>{active ? <Card task={active} dragging /> : null}</DragOverlay>
      </DndContext>

      <Dialog title="Carte" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <TaskForm task={editing} courses={courses} files={files} onDone={close} />}
      </Dialog>
      <Dialog title="Nouvelle carte" open={creating !== null} onOpenChange={(o) => !o && setCreating(null)}>
        {(close) => (
          <TaskForm
            courses={visibleCourses.length ? visibleCourses : courses}
            files={files}
            defaults={{ status: creating ?? "todo", courseId: filter.courseId }}
            onDone={close}
          />
        )}
      </Dialog>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`chip h-8 border px-3 text-sm ${active ? "border-ink bg-ink text-surface" : "border-line-strong text-ink-soft hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}

function Column({
  status,
  label,
  tasks,
  onAdd,
  onOpen,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskWithCourse[];
  onAdd: () => void;
  onOpen: (task: TaskWithCourse) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section className={`flex min-h-[18rem] flex-col rounded-2xl border p-3 transition-colors ${isOver ? "border-accent/50 bg-accent/5" : "border-line bg-sunken/70"}`}>
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-baseline gap-2 font-semibold">
          {label}
          <span className="text-sm font-normal text-muted">{tasks.length}</span>
        </h2>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onAdd} aria-label={`Ajouter une carte dans ${label}`} title="Ajouter une carte">
          <Plus size={16} />
        </button>
      </header>
      <SortableContext id={status} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="grid flex-1 content-start gap-2">
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && <li className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-sm text-muted">Dépose une carte ici</li>}
        </ul>
      </SortableContext>
    </section>
  );
}

function SortableCard({ task, onOpen }: { task: TaskWithCourse; onOpen: (task: TaskWithCourse) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") onOpen(task);
      }}
      className="cursor-grab touch-none rounded-xl active:cursor-grabbing"
    >
      <Card task={task} />
    </li>
  );
}

function Card({ task, dragging }: { task: TaskWithCourse; dragging?: boolean }) {
  const color = task.color ?? NEUTRAL_COLOR;
  const isDone = task.status === "done";
  const days = task.due_date ? daysUntil(task.due_date) : null;
  const late = days !== null && days < 0 && !isDone;
  const soon = days !== null && days >= 0 && days <= 2 && !isDone;

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-line bg-surface py-2.5 pl-4 pr-3 ${dragging ? "rotate-[1.5deg] shadow-xl" : "hover:border-line-strong"}`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <p className="mb-1 flex items-center gap-1.5 text-[0.72rem] font-semibold" style={{ color: task.color ?? "var(--muted)" }}>
        <span className="truncate">{task.course_name ?? "Sans matière"}</span>
        <span className="font-normal text-muted">{labelOf(TASK_KINDS, task.kind)}</span>
      </p>
      <p className={`text-[0.92rem] font-medium leading-snug ${isDone ? "text-muted line-through" : ""}`}>{task.title}</p>
      {(task.due_date || task.description || task.file_name) && (
        <p className="mt-2 flex items-center gap-3 text-xs text-muted">
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${late ? "font-semibold text-danger" : soon ? "font-semibold text-ink" : ""}`}>
              <CalendarClock size={13} />
              {late ? `En retard, ${fmt(task.due_date, "d MMM")}` : days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : fmt(task.due_date, "EEE d MMM")}
            </span>
          )}
          {task.description && <AlignLeft size={13} aria-label="A des détails" />}
          {task.file_name && (
            <span className="inline-flex min-w-0 items-center gap-1" title={task.file_name}>
              <Paperclip size={13} className="shrink-0" />
              <span className="truncate">{task.file_name}</span>
            </span>
          )}
        </p>
      )}
    </article>
  );
}
