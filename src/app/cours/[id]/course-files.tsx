"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FolderPlus, LoaderCircle, Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { deleteFile, updateFile } from "@/app/actions";
import { ActionForm, ConfirmButton, Dialog, Field, SubmitRow } from "@/components/ui";
import { fileBadge } from "@/lib/files";
import { ago, fileSize } from "@/lib/format";
import type { FileRow } from "@/lib/types";

const ALL = "__all__";

export function CourseFiles({ courseId, files, color }: { courseId: number; files: FileRow[]; color: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(ALL);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FileRow | null>(null);

  const folders = [...new Set([...files.map((f) => f.folder).filter(Boolean), ...extraFolders])].sort((a, b) => a.localeCompare(b, "fr"));
  const visible = folder === ALL ? files : files.filter((f) => f.folder === folder);

  async function upload(list: FileList | File[]) {
    const items = [...list];
    if (!items.length) return;
    setError(null);
    setUploading(items.length);
    const form = new FormData();
    form.set("course_id", String(courseId));
    form.set("folder", folder === ALL ? "" : folder);
    items.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/files", { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Envoi impossible");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section
      className={`panel relative p-4 sm:p-5 ${dragging ? "ring-2" : ""}`}
      style={dragging ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Fichiers</h2>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
          <button className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading > 0}>
            {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? `Envoi de ${uploading} fichier${uploading > 1 ? "s" : ""}…` : "Importer"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Dossiers">
        {[ALL, ...folders].map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={folder === f}
            onClick={() => setFolder(f)}
            className={`chip h-7 border px-3 ${folder === f ? "border-transparent text-white" : "border-line text-ink-soft hover:border-line-strong"}`}
            style={folder === f ? { background: color } : undefined}
          >
            {f === ALL ? `Tout (${files.length})` : f}
          </button>
        ))}
        <button
          className="chip h-7 border border-dashed border-line-strong px-2.5 text-muted hover:text-ink"
          onClick={() => {
            const name = window.prompt("Nom du dossier (par exemple CM, TD, TP, Annales)")?.trim();
            if (name) {
              setExtraFolders((prev) => [...prev, name]);
              setFolder(name);
            }
          }}
        >
          <FolderPlus size={13} /> Dossier
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {visible.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-line-strong px-6 py-10 text-center hover:bg-sunken"
        >
          <Upload size={22} className="text-muted" />
          <span className="font-semibold">Glisse tes PDF, PPTX ou DOCX ici</span>
          <span className="text-sm text-muted">
            {folder === ALL ? "Ou clique pour les choisir." : `Ils seront rangés dans « ${folder} ».`}
          </span>
        </button>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {visible.map((file) => {
            const badge = fileBadge(file.ext);
            return (
              <li key={file.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sunken">
                <span
                  className="grid h-9 w-11 shrink-0 place-items-center rounded-md text-[0.65rem] font-bold tracking-wide text-white"
                  style={{ background: badge.color }}
                >
                  {badge.label}
                </span>
                <Link href={`/fichiers/${file.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium group-hover:underline">{file.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[folder === ALL ? file.folder : "", fileSize(file.size), `ajouté ${ago(file.created_at)}`].filter(Boolean).join(", ")}
                    {file.preview_status === "pending" && <span className="text-accent">, aperçu en préparation</span>}
                  </span>
                </Link>
                <span className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <a href={`/api/files/${file.id}?download`} className="btn btn-ghost btn-icon btn-sm" aria-label="Télécharger" title="Télécharger">
                    <Download size={15} />
                  </a>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(file)} aria-label="Renommer ou déplacer" title="Renommer ou déplacer">
                    <Pencil size={15} />
                  </button>
                  <ConfirmButton
                    onConfirm={() => deleteFile(file.id)}
                    question={`Supprimer « ${file.name} » ? Le fichier sera effacé du disque.`}
                    label="Supprimer"
                    className="btn btn-ghost btn-danger btn-icon btn-sm"
                  >
                    <Trash2 size={15} />
                  </ConfirmButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog title="Fichier" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) =>
          editing && (
            <ActionForm action={updateFile} onDone={close}>
              {(pending) => (
                <>
                  <input type="hidden" name="id" value={editing.id} />
                  <Field label="Nom">
                    <input name="name" className="input" defaultValue={editing.name} required autoFocus />
                  </Field>
                  <Field label="Dossier" hint="Laisse vide pour ne pas ranger le fichier.">
                    <input name="folder" className="input" list="course-folders" defaultValue={editing.folder} />
                    <datalist id="course-folders">
                      {folders.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </Field>
                  <SubmitRow onCancel={close} pending={pending} />
                </>
              )}
            </ActionForm>
          )
        }
      </Dialog>
    </section>
  );
}
