import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { DATA_DIR, FILES_DIR, PREVIEWS_DIR, get, run } from "./db";
import type { FileRow } from "./types";

const execFileAsync = promisify(execFile);

/** Formats bureautiques convertis en PDF par LibreOffice pour être affichés dans l'app. */
export const CONVERTIBLE = new Set(["ppt", "pptx", "pps", "ppsx", "odp", "doc", "docx", "odt", "rtf", "xls", "xlsx", "ods"]);

const SOFFICE_CANDIDATES = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/soffice",
  "/usr/bin/libreoffice",
  "/usr/local/bin/soffice",
  "/opt/libreoffice/program/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
];

export function findSoffice(): string | null {
  if (process.env.SOFFICE_PATH && fs.existsSync(process.env.SOFFICE_PATH)) return process.env.SOFFICE_PATH;
  return SOFFICE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? null;
}

// LibreOffice ne supporte pas deux conversions simultanées sur le même profil : on les enchaîne.
const globalForQueue = globalThis as unknown as { __carnetQueue?: Promise<void>; __carnetQueued?: Set<number> };
globalForQueue.__carnetQueue ??= Promise.resolve();
globalForQueue.__carnetQueued ??= new Set();
const queued = globalForQueue.__carnetQueued;

async function convert(fileId: number) {
  const file = get<FileRow>("SELECT * FROM files WHERE id = ?", fileId);
  if (!file) return;
  const soffice = findSoffice();
  if (!soffice) {
    run("UPDATE files SET preview_status = 'failed' WHERE id = ?", fileId);
    return;
  }
  const input = path.join(FILES_DIR, file.stored_name);
  const profile = pathToFileURL(path.join(DATA_DIR, ".libreoffice")).href;
  try {
    await execFileAsync(
      soffice,
      ["--headless", "--norestore", `-env:UserInstallation=${profile}`, "--convert-to", "pdf", "--outdir", PREVIEWS_DIR, input],
      { timeout: 180_000, windowsHide: true },
    );
    const previewName = `${path.parse(file.stored_name).name}.pdf`;
    if (!fs.existsSync(path.join(PREVIEWS_DIR, previewName))) throw new Error("PDF absent après conversion");
    run("UPDATE files SET preview_status = 'ready', preview_name = ? WHERE id = ?", previewName, fileId);
  } catch (error) {
    console.error(`Conversion impossible pour ${file.name}:`, error);
    run("UPDATE files SET preview_status = 'failed' WHERE id = ?", fileId);
  }
}

export function queuePreview(fileId: number) {
  if (queued.has(fileId)) return;
  queued.add(fileId);
  globalForQueue.__carnetQueue = globalForQueue.__carnetQueue!.then(() => convert(fileId)).finally(() => queued.delete(fileId));
}

/** Relance une conversion restée en attente (par exemple après un redémarrage du serveur). */
export function ensurePreview(file: Pick<FileRow, "id" | "preview_status">) {
  if (file.preview_status === "pending") queuePreview(file.id);
}
