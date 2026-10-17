"use client";

import { useState } from "react";
import { saveSettings } from "@/app/actions";
import { ActionForm, Field } from "@/components/ui";

export function SettingsForm({ firstName, schoolYear }: { firstName: string; schoolYear: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <ActionForm action={saveSettings} onDone={() => setSaved(true)}>
      {(pending) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" hint="Affiché sur l'accueil.">
              <input name="first_name" className="input" defaultValue={firstName} onChange={() => setSaved(false)} />
            </Field>
            <Field label="Année scolaire">
              <input name="school_year" className="input" defaultValue={schoolYear} placeholder="2026-2027" onChange={() => setSaved(false)} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={pending}>
              Enregistrer
            </button>
            {saved && <span className="text-sm text-ok">Enregistré</span>}
          </div>
        </>
      )}
    </ActionForm>
  );
}
