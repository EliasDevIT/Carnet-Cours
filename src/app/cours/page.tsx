import type { Metadata } from "next";
import { CoursesBoard } from "./courses-board";
import { getCourseStats, getCourses, getCurrentTrimester, getTrimesters } from "@/lib/queries";

export const metadata: Metadata = { title: "Mes cours" };

export default function CoursesPage() {
  const stats = getCourseStats();
  return (
    <CoursesBoard
      trimesters={getTrimesters()}
      courses={getCourses()}
      currentTrimesterId={getCurrentTrimester()?.id ?? null}
      stats={Object.fromEntries(stats)}
    />
  );
}
