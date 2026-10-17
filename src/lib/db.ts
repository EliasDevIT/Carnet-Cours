import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

process.env.TZ ??= "Europe/Paris";

// Dossier lu à l'exécution uniquement : inutile de l'inclure dans le build.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
export const FILES_DIR = path.join(DATA_DIR, "files");
export const PREVIEWS_DIR = path.join(DATA_DIR, "previews");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trimesters (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY,
  trimester_id INTEGER NOT NULL REFERENCES trimesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  teacher TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '',
  coefficient REAL NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  ext TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  folder TEXT NOT NULL DEFAULT '',
  preview_status TEXT NOT NULL DEFAULT 'none',
  preview_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_opened_at TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  kind TEXT NOT NULL DEFAULT 'chapitre',
  due_date TEXT,
  position REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  done_at TEXT
);

CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'controle',
  date TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT '',
  coefficient REAL NOT NULL DEFAULT 1,
  grade REAL,
  grade_max REAL NOT NULL DEFAULT 20,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Général',
  favorite INTEGER NOT NULL DEFAULT 0,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS calendar_sources (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  last_sync TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES calendar_sources(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  summary TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS events_start ON events(start);
CREATE INDEX IF NOT EXISTS tasks_course ON tasks(course_id);
CREATE INDEX IF NOT EXISTS files_course ON files(course_id);
CREATE INDEX IF NOT EXISTS evaluations_date ON evaluations(date);
`;

function schoolYearStart(now = new Date()) {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

function seed(db: DatabaseSync) {
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'seeded'").get();
  if (seeded) return;

  const y = schoolYearStart();
  const insertTrimester = db.prepare(
    "INSERT INTO trimesters (name, start_date, end_date, position) VALUES (?, ?, ?, ?)",
  );
  insertTrimester.run("Trimestre 1", `${y}-09-01`, `${y}-11-30`, 1);
  insertTrimester.run("Trimestre 2", `${y}-12-01`, `${y + 1}-02-28`, 2);
  insertTrimester.run("Trimestre 3", `${y + 1}-03-01`, `${y + 1}-06-30`, 3);

  const insertLink = db.prepare(
    "INSERT INTO links (title, url, category, favorite, position) VALUES (?, ?, ?, 1, ?)",
  );
  insertLink.run("GitHub", "https://github.com", "Outils", 1);
  insertLink.run("Gmail", "https://mail.google.com", "Mail", 2);
  insertLink.run("Google Sheets", "https://docs.google.com/spreadsheets", "Outils", 3);
  insertLink.run("Google Drive", "https://drive.google.com", "Outils", 4);

  db.prepare("INSERT INTO settings (key, value) VALUES ('seeded', '1'), ('school_year', ?)").run(
    `${y}-${y + 1}`,
  );
}

/** Colonnes ajoutées après la première version : appliquées aux bases existantes. */
function migrate(db: DatabaseSync) {
  const hasColumn = (table: string, column: string) =>
    db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column) !== undefined;
  if (!hasColumn("tasks", "file_id")) {
    db.exec("ALTER TABLE tasks ADD COLUMN file_id INTEGER REFERENCES files(id) ON DELETE SET NULL");
  }
}

function open() {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "carnet.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

const globalForDb = globalThis as unknown as { __carnetDb?: DatabaseSync };
export const db = globalForDb.__carnetDb ?? (globalForDb.__carnetDb = open());
// Aussi après un rechargement à chaud, où la connexion est réutilisée.
migrate(db);

// node:sqlite renvoie des objets sans prototype, que React refuse de sérialiser : on les recopie.
export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return db
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row }) as T);
}

export function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  const row = db.prepare(sql).get(...params);
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getSetting(key: string, fallback = "") {
  return get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}
