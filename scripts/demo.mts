/**
 * Lance Carnet avec des données d'exemple, dans un dossier séparé (.demo-data) :
 * tes vraies données (dossier data/) ne sont jamais touchées.
 *
 *   npm run demo
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEMO_DIR = path.resolve(".demo-data");
fs.rmSync(DEMO_DIR, { recursive: true, force: true });
process.env.DATA_DIR = DEMO_DIR;

const { run, setSetting, get } = await import("../src/lib/db");
const { importIcs } = await import("../src/lib/ical");

const pad = (n: number) => String(n).padStart(2, "0");
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (offset: number, hour: number, minute = 0) => {
  const d = day(offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

setSetting("first_name", "Camille");

const today = isoDate(new Date());
const trimester = get<{ id: number }>("SELECT id FROM trimesters WHERE start_date <= ? AND end_date >= ?", today, today)
  ?? get<{ id: number }>("SELECT id FROM trimesters ORDER BY position LIMIT 1")!;

const courses = [
  { name: "Algèbre linéaire", short: "ALG", color: "#2F8FE8", teacher: "Mme Durand", room: "B204", coef: 3 },
  { name: "Physique", short: "PHY", color: "#F07A1A", teacher: "M. Laurent", room: "Amphi A", coef: 2 },
  { name: "Programmation", short: "INFO", color: "#8B5CF6", teacher: "M. Petit", room: "Salle TP 3", coef: 3 },
  { name: "Anglais", short: "ANG", color: "#2BA86C", teacher: "Ms Carter", room: "C112", coef: 1 },
  { name: "Économie", short: "ECO", color: "#E0508A", teacher: "Mme Roux", room: "Amphi B", coef: 1.5 },
  { name: "Projet tutoré", short: "PT", color: "#12A3A3", teacher: "M. Garnier", room: "Fablab", coef: 2 },
];
const ids: Record<string, number> = {};
courses.forEach((c, i) => {
  ids[c.short] = Number(
    run(
      `INSERT INTO courses (trimester_id, name, short_name, color, teacher, room, coefficient, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      trimester.id, c.name, c.short, c.color, c.teacher, c.room, c.coef, i + 1,
    ).lastInsertRowid,
  );
});

// Emploi du temps hebdomadaire (RRULE), comme un export d'ENT.
const monday = day(-((new Date().getDay() + 6) % 7) - 14);
const stamp = (offsetDays: number, hour: number, minute = 0) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`;
};
const slots: [number, number, number, number, number, string, string][] = [
  [0, 8, 30, 10, 30, "CM Algèbre linéaire", "B204"],
  [0, 10, 45, 12, 15, "TD Physique - Groupe 2", "C010"],
  [0, 14, 0, 17, 0, "TP Programmation", "Salle TP 3"],
  [1, 9, 0, 10, 30, "Anglais", "C112"],
  [1, 10, 45, 12, 45, "CM Économie générale", "Amphi B"],
  [1, 14, 0, 16, 0, "TD Algèbre linéaire", "B204"],
  [2, 8, 30, 10, 30, "CM Physique", "Amphi A"],
  [2, 10, 45, 12, 15, "Projet tutoré", "Fablab"],
  [3, 8, 0, 10, 0, "CM Programmation", "Amphi A"],
  [3, 10, 15, 12, 15, "TD Algèbre linéaire", "B204"],
  [3, 13, 30, 15, 30, "Projet tutoré", "Fablab"],
  [3, 15, 45, 17, 15, "Sport", "Gymnase"],
  [4, 9, 0, 11, 0, "TP Physique", "Labo 2"],
  [4, 11, 15, 12, 45, "Anglais", "C112"],
  [4, 14, 0, 16, 0, "TD Économie", "C204"],
];
const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Carnet//Demo//FR",
  ...slots.flatMap(([d, h1, m1, h2, m2, summary, location], i) => [
    "BEGIN:VEVENT",
    `UID:demo-${i}@carnet`,
    `DTSTART;TZID=Europe/Paris:${stamp(d, h1, m1)}`,
    `DTEND;TZID=Europe/Paris:${stamp(d, h2, m2)}`,
    "RRULE:FREQ=WEEKLY;COUNT=20",
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    "END:VEVENT",
  ]),
  "END:VCALENDAR",
].join("\r\n");
const sourceId = Number(run("INSERT INTO calendar_sources (name) VALUES ('Emploi du temps (démo)')").lastInsertRowid);
importIcs(sourceId, ics);

const tasks: [string, string, string, string, number | null][] = [
  ["ALG", "Chapitre 3 : espaces vectoriels", "doing", "chapitre", null],
  ["ALG", "Feuille de TD 4", "todo", "devoir", 2],
  ["ALG", "Chapitre 1 : matrices", "done", "chapitre", null],
  ["ALG", "Chapitre 2 : déterminants", "review", "chapitre", null],
  ["PHY", "Compte rendu TP optique", "todo", "devoir", -1],
  ["PHY", "Mécanique du point", "done", "chapitre", null],
  ["INFO", "Projet Python : jeu de la vie", "doing", "projet", 6],
  ["INFO", "Récursivité", "review", "chapitre", null],
  ["ANG", "Oral : présentation de 5 min", "todo", "devoir", 4],
  ["ECO", "Fiche chapitre offre et demande", "todo", "revision", null],
  ["PT", "Maquette Figma", "doing", "projet", 9],
  ["PT", "Cahier des charges", "done", "projet", null],
];
tasks.forEach(([course, title, status, kind, due], i) => {
  run(
    "INSERT INTO tasks (course_id, title, status, kind, due_date, position, done_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ids[course], title, status, kind, due === null ? null : isoDate(day(due)), i + 1, status === "done" ? new Date().toISOString() : null,
  );
});

const evaluations: [string, string, string, string, number, number | null][] = [
  ["PHY", "Contrôle de mécanique", "controle", at(2, 10, 45), 1, null],
  ["ALG", "Partiel de mi-trimestre", "partiel", at(6, 8, 30), 2, null],
  ["ANG", "Oral de présentation", "oral", at(4, 11, 15), 1, null],
  ["INFO", "Rendu projet Python", "rendu", at(13, 23, 59), 2, null],
  ["ALG", "Interrogation matrices", "controle", at(-12, 8, 30), 1, 14.5],
  ["PHY", "QCM optique", "controle", at(-9, 9, 0), 0.5, 12],
  ["INFO", "TP noté boucles", "tp", at(-5, 14, 0), 1, 17],
  ["ECO", "Contrôle chapitre 1", "controle", at(-3, 14, 0), 1, 11.5],
];
for (const [course, title, kind, date, coefficient, grade] of evaluations) {
  run(
    "INSERT INTO evaluations (course_id, title, kind, date, coefficient, grade) VALUES (?, ?, ?, ?, ?, ?)",
    ids[course], title, kind, date, coefficient, grade,
  );
}

run("INSERT INTO links (title, url, category, course_id, position) VALUES ('Moodle Algèbre', 'https://moodle.org', 'Cours', ?, 10)", ids.ALG);
run("INSERT INTO links (title, url, category, favorite, position) VALUES ('ENT', 'https://www.education.gouv.fr', 'École', 1, 11)");

console.log(`Données de démo créées dans ${DEMO_DIR}.`);
// --no-start : prépare seulement les données (par exemple pour faire des captures avec un autre serveur).
if (!process.argv.includes("--no-start")) {
  console.log("Lancement de l'app…");
  spawn("npx next dev", { stdio: "inherit", shell: true, env: { ...process.env, DATA_DIR: DEMO_DIR } });
}
