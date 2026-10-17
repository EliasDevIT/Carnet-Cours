import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/page-header";
import { DATA_DIR, getSetting } from "@/lib/db";
import { findSoffice } from "@/lib/convert";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  const soffice = findSoffice();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Paramètres" />
      <div className="grid gap-5">
        <section className="panel p-5">
          <h2 className="panel-title mb-4">Profil</h2>
          <SettingsForm firstName={getSetting("first_name")} schoolYear={getSetting("school_year")} />
        </section>

        <section className="panel p-5">
          <h2 className="panel-title mb-1">Trimestres</h2>
          <p className="text-sm text-muted">
            Les dates de chaque trimestre se modifient depuis <Link href="/cours" className="text-accent underline">Mes cours</Link>. Elles servent à
            rattacher les séances de l&apos;emploi du temps à la bonne matière.
          </p>
        </section>

        <section className="panel p-5">
          <h2 className="panel-title mb-3">Aperçu des PowerPoint et Word</h2>
          {soffice ? (
            <p className="text-sm">
              <span className="font-semibold text-ok">LibreOffice est installé.</span>{" "}
              <span className="text-muted">Les PPTX, DOCX et XLSX sont convertis en PDF à l&apos;import pour s&apos;afficher dans l&apos;app.</span>
            </p>
          ) : (
            <p className="text-sm">
              <span className="font-semibold text-danger">LibreOffice est introuvable.</span>{" "}
              <span className="text-muted">
                Installe-le depuis libreoffice.org pour afficher les PPTX dans l&apos;app. Les DOCX restent lisibles sans lui.
              </span>
            </p>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="panel-title mb-3">Données</h2>
          <p className="text-sm text-muted">Toutes tes données (base et fichiers importés) sont dans ce dossier. Sauvegarde-le pour tout garder.</p>
          <code className="mt-2 block break-all rounded-lg bg-sunken px-3 py-2 text-sm">{DATA_DIR}</code>
        </section>
      </div>
    </div>
  );
}
