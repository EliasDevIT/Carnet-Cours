"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FILES_DIR, PREVIEWS_DIR, all, get, run, setSetting, transaction } from "@/lib/db";
import { importIcs, rematchEvents, syncSource, syncStaleSources } from "@/lib/ical";
import type { FileRow, TaskStatus } from "@/lib/types";

const refresh = () => revalidatePath("/", "layout");

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optional = (fd: FormData, key: string) => str(fd, key) || null;
const id = (fd: FormData, key = "id") => {
  const value = Number(fd.get(key));
  return Number.isFinite(value) && value > 0 ? value : null;
};
const decimal = (fd: FormData, key: string, fallback: number) => {
  const raw = str(fd, key).replace(",", ".");
  const value = raw === "" ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
};
/** Valeur d'un champ datetime-local (heure locale) convertie en ISO UTC. */
const isoFromLocal = (fd: FormData, key: string) => {
  const raw = str(fd, key);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

/* ---------- Matières et trimestres ---------- */

export async function saveCourse(fd: FormData) {
  const courseId = id(fd);
  const name = str(fd, "name");
  const trimesterId = id(fd, "trimester_id");
  if (!name || !trimesterId) return;
  const values = [
    trimesterId,
    name,
    str(fd, "short_name"),
    str(fd, "color") || "#2F8FE8",
    str(fd, "teacher"),
    str(fd, "room"),
    str(fd, "keywords"),
    decimal(fd, "coefficient", 1),
    str(fd, "notes"),
  ] as const;

  if (courseId) {
    run(
      `UPDATE courses SET trimester_id = ?, name = ?, short_name = ?, color = ?, teacher = ?, room = ?,
       keywords = ?, coefficient = ?, notes = ? WHERE id = ?`,
      ...values,
      courseId,
    );
  } else {
    const position = get<{ n: number }>("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM courses WHERE trimester_id = ?", trimesterId)!.n;
    run(
      `INSERT INTO courses (trimester_id, name, short_name, color, teacher, room, keywords, coefficient, notes, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values,
      position,
    );
  }
  rematchEvents();
  refresh();
}

export async function deleteCourse(courseId: number) {
  for (const file of all<FileRow>("SELECT * FROM files WHERE course_id = ?", courseId)) removeFileFromDisk(file);
  run("DELETE FROM courses WHERE id = ?", courseId);
  rematchEvents();
  refresh();
  redirect("/cours");
}

/** Copie des matières d'un trimestre vers un autre (sans fichiers ni suivi). */
export async function copyCourses(fromTrimesterId: number, toTrimesterId: number) {
  transaction(() => {
    for (const c of all<{ name: string; short_name: string; color: string; teacher: string; room: string; keywords: string; coefficient: number; position: number }>(
      "SELECT * FROM courses WHERE trimester_id = ?",
      fromTrimesterId,
    )) {
      run(
        `INSERT INTO courses (trimester_id, name, short_name, color, teacher, room, keywords, coefficient, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        toTrimesterId, c.name, c.short_name, c.color, c.teacher, c.room, c.keywords, c.coefficient, c.position,
      );
    }
  });
  rematchEvents();
  refresh();
}

export async function saveTrimester(fd: FormData) {
  const trimesterId = id(fd);
  const start = str(fd, "start_date");
  const end = str(fd, "end_date");
  if (!trimesterId || !start || !end) return;
  run("UPDATE trimesters SET name = ?, start_date = ?, end_date = ? WHERE id = ?", str(fd, "name"), start, end, trimesterId);
  rematchEvents();
  refresh();
}

/* ---------- Kanban ---------- */

