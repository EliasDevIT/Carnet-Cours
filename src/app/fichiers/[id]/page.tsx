import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { FileViewer } from "./file-viewer";
import { run } from "@/lib/db";
import { ensurePreview } from "@/lib/convert";
import { viewerKind } from "@/lib/files";
import { fileSize } from "@/lib/format";
import { getFile, getFiles } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getFile(Number((await params).id))?.name ?? "Fichier" };
}

export default async function FilePage({ params }: Props) {
  const file = getFile(Number((await params).id));
  if (!file) notFound();

  ensurePreview(file);
  run("UPDATE files SET last_opened_at = ? WHERE id = ?", new Date().toISOString(), file.id);

  const siblings = file.course_id ? getFiles(file.course_id) : [];
  const index = siblings.findIndex((f) => f.id === file.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const kind = viewerKind(file.ext);
  const openUrl = kind === "office" && file.preview_status === "ready" ? `/api/files/${file.id}?preview` : `/api/files/${file.id}`;

  return (
    <div className="-mx-4 -mb-16 -mt-5 flex h-[calc(100dvh-3.25rem)] flex-col sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:h-dvh">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        {file.course_id ? (
          <Link href={`/cours/${file.course_id}`} className="btn btn-ghost btn-sm -ml-2">
            <ArrowLeft size={16} />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: file.color ?? undefined }} />
            {file.course_name}
          </Link>
        ) : (
          <Link href="/" className="btn btn-ghost btn-sm -ml-2">
            <ArrowLeft size={16} /> Accueil
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{file.name}</h1>
          <p className="text-xs text-muted">
            {file.folder && `${file.folder}, `}
            {fileSize(file.size)}
            {siblings.length > 1 && `, ${index + 1} sur ${siblings.length}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {prev && (
            <Link href={`/fichiers/${prev.id}`} className="btn btn-ghost btn-icon btn-sm" title={`Précédent : ${prev.name}`} aria-label="Fichier précédent">
              <ChevronLeft size={18} />
            </Link>
          )}
          {next && (
            <Link href={`/fichiers/${next.id}`} className="btn btn-ghost btn-icon btn-sm" title={`Suivant : ${next.name}`} aria-label="Fichier suivant">
              <ChevronRight size={18} />
            </Link>
          )}
          <a href={openUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Ouvrir dans un onglet" aria-label="Ouvrir dans un onglet">
            <ExternalLink size={16} />
          </a>
          <a href={`/api/files/${file.id}?download`} className="btn btn-sm">
            <Download size={15} /> Télécharger
          </a>
        </div>
      </header>
      <div className="min-h-0 flex-1 bg-sunken">
        <FileViewer id={file.id} name={file.name} ext={file.ext} kind={kind} previewStatus={file.preview_status} />
      </div>
    </div>
  );
}
