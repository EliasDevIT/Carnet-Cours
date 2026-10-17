import type { Metadata } from "next";
import { ControlsView } from "./controls-view";
import { getCourses, getEvaluations, getTrimesters, weightedAverage } from "@/lib/queries";
import { isQuizKind } from "@/lib/types";

export const metadata: Metadata = { title: "Contrôles" };

export default function ControlsPage() {
  const courses = getCourses();
  const evaluations = getEvaluations();
  const trimesters = getTrimesters();

  // Moyenne de chaque matière, puis moyenne du trimestre pondérée par les coefficients des matières.
  const averages = trimesters.map((trimester) => {
    const rows = courses
      .filter((c) => c.trimester_id === trimester.id)
      .map((course) => ({
        course,
        average: weightedAverage(evaluations.filter((e) => e.course_id === course.id)),
        count: evaluations.filter((e) => e.course_id === course.id && e.grade !== null).length,
      }));
    const graded = rows.filter((r) => r.average !== null);
    const weight = graded.reduce((sum, r) => sum + r.course.coefficient, 0);
    const average = weight ? graded.reduce((sum, r) => sum + (r.average as number) * r.course.coefficient, 0) / weight : null;
    return { trimester, rows, average };
  });

  return (
    <ControlsView
      // Les partiels et les rendus ont leurs propres pages ; les moyennes, elles, comptent toutes les notes.
      evaluations={evaluations.filter((e) => isQuizKind(e.kind))}
      averages={averages}
      courses={courses.map(({ id, name, color, trimester_name, room }) => ({ id, name, color, trimester_name, room }))}
    />
  );
}
