import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { CourseFiles } from "./course-files";
import { CourseTasks } from "./course-tasks";
import { CourseActions, CourseEvaluations, CourseLinks } from "./course-side";
import { tint } from "@/lib/colors";
import { capitalize, fmtTime, grade, relativeDay } from "@/lib/format";
import {
  getAgendaItems,
  getCourse,
  getCourseLinks,
  getCourseStats,
  getCourses,
  getEvaluations,
  getFileOptions,
  getFiles,
  getTasks,
  getTrimesters,
} from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse(Number((await params).id));
  return { title: course?.name ?? "Matière" };
}

export default async function CoursePage({ params }: Props) {
  const course = getCourse(Number((await params).id));
  if (!course) notFound();

  const courses = getCourses().map(({ id, name, color, trimester_name }) => ({ id, name, color, trimester_name }));
  const now = new Date();
  const sessions = getAgendaItems(now, new Date(now.getTime() + 28 * 86400000), course.id)
    .filter((item) => item.type === "event")
    .slice(0, 4);
  const stats = getCourseStats().get(course.id);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-sm text-muted">{course.trimester_name}</p>
          <h1 className="display text-[2.2rem] font-bold leading-[1.05] sm:text-[2.8rem]">
            {/* Le titre est surligné de la couleur de la matière, comme dans un cahier. */}
            <span
              className="box-decoration-clone px-1"
              style={{ backgroundImage: `linear-gradient(transparent 58%, ${tint(course.color, 45)} 58%, ${tint(course.color, 45)} 92%, transparent 92%)` }}
            >
              {course.name}
            </span>
          </h1>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            {course.teacher && <span>{course.teacher}</span>}
            {course.room && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} className="text-muted" /> {course.room}
              </span>
            )}
            <span>Coefficient {grade(course.coefficient)}</span>
            {stats?.average != null && <span>Moyenne {grade(Math.round(stats.average * 100) / 100)}/20</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <CourseActions course={course} trimesters={getTrimesters()} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-5">
          <CourseFiles courseId={course.id} files={getFiles(course.id)} color={course.color} />
          <CourseTasks
            courseId={course.id}
            color={course.color}
            tasks={getTasks({ courseId: course.id })}
            courses={courses}
            files={getFileOptions().filter((f) => f.course_id === course.id)}
          />
        </div>

        <aside className="grid content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <section className="panel p-4">
            <h2 className="panel-title mb-3">Prochaines séances</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted">
                Aucune séance dans les 4 prochaines semaines. Importe ton emploi du temps dans l&apos;agenda et vérifie les mots-clés de la matière.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {sessions.map((s) => (
                  <li key={s.key} className="flex gap-3 text-sm">
                    <span className="w-1 shrink-0 rounded-full" style={{ background: course.color }} />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {capitalize(relativeDay(s.start))}, {fmtTime(s.start)} – {fmtTime(s.end)}
                      </span>
                      <span className="block truncate text-xs text-muted" title={s.title}>
                        {s.title}
                        {s.location && `, ${s.location}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <CourseEvaluations course={course} evaluations={getEvaluations({ courseId: course.id })} courses={courses} />
          <CourseLinks course={course} links={getCourseLinks(course.id)} courses={courses} />
          {course.notes && (
            <section className="panel p-4">
              <h2 className="panel-title mb-2">Notes</h2>
              <p className="whitespace-pre-line text-sm text-ink-soft">{course.notes}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
