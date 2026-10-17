const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/plain; charset=utf-8",
  json: "application/json",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export const mimeFor = (ext: string) => MIME_TYPES[ext] ?? "application/octet-stream";

export type ViewerKind = "pdf" | "office" | "image" | "video" | "audio" | "text" | "other";

const TEXT_EXTS = new Set(["txt", "md", "csv", "json", "py", "js", "ts", "tsx", "java", "c", "cpp", "h", "sql", "html", "css", "xml", "yml", "yaml", "sh"]);

export function viewerKind(ext: string): ViewerKind {
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "pps", "ppsx", "odp", "doc", "docx", "odt", "rtf", "xls", "xlsx", "ods"].includes(ext)) return "office";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (TEXT_EXTS.has(ext)) return "text";
  return "other";
}

/** Libellé court et couleur d'étiquette par famille de fichier. */
export function fileBadge(ext: string): { label: string; color: string } {
  if (ext === "pdf") return { label: "PDF", color: "#D9423A" };
  if (["ppt", "pptx", "pps", "ppsx", "odp"].includes(ext)) return { label: "PPT", color: "#E0742A" };
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return { label: "DOC", color: "#2F6FE0" };
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return { label: "XLS", color: "#21985D" };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return { label: "IMG", color: "#8B5CF6" };
  if (["mp4", "webm", "mp3", "wav", "ogg", "m4a"].includes(ext)) return { label: "MÉDIA", color: "#12A3A3" };
  return { label: ext.slice(0, 4).toUpperCase() || "FIC", color: "#5C6B85" };
}
