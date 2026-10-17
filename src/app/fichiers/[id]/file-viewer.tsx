"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ViewerKind } from "@/lib/files";
import type { FileRow } from "@/lib/types";

export function FileViewer({
  id,
  name,
  ext,
  kind,
  previewStatus,
}: {
  id: number;
  name: string;
  ext: string;
  kind: ViewerKind;
  previewStatus: FileRow["preview_status"];
}) {
  const src = `/api/files/${id}`;

  if (kind === "pdf") return <iframe src={src} title={name} className="h-full w-full border-0" />;
  if (kind === "office") {
    if (previewStatus === "ready") return <iframe src={`${src}?preview`} title={name} className="h-full w-full border-0" />;
    if (previewStatus === "pending") return <PendingPreview id={id} />;
    if (ext === "docx") return <DocxPreview src={src} />;
    return (
      <Message title="Aperçu indisponible">
        LibreOffice n&apos;a pas pu convertir ce fichier. Vérifie qu&apos;il est installé, ou télécharge le fichier pour l&apos;ouvrir.
      </Message>
    );
  }
  if (kind === "image")
    return (
      <div className="grid h-full place-items-center overflow-auto p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="max-h-full max-w-full rounded-lg shadow-sm" />
      </div>
    );
  if (kind === "video")
    return (
      <div className="grid h-full place-items-center p-6">
        <video src={src} controls className="max-h-full max-w-full rounded-lg" />
      </div>
    );
  if (kind === "audio")
    return (
      <div className="grid h-full place-items-center p-6">
        <audio src={src} controls />
      </div>
    );
  if (kind === "text") return <TextPreview src={src} />;
  return <Message title="Pas d'aperçu pour ce type de fichier">Télécharge-le pour l&apos;ouvrir avec l&apos;application adaptée.</Message>;
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}

/** Attend la fin de la conversion LibreOffice puis recharge la page. */
function PendingPreview({ id }: { id: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/api/files/${id}?status`, { cache: "no-store" }).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (data?.status && data.status !== "pending") {
        clearInterval(timer);
        router.refresh();
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [id, router]);

  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="grid justify-items-center gap-3">
        <LoaderCircle className="animate-spin text-accent" size={28} />
        <p className="font-semibold">Préparation de l&apos;aperçu</p>
        <p className="max-w-xs text-sm text-muted">Le fichier est converti en PDF une seule fois. Les prochaines ouvertures seront instantanées.</p>
      </div>
    </div>
  );
}

function DocxPreview({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ renderAsync }, blob] = await Promise.all([import("docx-preview"), fetch(src).then((r) => r.blob())]);
        if (!cancelled && ref.current) await renderAsync(blob, ref.current, undefined, { inWrapper: true });
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);
  if (error) return <Message title="Aperçu indisponible">Télécharge le fichier pour l&apos;ouvrir dans Word.</Message>;
  return <div ref={ref} className="h-full overflow-auto bg-white" />;
}

function TextPreview({ src }: { src: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("Lecture impossible."));
  }, [src]);
  return (
    <pre className="h-full overflow-auto whitespace-pre-wrap p-6 text-sm leading-relaxed" style={{ fontFamily: "ui-monospace, Consolas, monospace" }}>
      {text ?? "Chargement…"}
    </pre>
  );
}
