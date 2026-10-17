import type { Metadata } from "next";
import { addDays, endOfMonth, endOfWeek, format, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { AgendaView } from "./agenda-view";
import { CalendarSources } from "./calendar-sources";
import { getAgendaItems, getCourses, getEvaluations, getSources, getUnmatchedSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Agenda" };

type Props = { searchParams: Promise<{ vue?: string; date?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const view = params.vue === "mois" ? "mois" : "semaine";
  const parsed = params.date ? parseISO(params.date) : new Date();
  const anchor = isValid(parsed) ? parsed : new Date();

  const from =
    view === "mois" ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }) : startOfWeek(anchor, { weekStartsOn: 1 });
  const to = view === "mois" ? addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1) : addDays(from, 7);

  const courses = getCourses().map(({ id, name, color, trimester_name, room }) => ({ id, name, color, trimester_name, room }));

  return (
    <div className="mx-auto max-w-7xl">
      <AgendaView
        view={view}
        anchor={format(anchor, "yyyy-MM-dd")}
        from={from.toISOString()}
        items={getAgendaItems(from, to)}
        evaluations={getEvaluations({ from: from.toISOString(), to: to.toISOString() })}
        courses={courses}
        hasSources={getSources().length > 0}
      />
      <CalendarSources sources={getSources()} unmatched={getUnmatchedSummaries()} courses={courses} />
    </div>
  );
}
