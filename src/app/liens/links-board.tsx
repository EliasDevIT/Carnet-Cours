"use client";

import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteLink, toggleFavoriteLink } from "@/app/actions";
import { LinkForm } from "@/components/link-form";
import { LinkIcon, hostOf } from "@/components/link-icon";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ConfirmButton, Dialog, type CourseOption } from "@/components/ui";
import { normalize } from "@/lib/format";
import type { LinkRow } from "@/lib/types";

type Link = LinkRow & { course_name: string | null; color: string | null };

export function LinksBoard({ links, courses }: { links: Link[]; courses: CourseOption[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Link | null>(null);

  const categories = useMemo(() => [...new Set(links.map((l) => l.category))], [links]);
  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return links;
    return links.filter((l) => normalize(`${l.title} ${l.url} ${l.category} ${l.course_name ?? ""}`).includes(q));
  }, [links, query]);
  const groups = Map.groupBy(filtered, (l) => l.category);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Liens"
        subtitle="Tes outils, ta messagerie, tes espaces de cours : tout s'ouvre d'ici."
        actions={
          <Dialog
            title="Nouveau lien"
            trigger={(open) => (
              <button className="btn btn-primary" onClick={open}>
                <Plus size={16} /> Ajouter un lien
              </button>
            )}
          >
            {(close) => <LinkForm courses={courses} categories={categories} onDone={close} />}
          </Dialog>
        }
      />

      <div className="relative mb-8 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Rechercher un lien"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un lien"
        />
      </div>

      {links.length === 0 && <EmptyState title="Aucun lien pour l'instant">Ajoute ton GitHub, ta boîte mail ou l&apos;ENT de ton école.</EmptyState>}
      {links.length > 0 && filtered.length === 0 && <p className="text-muted">Aucun lien ne correspond à « {query} ».</p>}

      <div className="grid gap-9">
        {[...groups].map(([category, list]) => (
          <section key={category}>
            <h2 className="panel-title mb-3 flex items-baseline gap-2">
              {category}
              <span className="text-sm font-normal text-muted">{list.length}</span>
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((link) => (
                <li key={link.id} className="group relative flex items-center gap-3 rounded-xl border border-line bg-surface p-3 pr-2 hover:border-line-strong">
                  <a href={link.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0">
                    <LinkIcon url={link.url} title={link.title} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{link.title}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                        {link.course_name && (
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: link.color ?? undefined }} />
                        )}
                        {link.course_name ?? hostOf(link.url)}
                      </span>
                    </span>
                  </a>
                  <div className="relative z-10 flex shrink-0 items-center">
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => toggleFavoriteLink(link.id)}
                      aria-label={link.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      title={link.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <Star size={15} className={link.favorite ? "fill-[#E3A800] text-[#E3A800]" : ""} />
                    </button>
                    <span className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(link)} aria-label="Modifier" title="Modifier">
                        <Pencil size={15} />
                      </button>
                      <ConfirmButton onConfirm={() => deleteLink(link.id)} question={`Supprimer le lien « ${link.title} » ?`} label="Supprimer" className="btn btn-ghost btn-danger btn-icon btn-sm">
                        <Trash2 size={15} />
                      </ConfirmButton>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog title="Modifier le lien" open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {(close) => editing && <LinkForm link={editing} courses={courses} categories={categories} onDone={close} />}
      </Dialog>
    </div>
  );
}
