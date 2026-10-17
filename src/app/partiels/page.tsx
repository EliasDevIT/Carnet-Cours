import type { Metadata } from "next";
import { ExamsView, type RevisionState } from "./exams-view";
import { getCourses, getEvaluations, getTasks } from "@/lib/queries";
import { EXAM_KINDS } from "@/lib/types";

export const metadata: Metadata = { title: "Partiels" };

export default function ExamsPage() {
  const courses = getCourses().map(({ id, name, color, trimester_name, room }) => ({ id, name, color, trimester_name, room }));
  const exams = getEvaluations().filter((e) => EXAM_KINDS.includes(e.kind));

  // Où en est la révision de chaque matière : chapitres et fiches de révision du kanban.
  const revision: Record<number, RevisionState> = {};
  for (const task of getTasks({ kinds: ["chapitre", "revision"] })) {
    if (!task.course_id) continue;
    const state = (revision[task.course_id] ??= { total: 0, done: 0, remaining: [] });
    state.total++;
    if (task.status === "done") state.done++;
    else state.remaining.push({ id: task.id, title: task.title, status: task.status });
  }

  return <ExamsView exams={exams} courses={courses} revision={revision} />;
}
