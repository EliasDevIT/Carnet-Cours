import { all, get } from "./db";
import type {
  AgendaItem,
  CalEvent,
  CalendarSource,
  Course,
  Evaluation,
  FileRow,
  LinkRow,
  Task,
  Trimester,
} from "./types";

export type CourseWithTrimester = Course & { trimester_name: string };
export type TaskWithCourse = Task & { course_name: string | null; color: string | null; file_name: string | null };
export type FileOption = { id: number; name: string; course_id: number | null; folder: string };
export type EvaluationWithCourse = Evaluation & { course_name: string; color: string };
export type FileWithCourse = FileRow & { course_name: string | null; color: string | null };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const getTrimesters = () => all<Trimester>("SELECT * FROM trimesters ORDER BY position, start_date");

/** Le trimestre en cours, sinon le prochain, sinon le dernier. */
export function getCurrentTrimester(): Trimester | undefined {
  const today = todayIso();
  const trimesters = getTrimesters();
  return (
    trimesters.find((t) => t.start_date <= today && today <= t.end_date) ??
    trimesters.find((t) => t.start_date > today) ??
    trimesters.at(-1)
  );
}

export const getCourses = () =>
  all<CourseWithTrimester>(
    `SELECT c.*, t.name AS trimester_name FROM courses c
     JOIN trimesters t ON t.id = c.trimester_id
     ORDER BY t.position, c.position, c.name`,
  );

export const getCourse = (id: number) =>
  get<CourseWithTrimester>(
    `SELECT c.*, t.name AS trimester_name FROM courses c
     JOIN trimesters t ON t.id = c.trimester_id WHERE c.id = ?`,
    id,
  );

export function getAgendaItems(from: Date, to: Date, courseId?: number): AgendaItem[] {
  const courseFilter = courseId ? " AND c.id = ?" : "";
  const params = courseId ? [from.toISOString(), to.toISOString(), courseId] : [from.toISOString(), to.toISOString()];

  const events = all<CalEvent & { course_name: string | null; color: string | null }>(
    `SELECT e.*, c.name AS course_name, c.color FROM events e
     LEFT JOIN courses c ON c.id = e.course_id
     WHERE e.end > ? AND e.start < ?${courseFilter}
     ORDER BY e.start`,
    ...params,
  );

  const evaluations = all<EvaluationWithCourse>(
    `SELECT v.*, c.name AS course_name, c.color FROM evaluations v
     JOIN courses c ON c.id = v.course_id
     WHERE v.date >= ? AND v.date < ?${courseFilter}
     ORDER BY v.date`,
    ...params,
  );

  const items: AgendaItem[] = [
    ...events.map((e) => ({
      key: `e${e.id}`,
      type: "event" as const,
      id: e.id,
      title: e.summary,
      start: e.start,
      end: e.end,
      allDay: e.all_day === 1,
      location: e.location,
      courseId: e.course_id,
      courseName: e.course_name,
      color: e.color,
    })),
    ...evaluations.map((v) => ({
      key: `v${v.id}`,
      type: "evaluation" as const,
      id: v.id,
      title: v.title,
      start: v.date,
      end: new Date(new Date(v.date).getTime() + 60 * 60 * 1000).toISOString(),
      allDay: false,
      location: v.room,
      courseId: v.course_id,
      courseName: v.course_name,
      color: v.color,
      kind: v.kind,
    })),
  ];
  return items.sort((a, b) => a.start.localeCompare(b.start));
}

export function getTasks(filter: { courseId?: number; trimesterId?: number; status?: string; kinds?: readonly string[] } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.kinds?.length) {
    where.push(`t.kind IN (${filter.kinds.map(() => "?").join(", ")})`);
    params.push(...filter.kinds);
  }
  if (filter.courseId) {
    where.push("t.course_id = ?");
    params.push(filter.courseId);
  }
  if (filter.trimesterId) {
    where.push("(c.trimester_id = ? OR t.course_id IS NULL)");
    params.push(filter.trimesterId);
  }
  if (filter.status) {
    where.push("t.status = ?");
    params.push(filter.status);
  }
  return all<TaskWithCourse>(
    `SELECT t.*, c.name AS course_name, c.color, f.name AS file_name FROM tasks t
     LEFT JOIN courses c ON c.id = t.course_id
     LEFT JOIN files f ON f.id = t.file_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY t.position, t.id`,
    ...params,
  );
}

