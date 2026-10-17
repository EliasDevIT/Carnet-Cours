import type { Metadata } from "next";
import { KanbanBoard } from "./kanban-board";
import { getCourses, getCurrentTrimester, getFileOptions, getTasks, getTrimesters } from "@/lib/queries";

export const metadata: Metadata = { title: "Kanban" };

type Props = { searchParams: Promise<{ cours?: string; trimestre?: string }> };

export default async function KanbanPage({ searchParams }: Props) {
  const params = await searchParams;
  const courseId = Number(params.cours) || undefined;
  const trimesters = getTrimesters();
  // Par défaut on affiche le trimestre en cours ; « tous » affiche toute l'année.
  const trimesterId =
    courseId || params.trimestre === "tous" ? undefined : Number(params.trimestre) || getCurrentTrimester()?.id;

  const courses = getCourses().map(({ id, name, color, trimester_name, trimester_id }) => ({ id, name, color, trimester_name, trimester_id }));

  return (
    <KanbanBoard
      tasks={getTasks({ courseId, trimesterId })}
      courses={courses}
      files={getFileOptions()}
      trimesters={trimesters}
      filter={{ courseId: courseId ?? null, trimesterId: trimesterId ?? null }}
    />
  );
}
