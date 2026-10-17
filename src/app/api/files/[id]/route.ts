import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { FILES_DIR, PREVIEWS_DIR, get } from "@/lib/db";
import { mimeFor } from "@/lib/files";
import type { FileRow } from "@/lib/types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = get<FileRow>("SELECT * FROM files WHERE id = ?", Number(id));
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  const search = new URL(request.url).searchParams;
  if (search.has("status")) return Response.json({ status: file.preview_status });

  const usePreview = search.has("preview") && file.preview_name;
  const filePath = usePreview ? path.join(PREVIEWS_DIR, file.preview_name!) : path.join(FILES_DIR, file.stored_name);
  if (!fs.existsSync(filePath)) return new Response("Fichier absent du disque", { status: 404 });

  const downloadName = usePreview ? `${path.parse(file.name).name}.pdf` : file.name;
  const disposition = search.has("download") ? "attachment" : "inline";
  const stat = fs.statSync(filePath);
  const isPdf = usePreview || file.ext === "pdf";

  return new Response(Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : mimeFor(file.ext),
      "Content-Length": String(stat.size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      // Un fichier importé (SVG, HTML…) ne doit jamais exécuter de script dans l'app.
      ...(isPdf ? {} : { "Content-Security-Policy": "sandbox" }),
    },
  });
}
