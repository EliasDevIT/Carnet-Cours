import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FILES_DIR, run } from "@/lib/db";
import { CONVERTIBLE, queuePreview } from "@/lib/convert";
import { mimeFor } from "@/lib/files";

export async function POST(request: Request) {
  const form = await request.formData();
  const courseId = Number(form.get("course_id")) || null;
  const folder = String(form.get("folder") ?? "").trim();
  const uploads = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!uploads.length) return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });

  const ids: number[] = [];
  for (const upload of uploads) {
    const ext = path.extname(upload.name).slice(1).toLowerCase();
    const storedName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
    await fs.writeFile(path.join(FILES_DIR, storedName), Buffer.from(await upload.arrayBuffer()));
    const convertible = CONVERTIBLE.has(ext);
    const result = run(
      `INSERT INTO files (course_id, name, stored_name, ext, mime, size, folder, preview_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      courseId,
      upload.name,
      storedName,
      ext,
      upload.type || mimeFor(ext),
      upload.size,
      folder,
      convertible ? "pending" : "none",
    );
    const fileId = Number(result.lastInsertRowid);
    ids.push(fileId);
    if (convertible) queuePreview(fileId);
  }

  revalidatePath("/", "layout");
  return Response.json({ ids });
}
