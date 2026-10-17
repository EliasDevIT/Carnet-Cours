import type { Metadata } from "next";
import { HomeworkView } from "./homework-view";
import { getCourses, getEvaluations, getFileOptions, getTasks } from "@/lib/queries";
import { GRADED_HOMEWORK_KINDS, HOMEWORK_KINDS } from "@/lib/types";

export const metadata: Metadata = { title: "Devoirs" };

export default function HomeworkPage() {
  const courses = getCourses().map(({ id, name, color, trimester_name, room }) => ({ id, name, color, trimester_name, room }));
  return (
    <HomeworkView
      tasks={getTasks({ kinds: HOMEWORK_KINDS })}
      gradedWork={getEvaluations().filter((e) => GRADED_HOMEWORK_KINDS.includes(e.kind))}
      courses={courses}
      files={getFileOptions()}
    />
  );
}
