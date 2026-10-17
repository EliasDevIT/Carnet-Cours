export type Trimester = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  position: number;
};

export type Course = {
  id: number;
  trimester_id: number;
  name: string;
  short_name: string;
  color: string;
  teacher: string;
  room: string;
  keywords: string;
  coefficient: number;
  notes: string;
  position: number;
};

export type FileRow = {
  id: number;
  course_id: number | null;
  name: string;
  stored_name: string;
  ext: string;
  mime: string;
  size: number;
  folder: string;
  preview_status: "none" | "pending" | "ready" | "failed";
  preview_name: string | null;
  created_at: string;
  last_opened_at: string | null;
};

export const TASK_STATUSES = [
  { id: "todo", label: "À faire" },
  { id: "doing", label: "En cours" },
  { id: "review", label: "À revoir" },
  { id: "done", label: "Fait" },
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number]["id"];

export const TASK_KINDS = [
  { id: "chapitre", label: "Chapitre" },
  { id: "devoir", label: "Devoir" },
  { id: "rendu", label: "Rendu" },
  { id: "revision", label: "Révision" },
  { id: "projet", label: "Projet" },
  { id: "autre", label: "Autre" },
] as const;
export type TaskKind = (typeof TASK_KINDS)[number]["id"];

/** Cartes affichées dans la page Devoirs. */
export const HOMEWORK_KINDS: readonly string[] = ["devoir", "rendu", "projet"];

export type Task = {
  id: number;
  course_id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  kind: TaskKind;
  due_date: string | null;
  position: number;
  created_at: string;
  done_at: string | null;
  file_id: number | null;
};

export const EVALUATION_KINDS = [
  { id: "controle", label: "Contrôle" },
  { id: "partiel", label: "Partiel" },
  { id: "examen", label: "Examen" },
  { id: "oral", label: "Oral" },
  { id: "tp", label: "TP noté" },
  { id: "projet", label: "Projet" },
  { id: "rendu", label: "Rendu" },
] as const;
export type EvaluationKind = (typeof EVALUATION_KINDS)[number]["id"];

/** Répartition des évaluations entre les pages Partiels, Devoirs (rendus notés) et Contrôles. */
export const EXAM_KINDS: readonly string[] = ["partiel", "examen"];
export const GRADED_HOMEWORK_KINDS: readonly string[] = ["rendu", "projet"];
export const isQuizKind = (kind: string) => !EXAM_KINDS.includes(kind) && !GRADED_HOMEWORK_KINDS.includes(kind);

export type Evaluation = {
  id: number;
  course_id: number;
  title: string;
  kind: EvaluationKind;
  date: string;
  room: string;
  coefficient: number;
  grade: number | null;
  grade_max: number;
  notes: string;
};

export type LinkRow = {
  id: number;
  title: string;
  url: string;
  category: string;
  favorite: number;
  course_id: number | null;
  position: number;
};

export type CalendarSource = {
  id: number;
  name: string;
  url: string | null;
  last_sync: string | null;
  last_error: string | null;
};

export type CalEvent = {
  id: number;
  source_id: number;
  uid: string;
  summary: string;
  location: string;
  description: string;
  start: string;
  end: string;
  all_day: number;
  course_id: number | null;
};

/** Une séance à venir d'une matière, proposée dans les formulaires pour choisir une date. */
export type CourseSession = { start: string; end: string; location: string; title: string };

/** Un élément affiché dans l'agenda : séance de cours ou évaluation. */
export type AgendaItem = {
  key: string;
  type: "event" | "evaluation";
  id: number;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  courseId: number | null;
  courseName: string | null;
  color: string | null;
  kind?: string;
};

export const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;
