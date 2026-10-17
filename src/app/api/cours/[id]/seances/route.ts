import { startOfDay } from "date-fns";
import { getAgendaItems } from "@/lib/queries";
import type { CourseSession } from "@/lib/types";

/** Les prochaines séances d'une matière dans l'emploi du temps (pas encore commencées, sur quatre mois). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const courseId = Number((await params).id);
  if (!courseId) return Response.json([]);

  const now = new Date();
  const to = new Date(startOfDay(now).getTime() + 120 * 86_400_000);
  const sessions: CourseSession[] = getAgendaItems(now, to, courseId)
    .filter((item) => item.type === "event" && !item.allDay && new Date(item.start) > now)
    .slice(0, 16)
    .map(({ start, end, location, title }) => ({ start, end, location, title }));

  return Response.json(sessions, { headers: { "Cache-Control": "no-store" } });
}
