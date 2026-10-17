"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  House,
  Link2,
  Menu,
  NotebookPen,
  Settings,
  SquareKanban,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { Trimester } from "@/lib/types";

type SidebarCourse = { id: number; name: string; color: string; trimester_id: number };

const NAV = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/kanban", label: "Kanban", icon: SquareKanban },
  { href: "/devoirs", label: "Devoirs", icon: NotebookPen },
  { href: "/controles", label: "Contrôles", icon: ClipboardCheck },
  { href: "/partiels", label: "Partiels", icon: GraduationCap },
  { href: "/liens", label: "Liens", icon: Link2 },
];

export function Sidebar({
  trimesters,
  courses,
  currentTrimesterId,
  schoolYear,
  homeworkDue,
}: {
  trimesters: Trimester[];
  courses: SidebarCourse[];
  currentTrimesterId: number | null;
  schoolYear: string;
  homeworkDue: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/" className="display text-xl font-bold">
          Carnet
        </Link>
        <button className="btn btn-ghost btn-icon" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
          <Menu size={20} />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        // Sur téléphone, le menu se referme dès qu'on suit un lien.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-6">
          <Link href="/" className="group">
            <span className="display block text-[1.7rem] font-bold leading-none">Carnet</span>
            {schoolYear && <span className="mt-1 block text-xs text-muted">Année {schoolYear.replace("-", " – ")}</span>}
          </Link>
          <button className="btn btn-ghost btn-icon btn-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          <ul className="grid gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[0.92rem] font-medium transition-colors ${
                    isActive(href) ? "bg-sunken text-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive(href) ? 2.2 : 1.8} className={isActive(href) ? "text-accent" : ""} />
                  {label}
                  {href === "/devoirs" && homeworkDue > 0 && (
                    <span
                      className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.7rem] font-bold text-accent-ink"
                      title="Devoirs en retard ou à rendre d'ici deux jours"
                    >
                      {homeworkDue}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-center justify-between px-3">
            <Link href="/cours" className={`text-sm font-semibold ${pathname === "/cours" ? "text-accent" : "text-ink"}`}>
              Mes cours
            </Link>
            <Link href="/cours" className="text-xs text-muted hover:text-ink">
              Gérer
            </Link>
          </div>

          <div className="mt-2 grid gap-1">
            {trimesters.map((trimester) => (
              <TrimesterGroup
                key={trimester.id}
                trimester={trimester}
                courses={courses.filter((c) => c.trimester_id === trimester.id)}
                defaultOpen={trimester.id === currentTrimesterId}
                current={trimester.id === currentTrimesterId}
                pathname={pathname}
              />
            ))}
          </div>
        </nav>

        <div className="flex items-center justify-between border-t border-line px-3 py-3">
          <Link
            href="/parametres"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isActive("/parametres") ? "bg-sunken text-ink" : "text-ink-soft hover:bg-sunken"
            }`}
          >
            <Settings size={16} />
            Paramètres
          </Link>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

function TrimesterGroup({
  trimester,
  courses,
  defaultOpen,
  current,
  pathname,
}: {
  trimester: Trimester;
  courses: SidebarCourse[];
  defaultOpen: boolean;
  current: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-[0.8rem] font-semibold text-muted hover:text-ink"
        aria-expanded={open}
      >
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {trimester.name}
        {current && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" title="Trimestre en cours" />}
      </button>
      {open && (
        <ul className="mb-2 mt-0.5 grid gap-px">
          {courses.length === 0 && (
            <li>
              <Link href="/cours" className="block py-1.5 pl-9 pr-3 text-[0.82rem] text-muted hover:text-ink">
                Ajouter une matière
              </Link>
            </li>
          )}
          {courses.map((course) => {
            const active = pathname === `/cours/${course.id}`;
            return (
              <li key={course.id}>
                <Link
                  href={`/cours/${course.id}`}
                  className={`group relative flex items-center rounded-r-md py-1.5 pl-9 pr-3 text-[0.86rem] ${
                    active ? "bg-sunken font-semibold text-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
                  }`}
                >
                  {/* Onglet d'intercalaire à la couleur de la matière */}
                  <span
                    className={`absolute left-4 top-1/2 h-4 -translate-y-1/2 rounded-r-sm transition-all ${active ? "w-2.5" : "w-1.5 group-hover:w-2"}`}
                    style={{ background: course.color }}
                  />
                  <span className="min-w-0 truncate" title={course.name}>
                    {course.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