export async function saveTask(fd: FormData) {
  const taskId = id(fd);
  const title = str(fd, "title");
  if (!title) return;
  const status = (str(fd, "status") || "todo") as TaskStatus;
  const values = [id(fd, "course_id"), title, str(fd, "description"), str(fd, "kind") || "chapitre", optional(fd, "due_date")] as const;

  if (taskId) {
    const previous = get<{ status: string }>("SELECT status FROM tasks WHERE id = ?", taskId);
    run(
      `UPDATE tasks SET course_id = ?, title = ?, description = ?, kind = ?, due_date = ?, status = ?,
       done_at = CASE WHEN ? = 'done' THEN COALESCE(done_at, ?) ELSE NULL END WHERE id = ?`,
      ...values,
      status,
      status,
      new Date().toISOString(),
      taskId,
    );
    if (previous && previous.status !== status) {
      run("UPDATE tasks SET position = (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE status = ?) WHERE id = ?", status, taskId);
    }
    // Le champ « fichier » n'existe que dans certains formulaires : sans lui, on garde le lien actuel.
    if (fd.has("file_id")) run("UPDATE tasks SET file_id = ? WHERE id = ?", id(fd, "file_id"), taskId);
  } else {
    const position = get<{ n: number }>("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM tasks WHERE status = ?", status)!.n;
    run(
      `INSERT INTO tasks (course_id, title, description, kind, due_date, status, position, done_at, file_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values,
      status,
      position,
      status === "done" ? new Date().toISOString() : null,
      id(fd, "file_id"),
    );
  }
  refresh();
}

export async function deleteTask(taskId: number) {
  run("DELETE FROM tasks WHERE id = ?", taskId);
  refresh();
}

/** Déplace une carte dans une colonne et enregistre l'ordre de la colonne. */
export async function moveTask(taskId: number, status: TaskStatus, orderedIds: number[]) {
  const now = new Date().toISOString();
  transaction(() => {
    run(
      "UPDATE tasks SET status = ?, done_at = CASE WHEN ? = 'done' THEN COALESCE(done_at, ?) ELSE NULL END WHERE id = ?",
      status,
      status,
      now,
      taskId,
    );
    orderedIds.forEach((taskInColumn, index) => run("UPDATE tasks SET position = ? WHERE id = ?", index + 1, taskInColumn));
  });
  refresh();
}

export async function setTaskStatus(taskId: number, status: TaskStatus) {
  const position = get<{ n: number }>("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM tasks WHERE status = ?", status)!.n;
  run(
    "UPDATE tasks SET status = ?, position = ?, done_at = CASE WHEN ? = 'done' THEN ? ELSE NULL END WHERE id = ?",
    status,
    position,
    status,
    new Date().toISOString(),
    taskId,
  );
  refresh();
}

/* ---------- Évaluations ---------- */

export async function saveEvaluation(fd: FormData) {
  const evaluationId = id(fd);
  const courseId = id(fd, "course_id");
  const date = isoFromLocal(fd, "date");
  const title = str(fd, "title");
  if (!courseId || !date || !title) return;
  const gradeRaw = str(fd, "grade");
  const values = [
    courseId,
    title,
    str(fd, "kind") || "controle",
    date,
    str(fd, "room"),
    decimal(fd, "coefficient", 1),
    gradeRaw === "" ? null : decimal(fd, "grade", 0),
    decimal(fd, "grade_max", 20),
    str(fd, "notes"),
  ] as const;

  if (evaluationId) {
    run(
      `UPDATE evaluations SET course_id = ?, title = ?, kind = ?, date = ?, room = ?, coefficient = ?,
       grade = ?, grade_max = ?, notes = ? WHERE id = ?`,
      ...values,
      evaluationId,
    );
  } else {
    run(
      `INSERT INTO evaluations (course_id, title, kind, date, room, coefficient, grade, grade_max, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values,
    );
  }
  refresh();
}

export async function deleteEvaluation(evaluationId: number) {
  run("DELETE FROM evaluations WHERE id = ?", evaluationId);
  refresh();
}

/* ---------- Liens ---------- */

const normalizeUrl = (url: string) => (/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);

export async function saveLink(fd: FormData) {
  const linkId = id(fd);
  const url = str(fd, "url");
  if (!url) return;
  const title = str(fd, "title") || new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  const values = [title, normalizeUrl(url), str(fd, "category") || "Général", fd.get("favorite") ? 1 : 0, id(fd, "course_id")] as const;
  if (linkId) {
    run("UPDATE links SET title = ?, url = ?, category = ?, favorite = ?, course_id = ? WHERE id = ?", ...values, linkId);
  } else {
    const position = get<{ n: number }>("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM links")!.n;
    run("INSERT INTO links (title, url, category, favorite, course_id, position) VALUES (?, ?, ?, ?, ?, ?)", ...values, position);
  }
  refresh();
}

export async function toggleFavoriteLink(linkId: number) {
  run("UPDATE links SET favorite = 1 - favorite WHERE id = ?", linkId);
  refresh();
}

export async function deleteLink(linkId: number) {
  run("DELETE FROM links WHERE id = ?", linkId);
  refresh();
}

/* ---------- Emploi du temps ---------- */

export type FormState = { error?: string; message?: string } | null;

export async function addCalendarSource(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name") || "Emploi du temps";
  const url = str(fd, "url");
  const file = fd.get("file");

  if (file instanceof File && file.size > 0) {
    const body = await file.text();
    if (!body.includes("BEGIN:VCALENDAR")) return { error: "Ce fichier n'est pas un calendrier .ics." };
    const sourceId = Number(run("INSERT INTO calendar_sources (name) VALUES (?)", name).lastInsertRowid);
    const count = importIcs(sourceId, body);
    refresh();
    return { message: `${count} séances importées.` };
  }

  if (!url) return { error: "Colle un lien .ics ou choisis un fichier." };
  const sourceId = Number(run("INSERT INTO calendar_sources (name, url) VALUES (?, ?)", name, url).lastInsertRowid);
  try {
    const count = await syncSource(sourceId);
    refresh();
    return { message: `${count} séances importées.` };
  } catch (error) {
    run("DELETE FROM calendar_sources WHERE id = ?", sourceId);
    return { error: `Import impossible : ${(error as Error).message}` };
  }
}

export async function syncCalendarSource(sourceId: number) {
  try {
    await syncSource(sourceId);
  } finally {
    refresh();
  }
}

export async function deleteCalendarSource(sourceId: number) {
  run("DELETE FROM calendar_sources WHERE id = ?", sourceId);
  refresh();
}

export async function autoSyncCalendars() {
  const synced = await syncStaleSources();
  if (synced) refresh();
  return synced;
}

/** Associe un intitulé de séance à une matière en l'ajoutant à ses mots-clés. */
export async function assignSummary(summary: string, courseId: number) {
  const course = get<{ keywords: string }>("SELECT keywords FROM courses WHERE id = ?", courseId);
  if (!course) return;
  const keywords = [...course.keywords.split(",").map((k) => k.trim()).filter(Boolean), summary.replaceAll(",", " ")];
  run("UPDATE courses SET keywords = ? WHERE id = ?", [...new Set(keywords)].join(", "), courseId);
  rematchEvents();
  refresh();
}

/* ---------- Fichiers ---------- */

function removeFileFromDisk(file: FileRow) {
  fs.rmSync(path.join(FILES_DIR, file.stored_name), { force: true });
  if (file.preview_name) fs.rmSync(path.join(PREVIEWS_DIR, file.preview_name), { force: true });
}

export async function updateFile(fd: FormData) {
  const fileId = id(fd);
  const name = str(fd, "name");
  if (!fileId || !name) return;
  run("UPDATE files SET name = ?, folder = ? WHERE id = ?", name, str(fd, "folder"), fileId);
  refresh();
}

export async function deleteFile(fileId: number, redirectTo?: string) {
  const file = get<FileRow>("SELECT * FROM files WHERE id = ?", fileId);
  if (!file) return;
  removeFileFromDisk(file);
  run("DELETE FROM files WHERE id = ?", fileId);
  refresh();
  if (redirectTo) redirect(redirectTo);
}

/* ---------- Réglages ---------- */

export async function saveSettings(fd: FormData) {
  setSetting("first_name", str(fd, "first_name"));
  setSetting("school_year", str(fd, "school_year"));
  refresh();
}
