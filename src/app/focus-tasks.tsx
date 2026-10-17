"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useTransition } from "react";
import { setTaskStatus } from "@/app/actions";
import { NEUTRAL_COLOR } from "@/lib/colors";
import { daysUntil, fmt } from "@/lib/format";
import type { TaskWithCourse } from "@/lib/queries";

export function FocusTasks({ tasks }: { tasks: TaskWithCourse[] }) {
  const [pending, startTransition] = useTransition();
  if (!tasks.length)
    return (
      <p className="text-sm text-muted">
        Rien d&apos;urgent. Les cartes « en cours » et celles à rendre dans la semaine apparaîtront ici.
      </p>
    );
  return (
    <ul className="grid gap-1">
      {tasks.map((task) => {
        const days = task.due_date ? daysUntil(task.due_date) : null;
        const color = task.color ?? NEUTRAL_COLOR;
        return (
          <li key={task.id} className="flex items-start gap-3 rounded-lg px-1.5 py-1.5 hover:bg-sunken">
            <button
              disabled={pending}
              onClick={() => startTransition(() => setTaskStatus(task.id, "done"))}
              className="group mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-2"
              style={{ borderColor: color }}
              aria-label={`Marquer « ${task.title} » comme fait`}
              title="Marquer comme fait"
            >
              <Check size={12} strokeWidth={3} className="opacity-0 group-hover:opacity-60" style={{ color }} />
            </button>
            <Link href={task.file_id ? `/fichiers/${task.file_id}` : "/devoirs"} className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-snug">{task.title}</span>
              <span className="flex gap-2 text-xs text-muted">
                <span style={{ color: task.color ?? undefined }}>{task.course_name ?? "Sans matière"}</span>
                {task.status === "doing" && <span>en cours</span>}
                {days !== null && (
                  <span className={days < 0 ? "font-semibold text-danger" : days <= 1 ? "font-semibold text-ink" : ""}>
                    {days < 0 ? `en retard depuis le ${fmt(task.due_date!, "d MMM")}` : days === 0 ? "pour aujourd'hui" : days === 1 ? "pour demain" : `pour ${fmt(task.due_date!, "EEEE")}`}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