/** Devoirs pas encore faits, en retard ou à rendre d'ici après-demain. */
export function countHomeworkDue() {
  const limit = new Date();
  limit.setDate(limit.getDate() + 2);
  const iso = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;
  return get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE status != 'done' AND kind IN ('devoir', 'rendu', 'projet') AND due_date IS NOT NULL AND due_date <= ?`,
    iso,
  )!.n;
}

export function getEvaluations(filter: { courseId?: number; from?: string; to?: string } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.courseId) {
    where.push("v.course_id = ?");
    params.push(filter.courseId);
  }
  if (filter.from) {
    where.push("v.date >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    where.push("v.date < ?");
    params.push(filter.to);
  }
  return all<EvaluationWithCourse & { trimester_id: number }>(
    `SELECT v.*, c.name AS course_name, c.color, c.trimester_id FROM evaluations v
     JOIN courses c ON c.id = v.course_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY v.date`,
    ...params,
  );
}

export const getFiles = (courseId: number) =>
  all<FileRow>("SELECT * FROM files WHERE course_id = ? ORDER BY folder, name COLLATE NOCASE", courseId);

/** Liste légère de tous les fichiers, pour lier une carte à un support de cours. */
export const getFileOptions = () =>
  all<FileOption>("SELECT id, name, course_id, folder FROM files ORDER BY folder, name COLLATE NOCASE");

export const getFile = (id: number) =>
  get<FileWithCourse>(
    `SELECT f.*, c.name AS course_name, c.color FROM files f
     LEFT JOIN courses c ON c.id = f.course_id WHERE f.id = ?`,
    id,
  );

export const getRecentFiles = (limit = 6) =>
  all<FileWithCourse>(
    `SELECT f.*, c.name AS course_name, c.color FROM files f
     LEFT JOIN courses c ON c.id = f.course_id
     ORDER BY COALESCE(f.last_opened_at, f.created_at) DESC LIMIT ?`,
    limit,
  );

export const getLinks = () =>
  all<LinkRow & { course_name: string | null; color: string | null }>(
    `SELECT l.*, c.name AS course_name, c.color FROM links l
     LEFT JOIN courses c ON c.id = l.course_id
     ORDER BY l.category COLLATE NOCASE, l.position, l.title COLLATE NOCASE`,
  );

export const getCourseLinks = (courseId: number) =>
  all<LinkRow>("SELECT * FROM links WHERE course_id = ? ORDER BY position, title", courseId);

export const getFavoriteLinks = () =>
  all<LinkRow>("SELECT * FROM links WHERE favorite = 1 ORDER BY position, title COLLATE NOCASE");

export const getSources = () =>
  all<CalendarSource & { event_count: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM events e WHERE e.source_id = s.id) AS event_count
     FROM calendar_sources s ORDER BY s.created_at`,
  );

export const getUnmatchedSummaries = () =>
  all<{ summary: string; count: number }>(
    `SELECT summary, COUNT(*) AS count FROM events WHERE course_id IS NULL
     GROUP BY summary ORDER BY count DESC, summary LIMIT 60`,
  );

export type CourseStats = {
  courseId: number;
  total: number;
  done: number;
  average: number | null;
  nextEvaluation: string | null;
  fileCount: number;
};

/** Moyenne sur 20, pondérée par les coefficients des évaluations notées. */
export function weightedAverage(evals: Pick<Evaluation, "grade" | "grade_max" | "coefficient">[]) {
  const graded = evals.filter((e) => e.grade !== null && e.grade_max > 0);
  const weight = graded.reduce((sum, e) => sum + e.coefficient, 0);
  if (!weight) return null;
  return graded.reduce((sum, e) => sum + ((e.grade as number) / e.grade_max) * 20 * e.coefficient, 0) / weight;
}

export function getCourseStats(): Map<number, CourseStats> {
  const now = new Date().toISOString();
  const taskCounts = all<{ course_id: number; total: number; done: number }>(
    `SELECT course_id, COUNT(*) AS total, SUM(status = 'done') AS done FROM tasks
     WHERE course_id IS NOT NULL GROUP BY course_id`,
  );
  const fileCounts = all<{ course_id: number; n: number }>(
    "SELECT course_id, COUNT(*) AS n FROM files WHERE course_id IS NOT NULL GROUP BY course_id",
  );
  const evals = all<Evaluation>("SELECT * FROM evaluations ORDER BY date");

  const stats = new Map<number, CourseStats>();
  const ensure = (courseId: number) => {
    let s = stats.get(courseId);
    if (!s) {
      s = { courseId, total: 0, done: 0, average: null, nextEvaluation: null, fileCount: 0 };
      stats.set(courseId, s);
    }
    return s;
  };
  for (const t of taskCounts) Object.assign(ensure(t.course_id), { total: t.total, done: t.done ?? 0 });
  for (const f of fileCounts) ensure(f.course_id).fileCount = f.n;

  const byCourse = Map.groupBy(evals, (e) => e.course_id);
  for (const [courseId, list] of byCourse) {
    const s = ensure(courseId);
    s.average = weightedAverage(list);
    s.nextEvaluation = list.find((e) => e.date >= now)?.date ?? null;
  }
  return stats;
}
